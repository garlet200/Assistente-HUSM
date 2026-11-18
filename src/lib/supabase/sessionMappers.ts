/**
 * @file sessionMappers.ts
 * @description Funções puras de transformação e agrupamento de mensagens entre o formato do banco
 * (`DatabaseMessageRow`) e os modelos de domínio da interface (`Interaction`, `StudyMessage` e `ExportableCardItem`).
 */

import { Interaction } from '@/components/chat/ChatInteractionCard';
import { StudyMessage } from '@/components/study/StudySimulationCard';
import { ModelTier, ReliabilityLevel } from '@/lib/ai/cascadeConfig';
import { limitConversationHistory } from '@/lib/ai/rateLimiter';
import { AIRequestHistoryMessage, AIResponse } from '@/lib/ai/types';
import { EducationalSimulationJsonPayload } from '@/lib/ai/prompts';
import { CHAT_TITLE_MAX_PREVIEW_LENGTH } from '@/lib/constants/session';
import { ExportableCardItem } from '@/lib/utils/exporters';

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

/** Builds bounded conversation history for LLM context from existing UI interactions. */
export function buildConversationHistory(interactions: Interaction[]): AIRequestHistoryMessage[] {
  const fullHistory = interactions.flatMap((interaction): AIRequestHistoryMessage[] => [
    { role: 'user', content: interaction.prompt },
    ...(interaction.response ? [{ role: 'model' as const, content: interaction.response }] : []),
  ]);

  return limitConversationHistory(fullHistory, 'MODEL_ROLE_CLINICAL_REASONING');
}

/** Builds bounded linear message history including MCQ choices for study simulator continuity. */
export function buildStudyConversationHistory(
  messagesList: StudyMessage[]
): AIRequestHistoryMessage[] {
  const fullHistory = messagesList.map((studyMessage): AIRequestHistoryMessage => {
    const formattedContent = studyMessage.isMCQ
      ? `${studyMessage.content}\nOpções: ${studyMessage.options?.join(' | ')}`
      : studyMessage.content;

    return { role: studyMessage.role, content: formattedContent };
  });

  return limitConversationHistory(fullHistory, 'MODEL_ROLE_EDUCATIONAL');
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

/** Builds common persistence metadata fields from an AIResponse payload. */
export function buildModelReplyMetadata(gatewayResult: AIResponse): Record<string, unknown> {
  return {
    reliability: gatewayResult.reliability,
    modelTier: gatewayResult.modelTier,
    modelId: gatewayResult.modelId,
    displayName: gatewayResult.displayName,
  };
}

/** Builds a StudyMessage model item and its persistence metadata from a parsed JSON simulation payload. */
export function buildStudyModelReplyPayload(
  temporaryId: string,
  parsedAiPayload: EducationalSimulationJsonPayload,
  gatewayResult: AIResponse
): { message: StudyMessage; metadata: Record<string, unknown> } {
  return {
    message: {
      id: temporaryId,
      role: 'model',
      content: parsedAiPayload.content,
      isMCQ: parsedAiPayload.isMCQ,
      options: parsedAiPayload.options,
      answered: false,
      reliability: gatewayResult.reliability,
      modelTier: gatewayResult.modelTier,
    },
    metadata: {
      isMCQ: parsedAiPayload.isMCQ,
      options: parsedAiPayload.options,
      answered: false,
      ...buildModelReplyMetadata(gatewayResult),
    },
  };
}

/** Converts raw database message rows into ExportableCardItem objects for PDF export. */
export function mapDatabaseMessagesToExportCards(
  rawMessages: DatabaseMessageRow[],
  fallbackHeading: string
): ExportableCardItem[] {
  const hasModelMessagesWithMetadata = rawMessages.some(
    (msg) => msg.role === 'model' && Boolean(msg.metadata?.isMCQ)
  );

  if (hasModelMessagesWithMetadata) {
    return rawMessages
      .filter((msg) => msg.role === 'model')
      .map((msg) => ({
        heading: fallbackHeading,
        body: msg.metadata?.options?.length
          ? `${msg.content}\n\nOpções:\n${msg.metadata.options.join('\n')}`
          : msg.content,
      }));
  }

  return groupMessagesIntoInteractions(rawMessages).map((interaction) => ({
    heading: interaction.prompt,
    body: interaction.response || '',
    timestamp: new Date(interaction.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    citations: interaction.citations,
  }));
}
