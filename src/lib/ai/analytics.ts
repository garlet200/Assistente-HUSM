import { ModelTier } from './cascade.config';

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
 * Structured analytics and telemetry logger for AI model fallback events.
 * Enables post-hoc reliability analysis for academic and clinical research.
 */
export function logFallbackEvent(entry: FallbackLogEntry): void {
  const structuredLog = {
    event: 'AI_CASCADE_FALLBACK',
    ...entry,
  };

  console.warn(
    `[AI_FALLBACK_EVENT] ${entry.timestamp} | Tier "${entry.attemptedTier}" (${entry.attemptedModelId}) falhou em ${entry.durationMs}ms [${entry.failureReason}]. Próximo: "${entry.nextTier || 'nenhum'}".`
  );
  console.info('[AI_TELEMETRY]', JSON.stringify(structuredLog));
}
