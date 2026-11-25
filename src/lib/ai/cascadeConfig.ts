/**
 * @file cascadeConfig.ts
 * @description Configuração centralizada e legível para humanos do subsistema de IA:
 * 1. Limites de taxa por usuário e janela de contexto para conversas longas;
 * 2. Limites de consumo de tokens do provedor de contingência DeepSeek;
 * 3. Fila de cascata de 3 níveis (Gemini 3.5 Flash-Lite -> Gemini 3.1 Flash-Lite -> DeepSeek) e timeouts.
 */

export type AIProviderId = 'gemini' | 'deepseek';
export type ModelTier = 'primary' | 'fallback_1' | 'fallback_2';
export type ReliabilityLevel = 'high' | 'standard' | 'reduced';

export interface ModelTierConfig {
  tier: ModelTier;
  provider: AIProviderId;
  defaultModelId: string;
  envVarKey: string;
  displayName: string;
  badgeLabel: string;
  description: string;
  reliability: {
    level: ReliabilityLevel;
    label: string;
    badgeVisible: boolean;
  };
  timeoutMs: number;
}

function parsePositiveEnvInt(rawValue: string | undefined, fallbackValue: number): number {
  if (!rawValue) return fallbackValue;
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallbackValue;
  return Math.floor(parsed);
}

// ============================================================================
// BLOCO 1 — LIMITES DE USO POR USUÁRIO E JANELA DE CONTEXTO DA CONVERSA
// ============================================================================

export const USER_RATE_LIMIT_CONFIG = {
  /** Quantidade máxima de interações permitidas por usuário a cada hora (Chat + Estudo). */
  maxInteractionsPerHour: parsePositiveEnvInt(process.env.AI_MAX_INTERACTIONS_PER_HOUR, 30),
  /** Janela deslizante de contagem em milissegundos (1 hora). */
  windowMs: 60 * 60 * 1000,
} as const;

export const CONVERSATION_CONTEXT_LIMITS = {
  /** Número máximo de turnos (pares pergunta + resposta) enviados à IA em conversas longas. */
  maxHistoryInteractions: 5,
  /** Número máximo de mensagens individuais de histórico (5 interações = 10 mensagens). */
  maxHistoryMessages: 10,
  /** Teto de segurança de caracteres acumulados no histórico (~3.000 tokens). */
  maxHistoryTotalChars: 12000,
} as const;

// ============================================================================
// BLOCO 2 — LIMITES DE TOKENS DO PROVEDOR DEEPSEEK (CONTINGÊNCIA FINAL)
// ============================================================================

export const DEEPSEEK_TOKEN_LIMITS = {
  /** Endpoint oficial compatível com OpenAI da DeepSeek API. */
  apiEndpoint: 'https://api.deepseek.com/chat/completions',
  /** Teto de tokens de saída gerados por resposta no DeepSeek (múltiplo de 1024). */
  maxOutputTokensPerRequest: parsePositiveEnvInt(process.env.DEEPSEEK_MAX_TOKENS_PER_REQUEST, 2048),
  /** Teto acumulado diário de tokens consumidos na API do DeepSeek. */
  maxDailyTotalTokens: parsePositiveEnvInt(process.env.DEEPSEEK_DAILY_TOKEN_LIMIT, 100000),
} as const;

// ============================================================================
// BLOCO 3 — TIMEOUTS E FILA DE CASCATA EM 3 NÍVEIS (FAIL-FAST)
// ============================================================================

/** Tempo máximo para extração de termos PubMed (prioridade crítica do sistema RAG). */
export const PUBMED_EXTRACTION_TIMEOUT_MS = 8000;

/**
 * Ordem de execução da cascata de IA (execução fail-fast com 1 tentativa por nível).
 * Para adicionar, remover ou reordenar modelos, basta editar a lista abaixo.
 */
export const CASCADE_CONFIG: ModelTierConfig[] = [
  {
    tier: 'primary',
    provider: 'gemini',
    defaultModelId: 'gemini-3.5-flash-lite',
    envVarKey: 'GEMINI_MODEL_PRIMARY',
    displayName: 'Gemini 3.5 Flash-Lite',
    badgeLabel: 'Modelo Principal',
    description:
      'Prioridade máxima com alta velocidade de resposta. Responde a todas as consultas normais.',
    reliability: {
      level: 'high',
      label: 'Alta confiabilidade',
      badgeVisible: false, // Regra: nunca exibir badge quando o modelo principal responder
    },
    timeoutMs: 15000,
  },
  {
    tier: 'fallback_1',
    provider: 'gemini',
    defaultModelId: 'gemini-3.1-flash-lite',
    envVarKey: 'GEMINI_MODEL_FALLBACK_1',
    displayName: 'Gemini 3.1 Flash-Lite',
    badgeLabel: 'Fallback 1',
    description:
      'Acionado imediatamente caso o modelo principal exceda 15s ou sofra indisponibilidade. Baixa latência.',
    reliability: {
      level: 'standard',
      label: 'Confiabilidade padrão',
      badgeVisible: true,
    },
    timeoutMs: 12000,
  },
  {
    tier: 'fallback_2',
    provider: 'deepseek',
    defaultModelId: 'deepseek-flash',
    envVarKey: 'DEEPSEEK_MODEL_FALLBACK_2',
    displayName: 'DeepSeek Flash',
    badgeLabel: 'Fallback 2',
    description:
      'Contingência externa final (DeepSeek API) com controle de tokens para garantir resposta mesmo em queda global do Gemini.',
    reliability: {
      level: 'reduced',
      label: 'Confiabilidade reduzida',
      badgeVisible: true,
    },
    timeoutMs: 15000,
  },
];

// ============================================================================
// UTILITÁRIOS DE RESOLUÇÃO DE CONFIGURAÇÃO
// ============================================================================

/** Retorna a configuração completa de um nível específico da cascata. */
export function getTierConfig(tier: ModelTier): ModelTierConfig | undefined {
  return CASCADE_CONFIG.find((tierCandidate) => tierCandidate.tier === tier);
}

/** Resolve o ID técnico do modelo (permitindo override via variável de ambiente). */
export function getModelIdForTier(tier: ModelTier): string {
  const tierConfig = getTierConfig(tier);
  if (!tierConfig) {
    return 'gemini-3.5-flash-lite';
  }

  const envOverride = process.env[tierConfig.envVarKey];
  return envOverride && envOverride.trim() ? envOverride.trim() : tierConfig.defaultModelId;
}

/** Permite sobrescrever globalmente o timeout por tentativa via AI_CASCADE_TIMEOUT_MS. */
export function resolveCascadeTimeoutOverrideMs(): number | null {
  const envTimeout = process.env.AI_CASCADE_TIMEOUT_MS;
  if (!envTimeout) return null;

  const parsedTimeout = Number(envTimeout);
  return Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : null;
}
