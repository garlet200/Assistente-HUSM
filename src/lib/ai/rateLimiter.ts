/**
 * @file rateLimiter.ts
 * @description Controle de taxa de interações por hora por usuário (Sliding Window) e
 * limitação da janela de contexto enviada à IA em conversas longas.
 */

import {
  CONVERSATION_CONTEXT_LIMITS,
  USER_RATE_LIMIT_CONFIG,
} from './cascadeConfig';
import { AIRequestHistoryMessage, AIResponse, ModelRole } from './types';

export interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  retryAfterMinutes: number;
}

const userInteractionTimestamps = new Map<string, number[]>();

function computeTotalChars(messages: AIRequestHistoryMessage[]): number {
  return messages.reduce((sum, message) => sum + message.content.length, 0);
}

function truncateOverbudgetMessage(
  message: AIRequestHistoryMessage,
  maxChars: number
): AIRequestHistoryMessage {
  if (message.content.length <= maxChars) {
    return message;
  }
  return {
    ...message,
    content: `${message.content.slice(0, maxChars - 3)}...`,
  };
}

function dropLeadingModelMessages(messages: AIRequestHistoryMessage[]): void {
  while (messages.length > 0 && messages[0].role !== 'user') {
    messages.shift();
  }
}

/**
 * Checks whether the user is within the hourly interaction limit and records the interaction if allowed.
 */
export function checkAndRecordUserInteraction(userId: string): RateLimitCheckResult {
  const now = Date.now();
  const windowStart = now - USER_RATE_LIMIT_CONFIG.windowMs;
  const maxInteractions = USER_RATE_LIMIT_CONFIG.maxInteractionsPerHour;

  const existingTimestamps = userInteractionTimestamps.get(userId) || [];
  const activeTimestamps = existingTimestamps.filter((timestamp) => timestamp > windowStart);

  if (activeTimestamps.length >= maxInteractions) {
    userInteractionTimestamps.set(userId, activeTimestamps);
    const oldestTimestamp = activeTimestamps[0] ?? now;
    const remainingWindowMs = Math.max(1000, USER_RATE_LIMIT_CONFIG.windowMs - (now - oldestTimestamp));
    const retryAfterMinutes = Math.max(1, Math.ceil(remainingWindowMs / 60000));

    return {
      allowed: false,
      remaining: 0,
      retryAfterMinutes,
    };
  }

  const updatedTimestamps = [...activeTimestamps, now];
  userInteractionTimestamps.set(userId, updatedTimestamps);

  return {
    allowed: true,
    remaining: Math.max(0, maxInteractions - updatedTimestamps.length),
    retryAfterMinutes: 0,
  };
}

/**
 * Builds a standardized AIResponse payload when the user exceeds the hourly interaction limit.
 */
export function createRateLimitExceededResponse(
  isJsonFormat: boolean,
  retryAfterMinutes: number
): AIResponse {
  const limit = USER_RATE_LIMIT_CONFIG.maxInteractionsPerHour;
  const noticeMessage = `Aviso do Sistema: Você atingiu o limite de ${limit} interações por hora. Por favor, aguarde cerca de ${retryAfterMinutes} minuto(s) e tente novamente.`;

  const formattedText = isJsonFormat
    ? JSON.stringify({ content: noticeMessage, isMCQ: false, options: [] })
    : noticeMessage;

  return {
    text: formattedText,
    providerId: 'system',
    modelId: 'rate-limit-exceeded',
    citations: [],
  };
}

/**
 * Trims conversation history to the configured turn window and character safety cap.
 * In educational simulation mode, preserves the initial clinical case pair when truncating long sessions.
 */
export function limitConversationHistory(
  history: AIRequestHistoryMessage[] | undefined,
  role: ModelRole
): AIRequestHistoryMessage[] {
  if (!history || history.length === 0) {
    return [];
  }

  const maxMessages = CONVERSATION_CONTEXT_LIMITS.maxHistoryMessages;
  const maxTotalChars = CONVERSATION_CONTEXT_LIMITS.maxHistoryTotalChars;
  const hasEducationalAnchor =
    role === 'MODEL_ROLE_EDUCATIONAL' &&
    history.length > maxMessages &&
    history[0]?.role === 'user' &&
    history[1]?.role === 'model';

  const windowedHistory: AIRequestHistoryMessage[] = hasEducationalAnchor
    ? [...history.slice(0, 2), ...history.slice(-(maxMessages - 2))]
    : history.slice(-maxMessages);

  let anchorLocked = hasEducationalAnchor;

  while (computeTotalChars(windowedHistory) > maxTotalChars && windowedHistory.length > 1) {
    if (anchorLocked && windowedHistory.length > 3) {
      windowedHistory.splice(2, 1);
      continue;
    }
    anchorLocked = false;
    windowedHistory.shift();
  }

  dropLeadingModelMessages(windowedHistory);

  if (windowedHistory.length === 1 && windowedHistory[0].content.length > maxTotalChars) {
    windowedHistory[0] = truncateOverbudgetMessage(windowedHistory[0], maxTotalChars);
  }

  return windowedHistory;
}
