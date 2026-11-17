/**
 * @file sessionRepository.ts
 * @description Camada de acesso a dados (Supabase Repository) e cliente HTTP do AI Gateway (/api/gateway)
 * para as tabelas `chats` e `messages`, compartilhada entre useChatSession, useStudySession e hubs de histórico.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { SessionSummaryItem } from '@/components/common/SessionHistoryList';
import { AIRequest, AIResponse } from '@/lib/ai/types';
import { STUDY_ERROR_MESSAGE_ID_PREFIX } from '@/lib/constants/session';
import { ExportableCardItem } from '@/lib/utils/exporters';
import {
  DatabaseMessageRow,
  mapDatabaseMessagesToExportCards,
} from './sessionMappers';

export * from './sessionMappers';

export type SessionModuleType = 'chat' | 'study';

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

/** Fetches all messages of a session and maps them into ExportableCardItem[] for full PDF export. */
export async function fetchSessionExportCards(
  supabase: SupabaseClient,
  sessionId: string,
  fallbackHeading: string
): Promise<ExportableCardItem[]> {
  const { title, messages } = await fetchSessionTitleAndMessages(supabase, sessionId);
  if (!messages || messages.length === 0) {
    return [];
  }
  return mapDatabaseMessagesToExportCards(messages, title || fallbackHeading);
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

/** Updates the `metadata` JSON column of a specific message in Supabase. */
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

/** Deletes all messages of a session and the session record itself from the `chats` table. */
export async function deleteSessionFromDatabase(
  supabase: SupabaseClient,
  sessionId: string
): Promise<boolean> {
  if (!sessionId || sessionId === 'new') return true;

  const { error: messagesDeleteError } = await supabase
    .from('messages')
    .delete()
    .eq('chat_id', sessionId);

  if (messagesDeleteError) {
    console.error('Erro ao excluir mensagens da sessão no Supabase:', messagesDeleteError);
  }

  const { error: chatDeleteError } = await supabase
    .from('chats')
    .delete()
    .eq('id', sessionId);

  if (chatDeleteError) {
    console.error('Erro ao excluir sessão na tabela chats:', chatDeleteError);
    return false;
  }
  return true;
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
      const { error: deletionError } = await supabase.from('messages').delete().eq('id', messageId);
      if (deletionError) {
        console.error(`Erro ao remover mensagem (${logContext}):`, deletionError);
      }
    } catch (err) {
      console.error(`Exceção ao remover mensagem (${logContext}):`, err);
    }
  })();
}
