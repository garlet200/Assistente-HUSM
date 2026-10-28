/**
 * @file sessionRepository.ts
 * @description Camada de acesso a dados (Supabase Repository), cliente HTTP do AI Gateway (/api/gateway)
 * e mapeadores de histórico para as tabelas `chats` e `messages`, compartilhada entre useChatSession e useStudySession.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Interaction } from '@/components/chat/ChatInteractionCard';
import { SessionSummaryItem } from '@/components/common/SessionHistoryList';
import { StudyMessage } from '@/components/study/StudySimulationCard';
import { ModelTier, ReliabilityLevel } from '@/lib/ai/cascadeConfig';
import { AIRequest, AIRequestHistoryMessage, AIResponse } from '@/lib/ai/types';
import {
  CHAT_TITLE_MAX_PREVIEW_LENGTH,
  STUDY_ERROR_MESSAGE_ID_PREFIX,
} from '@/lib/constants/session';

export type SessionModuleType = 'chat' | 'study';

export interface DatabaseMessageRow {
  id: string;
  role: 'user' | 'model';
  content: string;
  created_at: string;
  citations?: string[];
  metadata?: {
    isMCQ?: boolean;
    options?: string[];
    answered?: boolean;
    reliability?: ReliabilityLevel;
    modelTier?: ModelTier;
    modelId?: string;
    displayName?: string;
  } | null;
}

/** Sends a typed AIRequest payload to the unified /api/gateway serverless endpoint. */
export async function postRequestToAiGateway(requestPayload: AIRequest): Promise<AIResponse> {
  const gatewayHttpResponse = await fetch('/api/gateway', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestPayload),
  });

  if (!gatewayHttpResponse.ok) {
    throw new Error(`Falha no Gateway: HTTP status ${gatewayHttpResponse.status}`);
  }

  return (await gatewayHttpResponse.json()) as AIResponse;
}

/** Fetches chronological session summaries for a specific user and module ('chat' or 'study'). */
export async function fetchUserSessionsByModule(
  supabase: SupabaseClient,
  userId: string,
  moduleType: SessionModuleType
): Promise<SessionSummaryItem[]> {
  const { data: sessionRecords, error: fetchError } = await supabase
    .from('chats')
    .select('id, title, updated_at')
    .eq('user_id', userId)
    .eq('module', moduleType)
    .order('updated_at', { ascending: false });

  if (fetchError) {
    console.error(`Erro ao carregar histórico do módulo "${moduleType}":`, fetchError);
    return [];
  }

  return sessionRecords || [];
}

/** Loads the session title and ordered messages for an existing chat or study session. */
export async function fetchSessionTitleAndMessages(
  supabase: SupabaseClient,
  sessionId: string
): Promise<{ title: string | null; messages: DatabaseMessageRow[] | null }> {
  const { data: chatRecord, error: chatTitleError } = await supabase
    .from('chats')
    .select('title')
    .eq('id', sessionId)
    .single();

  if (chatTitleError) {
    console.error('Erro ao carregar título da sessão no Supabase:', chatTitleError);
  }

  const { data: databaseMessages, error: queryError } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', sessionId)
    .order('created_at', { ascending: true });

  if (queryError) {
    console.error('Erro ao carregar histórico de mensagens no Supabase:', queryError);
    return { title: chatRecord?.title || null, messages: null };
  }

  return {
    title: chatRecord?.title || null,
    messages: (databaseMessages as DatabaseMessageRow[]) || [],
  };
}

/** Inserts a new message ('user' or 'model') into the Supabase `messages` table. */
export async function insertSessionMessageRecord(
  supabase: SupabaseClient,
  params: {
    sessionId: string;
    role: 'user' | 'model';
    content: string;
    citations?: string[];
    metadata?: Record<string, unknown>;
  }
): Promise<DatabaseMessageRow | null> {
  if (params.sessionId === 'new') return null;

  const { data: persistedMessage, error: insertError } = await supabase
    .from('messages')
    .insert({
      chat_id: params.sessionId,
      role: params.role,
      content: params.content,
      citations: params.citations,
      metadata: params.metadata,
    })
    .select()
    .single();

  if (insertError) {
    console.error(`Erro ao salvar mensagem (${params.role}) no Supabase:`, insertError);
    return null;
  }

  return persistedMessage as DatabaseMessageRow;
}

/** Updates the `metadata` JSON column of a specific message in Supabase (e.g. marking an MCQ as answered). */
export async function updateMessageMetadataInDatabase(
  supabase: SupabaseClient,
  sessionId: string,
  messageId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  if (sessionId === 'new') return;

  const { error: metadataUpdateError } = await supabase
    .from('messages')
    .update({ metadata })
    .eq('id', messageId);

  if (metadataUpdateError) {
    console.error('Erro ao atualizar metadados da mensagem no Supabase:', metadataUpdateError);
  }
}

/** Updates the title of an existing chat/study session in Supabase. */
export async function updateSessionTitleInDatabase(
  supabase: SupabaseClient,
  sessionId: string,
  newTitle: string
): Promise<void> {
  if (sessionId === 'new') return;

  const { error: updateError } = await supabase
    .from('chats')
    .update({ title: newTitle })
    .eq('id', sessionId);

  if (updateError) {
    console.error('Erro ao atualizar título da sessão no Supabase:', updateError);
  }
}

/** Updates `updated_at` timestamp of a chat session after a new AI response is persisted. */
export async function touchSessionUpdatedAtInDatabase(
  supabase: SupabaseClient,
  sessionId: string
): Promise<void> {
  if (sessionId === 'new') return;

  const { error: timestampError } = await supabase
    .from('chats')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (timestampError) {
    console.error('Erro ao atualizar timestamp da sessão no Supabase:', timestampError);
  }
}

/** Deletes a message record in the background during retry cleanup. */
export function deleteMessageByIdSilently(
  supabase: SupabaseClient,
  messageId: string | undefined,
  logContext: string
): void {
  if (!messageId || messageId.startsWith(STUDY_ERROR_MESSAGE_ID_PREFIX)) return;

  void (async () => {
    try {
      const { error: deletionError } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (deletionError) {
        console.error(`Erro ao remover mensagem (${logContext}):`, deletionError);
      }
    } catch (unexpectedDeletionError) {
      console.error(`Exceção ao remover mensagem (${logContext}):`, unexpectedDeletionError);
    }
  })();
}

/** Truncates the initial user prompt to generate an automatic clinical session title. */
export function buildChatPreviewTitle(promptText: string): string {
  if (promptText.length <= CHAT_TITLE_MAX_PREVIEW_LENGTH) {
    return promptText;
  }
  return `${promptText.substring(0, CHAT_TITLE_MAX_PREVIEW_LENGTH)}...`;
}

/** Groups linear user/model messages from the database into question-and-answer Interaction pairs for the UI. */
export function groupMessagesIntoInteractions(rawMessages: DatabaseMessageRow[]): Interaction[] {
  const groupedInteractions: Interaction[] = [];
  let currentInteractionGroup: Partial<Interaction> | null = null;

  for (const messageRecord of rawMessages) {
    if (messageRecord.role === 'user') {
      if (currentInteractionGroup) {
        groupedInteractions.push(currentInteractionGroup as Interaction);
      }
      currentInteractionGroup = {
        id: messageRecord.id,
        userMessageId: messageRecord.id,
        prompt: messageRecord.content,
        response: null,
        timestamp: new Date(messageRecord.created_at),
        citations: [],
      };
      continue;
    }

    if (messageRecord.role === 'model' && currentInteractionGroup) {
      currentInteractionGroup.response = messageRecord.content;
      currentInteractionGroup.citations = messageRecord.citations || [];
      currentInteractionGroup.modelMessageId = messageRecord.id;
      currentInteractionGroup.reliability = messageRecord.metadata?.reliability;
      currentInteractionGroup.modelTier = messageRecord.metadata?.modelTier;
      currentInteractionGroup.modelDisplayName = messageRecord.metadata?.displayName;
    }
  }

  if (currentInteractionGroup) {
    groupedInteractions.push(currentInteractionGroup as Interaction);
  }

  return groupedInteractions;
}

/** Builds standard conversation history for LLM context from existing UI interactions. */
export function buildConversationHistory(interactions: Interaction[]): AIRequestHistoryMessage[] {
  return interactions.flatMap((interaction): AIRequestHistoryMessage[] => [
    { role: 'user', content: interaction.prompt },
    ...(interaction.response ? [{ role: 'model' as const, content: interaction.response }] : []),
  ]);
}

/** Builds linear message history including MCQ choices for study simulator continuity. */
export function buildStudyConversationHistory(
  messagesList: StudyMessage[]
): AIRequestHistoryMessage[] {
  return messagesList.map((studyMessage): AIRequestHistoryMessage => {
    const formattedContent = studyMessage.isMCQ
      ? `${studyMessage.content}\nOpções: ${studyMessage.options?.join(' | ')}`
      : studyMessage.content;

    return { role: studyMessage.role, content: formattedContent };
  });
}

/** Maps a raw database message row into a typed StudyMessage object. */
export function mapDatabaseRowToStudyMessage(messageRecord: DatabaseMessageRow): StudyMessage {
  return {
    id: messageRecord.id,
    role: messageRecord.role === 'model' ? 'model' : 'user',
    content: messageRecord.content,
    isMCQ: messageRecord.metadata?.isMCQ,
    options: messageRecord.metadata?.options,
    answered: messageRecord.metadata?.answered,
    reliability: messageRecord.metadata?.reliability,
    modelTier: messageRecord.metadata?.modelTier,
  };
}
