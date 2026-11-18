/**
 * @file router.ts
 * @description Orquestrador central de IA (AIOrchestrator) que coordena anonimização LGPD (Privacy Gate),
 * limitação de histórico, enriquecimento PubMed RAG e execução fail-fast em cascata de 4 níveis.
 */

import { AIProvider, AIRequest, AIResponse } from './types';
import {
  CASCADE_CONFIG,
  ModelTier,
  ModelTierConfig,
  PUBMED_EXTRACTION_TIMEOUT_MS,
  getModelIdForTier,
  getTierConfig,
  resolveCascadeTimeoutOverrideMs,
} from './cascadeConfig';
import {
  classifyFailureReason,
  createAllModelsFailedResponse,
  FallbackLogEntry,
  logFallbackEvent,
} from './analytics';
import { deIdentify } from './privacyGate';
import { DeepSeekProvider } from './providers/deepseek';
import { GeminiProvider } from './providers/gemini';
import { searchPubMed } from './pubmed';
import { buildAssistenteHusmSystemInstruction, buildPubMedExtractionPrompt } from './prompts';
import { limitConversationHistory } from './rateLimiter';

const PUBMED_EXTRACTION_TIERS: readonly ModelTier[] = ['fallback_1', 'fallback_2', 'fallback_3'];

interface TierExecutionParams {
  safeRequest: AIRequest;
  currentTierConfig: ModelTierConfig;
  nextTierConfig: ModelTierConfig | null;
  timeoutMs: number;
  pmidCitations: string[];
  fallbackEvents: FallbackLogEntry[];
}

function withTimeout<T>(
  operation: (abortSignal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  modelDisplayName: string
): Promise<T> {
  const controller = new AbortController();
  let timerId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = setTimeout(() => {
      controller.abort();
      reject(
        new Error(
          `TIMEOUT_EXCEEDED: Tempo limite de ${timeoutMs / 1000}s excedido no modelo ${modelDisplayName}`
        )
      );
    }, timeoutMs);
  });

  return Promise.race([operation(controller.signal), timeoutPromise]).finally(() => {
    clearTimeout(timerId);
  });
}

export class AIOrchestrator {
  private providers: Map<string, AIProvider> = new Map();

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.providers.set('gemini', new GeminiProvider(process.env.GEMINI_API_KEY));
    }
    if (process.env.DEEPSEEK_API_KEY) {
      this.providers.set('deepseek', new DeepSeekProvider(process.env.DEEPSEEK_API_KEY));
    }
  }

  private async retrievePubMedContext(
    sanitizedPrompt: string
  ): Promise<{ evidenceContext: string; citationList: string[] }> {
    const extractionPrompt = buildPubMedExtractionPrompt(sanitizedPrompt);

    for (const tier of PUBMED_EXTRACTION_TIERS) {
      const tierConfig = getTierConfig(tier);
      const provider = tierConfig ? this.providers.get(tierConfig.provider) : undefined;
      if (!tierConfig || !provider) continue;

      const modelId = getModelIdForTier(tier);

      try {
        const extractionResponse = await withTimeout(
          (abortSignal) =>
            provider.generate(
              { prompt: extractionPrompt, role: 'MODEL_ROLE_CLINICAL_REASONING', abortSignal },
              modelId
            ),
          PUBMED_EXTRACTION_TIMEOUT_MS,
          modelId
        );

        const pubmedResults = await searchPubMed(extractionResponse.text.trim());
        if (pubmedResults.pmids.length === 0) {
          return { evidenceContext: '', citationList: [] };
        }

        const evidenceContext = `\n\nCONTEXTO DE EVIDÊNCIAS OBTIDAS DO PUBMED (Use estritamente estas informações se aplicável):\n${pubmedResults.context}`;
        const citationList = pubmedResults.pmids.map((a) => `PMID: ${a.id} | ${a.title}`);
        return { evidenceContext, citationList };
      } catch (extractionError) {
        const detail = extractionError instanceof Error ? extractionError.message : extractionError;
        console.warn(`[PubMed Query Extraction] Falha ao extrair query com ${modelId}:`, detail);
      }
    }

    return { evidenceContext: '', citationList: [] };
  }

  private recordTierFailure(
    params: TierExecutionParams,
    modelId: string,
    failureReason: string,
    durationMs: number
  ): void {
    const logEntry: FallbackLogEntry = {
      timestamp: new Date().toISOString(),
      role: params.safeRequest.role,
      attemptedTier: params.currentTierConfig.tier,
      attemptedModelId: modelId,
      failureReason,
      durationMs,
      nextTier: params.nextTierConfig ? params.nextTierConfig.tier : 'none',
      nextModelId: params.nextTierConfig ? getModelIdForTier(params.nextTierConfig.tier) : 'none',
    };

    params.fallbackEvents.push(logEntry);
    logFallbackEvent(logEntry);
  }

  private async executeSingleTier(params: TierExecutionParams): Promise<AIResponse | null> {
    const { safeRequest, currentTierConfig, timeoutMs, pmidCitations, fallbackEvents } = params;
    const modelId = getModelIdForTier(currentTierConfig.tier);
    const provider = this.providers.get(currentTierConfig.provider);

    if (!provider) {
      this.recordTierFailure(params, modelId, 'PROVIDER_NOT_CONFIGURED', 0);
      return null;
    }

    const attemptStartTime = Date.now();

    try {
      const response = await withTimeout(
        (abortSignal) => provider.generate({ ...safeRequest, abortSignal }, modelId),
        timeoutMs,
        currentTierConfig.displayName
      );

      if (pmidCitations.length > 0) {
        response.citations = [...(response.citations || []), ...pmidCitations];
      }
      response.reliability = currentTierConfig.reliability.level;
      response.modelTier = currentTierConfig.tier;
      response.displayName = currentTierConfig.displayName;
      response.modelId = modelId;
      if (fallbackEvents.length > 0) {
        response.fallbackEvents = fallbackEvents;
      }

      return response;
    } catch (tierError: unknown) {
      const durationMs = Date.now() - attemptStartTime;
      const failureReason = classifyFailureReason(tierError, durationMs, timeoutMs);
      this.recordTierFailure(params, modelId, failureReason, durationMs);
      return null;
    }
  }

  private async executeCascade(
    safeRequest: AIRequest,
    isJsonFormat: boolean,
    pmidCitations: string[]
  ): Promise<AIResponse> {
    const globalTimeoutOverride = resolveCascadeTimeoutOverrideMs();
    const fallbackEvents: FallbackLogEntry[] = [];

    for (let tierIndex = 0; tierIndex < CASCADE_CONFIG.length; tierIndex++) {
      const currentTierConfig = CASCADE_CONFIG[tierIndex];
      const nextTierConfig =
        tierIndex < CASCADE_CONFIG.length - 1 ? CASCADE_CONFIG[tierIndex + 1] : null;
      const timeoutMs = globalTimeoutOverride ?? currentTierConfig.timeoutMs;

      const tierResponse = await this.executeSingleTier({
        safeRequest,
        currentTierConfig,
        nextTierConfig,
        timeoutMs,
        pmidCitations,
        fallbackEvents,
      });

      if (tierResponse) {
        return tierResponse;
      }
    }

    return createAllModelsFailedResponse(isJsonFormat, fallbackEvents);
  }

  /**
   * Main request processing entrypoint with LGPD privacy gating, context trimming, PubMed RAG, and 4-tier cascade.
   */
  async processRequest(request: AIRequest): Promise<AIResponse> {
    const isJsonFormat = request.responseFormat === 'json';

    if (this.providers.size === 0) {
      console.error('Nenhum provedor de IA configurado (GEMINI_API_KEY e DEEPSEEK_API_KEY ausentes).');
      return createAllModelsFailedResponse(isJsonFormat, []);
    }

    const sanitizedPrompt = deIdentify(request.prompt);
    const limitedHistory = limitConversationHistory(request.history, request.role).map((msg) => ({
      ...msg,
      content: deIdentify(msg.content),
    }));

    const { evidenceContext, citationList } =
      request.role === 'MODEL_ROLE_CLINICAL_REASONING'
        ? await this.retrievePubMedContext(sanitizedPrompt)
        : { evidenceContext: '', citationList: [] };

    const resolvedSystemInstruction =
      request.role === 'MODEL_ROLE_CLINICAL_REASONING'
        ? buildAssistenteHusmSystemInstruction(request.aiLanguageLevel, request.aiDetailLevel)
        : request.systemInstruction ||
          buildAssistenteHusmSystemInstruction(request.aiLanguageLevel, request.aiDetailLevel);

    const safeRequest: AIRequest = {
      ...request,
      prompt: sanitizedPrompt + evidenceContext,
      history: limitedHistory,
      systemInstruction: resolvedSystemInstruction,
    };

    return this.executeCascade(safeRequest, isJsonFormat, citationList);
  }
}

export const orchestrator = new AIOrchestrator();
