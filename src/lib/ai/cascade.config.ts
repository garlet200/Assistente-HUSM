export type ModelTier = 'primary' | 'fallback_1' | 'fallback_2';
export type ReliabilityLevel = 'high' | 'standard' | 'reduced';

export interface ModelTierConfig {
  tier: ModelTier;
  defaultModelId: string;
  envVarKey: string;
  displayName: string;
  reliability: {
    level: ReliabilityLevel;
    label: string;
    badgeVisible: boolean;
  };
  timeoutMs: number;
}

/**
 * 3-Tier AI Cascade Configuration for the clinical assistant.
 * Models are prioritized from primary down to fallback 2.
 */
export const CASCADE_CONFIG: ModelTierConfig[] = [
  {
    tier: 'primary',
    defaultModelId: 'gemini-3.8-flash',
    envVarKey: 'GEMINI_MODEL_PRIMARY',
    displayName: 'Gemini 3.8 Flash',
    reliability: {
      level: 'high',
      label: 'Alta confiabilidade',
      badgeVisible: false, // Rule: never show badge if primary model generated the response
    },
    timeoutMs: 50000, // 50s to allow full deep clinical reasoning
  },
  {
    tier: 'fallback_1',
    defaultModelId: 'gemini-3.5-flash-lite',
    envVarKey: 'GEMINI_MODEL_FALLBACK_1',
    displayName: 'Gemini 3.5 Flash-Lite',
    reliability: {
      level: 'standard',
      label: 'Confiabilidade padrão',
      badgeVisible: true,
    },
    timeoutMs: 50000, // 50s to ensure deep clinical reasoning is not prematurely interrupted under load
  },
  {
    tier: 'fallback_2',
    defaultModelId: 'gemini-3-flash-preview',
    envVarKey: 'GEMINI_MODEL_FALLBACK_2',
    displayName: 'Gemini 3 Flash Preview',
    reliability: {
      level: 'reduced',
      label: 'Confiabilidade reduzida',
      badgeVisible: true,
    },
    timeoutMs: 50000, // 50s safety net timeout
  },
];

/**
 * Resolves the actual Google API model identifier to use for a given tier,
 * allowing environment variable overrides while falling back to the configured default.
 */
export function getModelIdForTier(tier: ModelTier): string {
  const tierConfig = CASCADE_CONFIG.find((c) => c.tier === tier);
  if (!tierConfig) {
    return 'gemini-3.8-flash';
  }

  const envOverride = process.env[tierConfig.envVarKey];
  return envOverride && envOverride.trim() ? envOverride.trim() : tierConfig.defaultModelId;
}

/**
 * Resolves the effective timeout in milliseconds per cascade attempt.
 * Defaults to 50000ms (50 seconds) to ensure thorough medical reasoning is completed.
 */
export function getCascadeTimeoutMs(): number {
  const envTimeout = process.env.AI_CASCADE_TIMEOUT_MS;
  if (envTimeout && !isNaN(Number(envTimeout))) {
    return Number(envTimeout);
  }
  return 50000;
}
