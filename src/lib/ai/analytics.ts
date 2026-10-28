/**
 * @file analytics.ts
 * @description Telemetria estruturada, classificação diagnóstica de falhas HTTP/Timeout e
 * resposta de contingência final quando todos os 3 níveis da cascata de IA se esgotam.
 */

import { ModelTier } from './cascadeConfig';
import { AIResponse } from './types';
import { ASSISTANT_UNAVAILABLE_MESSAGE } from '@/lib/utils/formatters';

export interface FallbackLogEntry {
  timestamp: string;
  role: string;
  attemptedTier: ModelTier;
  attemptedModelId: string;
  failureReason: string;
  durationMs: number;
  nextTier?: ModelTier | 'none';
  nextModelId?: string | 'none';
}

/**
 * Categorizes failure causes (timeout, quota 429, overload 503, 4xx) for diagnostics and telemetry logging.
 */
export function classifyFailureReason(
  error: unknown,
  durationMs: number,
  timeoutMs: number
): string {
  const isTimeoutError =
    durationMs >= timeoutMs ||
    (error instanceof Error && error.message.includes('TIMEOUT_EXCEEDED'));

  if (isTimeoutError) {
    return 'TIMEOUT_EXCEEDED';
  }

  if (!(error instanceof Error) || !error.message) {
    return 'UNKNOWN_API_ERROR';
  }

  const errorMessage = error.message;

  if (
    errorMessage.includes('429') ||
    errorMessage.includes('RESOURCE_EXHAUSTED') ||
    errorMessage.includes('Quota')
  ) {
    return 'QUOTA_OR_RATE_LIMIT_EXCEEDED';
  }

  if (
    errorMessage.includes('500') ||
    errorMessage.includes('502') ||
    errorMessage.includes('503') ||
    errorMessage.includes('504') ||
    errorMessage.includes('demand') ||
    errorMessage.includes('overloaded')
  ) {
    return 'SERVER_OVERLOAD_OR_5XX';
  }

  if (
    errorMessage.includes('400') ||
    errorMessage.includes('401') ||
    errorMessage.includes('403') ||
    errorMessage.includes('404')
  ) {
    return 'CLIENT_OR_AUTH_4XX';
  }

  return `API_ERROR: ${errorMessage.substring(0, 80)}`;
}

/**
 * Structured analytics and telemetry logger for AI model fallback events.
 * Enables post-hoc reliability analysis for academic and clinical research.
 */
export function logFallbackEvent(fallbackEvent: FallbackLogEntry): void {
  const structuredLog = {
    event: 'AI_CASCADE_FALLBACK',
    ...fallbackEvent,
  };

  console.warn(
    `[AI_FALLBACK_EVENT] ${fallbackEvent.timestamp} | Tier "${fallbackEvent.attemptedTier}" (${fallbackEvent.attemptedModelId}) falhou em ${fallbackEvent.durationMs}ms [${fallbackEvent.failureReason}]. Próximo: "${fallbackEvent.nextTier || 'nenhum'}".`
  );
  console.info('[AI_TELEMETRY]', JSON.stringify(structuredLog));
}

/**
 * Builds the standardized fallback response when all 3 cascade models fail.
 */
export function createAllModelsFailedResponse(
  isJsonFormat: boolean,
  fallbackEvents: FallbackLogEntry[]
): AIResponse {
  const formattedText = isJsonFormat
    ? JSON.stringify({ content: ASSISTANT_UNAVAILABLE_MESSAGE, isMCQ: false, options: [] })
    : ASSISTANT_UNAVAILABLE_MESSAGE;

  return {
    text: formattedText,
    providerId: 'system',
    modelId: 'cascade-exhausted',
    citations: [],
    fallbackEvents,
  };
}
