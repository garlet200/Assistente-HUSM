/**
 * @file router.ts
 * @description Orquestrador central de IA (AIOrchestrator) que coordena anonimização LGPD (Privacy Gate),
 * enriquecimento de evidências científicas (PubMed RAG) e execução resiliente em cascata de 3 níveis.
 */

import { AIRequest, AIResponse, AIProvider } from './types';
import {
  CASCADE_CONFIG,
  ModelTierConfig,
  getModelIdForTier,
  resolveCascadeTimeoutOverrideMs,
} from './cascadeConfig';
import {
  classifyFailureReason,
  createAllModelsFailedResponse,
  FallbackLogEntry,
  logFallbackEvent,
} from './analytics';
import { deIdentify } from './privacyGate';
import { GeminiProvider } from './providers/gemini';
import { searchPubMed } from './pubmed';
import {
  buildAssistenteHusmSystemInstruction,
  buildPubMedExtractionPrompt,
} from './prompts';

const PUBMED_EXTRACTION_TIMEOUT_MS = 8000;
const OVERLOAD_BACKOFF_DELAY_MS = 1000;
const MAX_ATTEMPTS_PER_TIER = 2;

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Executes an asynchronous promise with a strict timeout limit.
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  modelDisplayName: string
): Promise<T> {
  let timerId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = setTimeout(() => {
      reject(
        new Error(
          `TIMEOUT_EXCEEDED: Tempo limite de ${timeoutMs / 1000}s excedido no modelo ${modelDisplayName}`
        )
      );
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timerId);
  });
}

export class AIOrchestrator {
  private providers: Map<string, AIProvider> = new Map();

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.providers.set('gemini', new GeminiProvider(process.env.GEMINI_API_KEY));
    }
  }

  /**
   * Translates a clinical query into PubMed boolean search syntax and fetches relevant abstracts.
   * Uses high-quota fallback tiers first to protect primary model quota.
   */
  private async retrievePubMedContext(
    sanitizedPrompt: string,
    provider: AIProvider
  ): Promise<{ evidenceContext: string; citationList: string[] }> {
    const extractionPrompt = buildPubMedExtractionPrompt(sanitizedPrompt);
    const candidateModels = [
      getModelIdForTier('fallback_1'),
      getModelIdForTier('fallback_2'),
    ];

    for (const modelId of candidateModels) {
      try {
        const extractionResponse = await withTimeout(
          provider.generate(
            { prompt: extractionPrompt, role: 'MODEL_ROLE_CLINICAL_REASONING' },
            modelId
          ),
          PUBMED_EXTRACTION_TIMEOUT_MS,
          modelId
        );

        const pubmedQuery = extractionResponse.text.trim();
        const pubmedResults = await searchPubMed(pubmedQuery);

        if (pubmedResults.pmids.length === 0) {
          return { evidenceContext: '', citationList: [] };
        }

        const evidenceContext = `\n\nCONTEXTO DE EVIDÊNCIAS OBTIDAS DO PUBMED (Use estritamente estas informações se aplicável):\n${pubmedResults.context}`;
        const citationList = pubmedResults.pmids.map(
          (article) => `PMID: ${article.id} | ${article.title}`
        );

        return { evidenceContext, citationList };
      } catch (extractionError) {
        const errorDetail =
          extractionError instanceof Error ? extractionError.message : extractionError;
        console.warn(
          `[PubMed Query Extraction] Falha ao extrair query usando modelo ${modelId}:`,
          errorDetail
        );
      }
    }

    return { evidenceContext: '', citationList: [] };
  }

  /**
   * Executes up to MAX_ATTEMPTS_PER_TIER attempts for a single cascade tier, applying 503 backoff.
   */
  private async executeSingleTierAttempts(params: {
    provider: AIProvider;
    safeRequest: AIRequest;
    currentTierConfig: ModelTierConfig;
    nextTierConfig: ModelTierConfig | null;
    timeoutMs: number;
    pmidCitations: string[];
    fallbackEvents: FallbackLogEntry[];
  }): Promise<AIResponse | null> {
    const {
      provider,
      safeRequest,
      currentTierConfig,
      nextTierConfig,
      timeoutMs,
      pmidCitations,
      fallbackEvents,
    } = params;
    const modelId = getModelIdForTier(currentTierConfig.tier);

    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_TIER; attempt++) {
      const attemptStartTime = Date.now();

      try {
        const response = await withTimeout(
          provider.generate(safeRequest, modelId),
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
        const is503Overload = failureReason === 'SERVER_OVERLOAD_OR_5XX';

        if (is503Overload && attempt < MAX_ATTEMPTS_PER_TIER) {
          console.warn(
            `[AI_503_BACKOFF] Modelo "${currentTierConfig.displayName}" retornou 503 em ${durationMs}ms. Aplicando pausa de ${OVERLOAD_BACKOFF_DELAY_MS}ms antes de retentar...`
          );
          await delay(OVERLOAD_BACKOFF_DELAY_MS);
          continue;
        }

        const logEntry: FallbackLogEntry = {
          timestamp: new Date().toISOString(),
          role: safeRequest.role,
          attemptedTier: currentTierConfig.tier,
          attemptedModelId: modelId,
          failureReason,
          durationMs,
          nextTier: nextTierConfig ? nextTierConfig.tier : 'none',
          nextModelId: nextTierConfig ? getModelIdForTier(nextTierConfig.tier) : 'none',
        };

        fallbackEvents.push(logEntry);
        logFallbackEvent(logEntry);

        if (is503Overload && nextTierConfig) {
          console.info(
            `[AI_503_BACKOFF] Pausa de ${OVERLOAD_BACKOFF_DELAY_MS}ms antes de acionar o próximo tier "${nextTierConfig.tier}"...`
          );
          await delay(OVERLOAD_BACKOFF_DELAY_MS);
        }

        return null;
      }
    }

    return null;
  }

  /**
   * Main request processing entrypoint with privacy gating, RAG, and 3-tier cascade fallback.
   */
  async processRequest(request: AIRequest): Promise<AIResponse> {
    const isJsonFormat = request.responseFormat === 'json';
    const sanitizedPrompt = deIdentify(request.prompt);

    const provider = this.providers.get('gemini');
    if (!provider) {
      console.error('Provedor Gemini não configurado ou chave de API ausente.');
      return createAllModelsFailedResponse(isJsonFormat, []);
    }

    let pubmedContext = '';
    let pmidCitations: string[] = [];

    if (request.role === 'MODEL_ROLE_CLINICAL_REASONING') {
      const { evidenceContext, citationList } = await this.retrievePubMedContext(
        sanitizedPrompt,
        provider
      );
      pubmedContext = evidenceContext;
      pmidCitations = citationList;
    }

    const safeRequest: AIRequest = {
      ...request,
      prompt: sanitizedPrompt + pubmedContext,
      systemInstruction: request.systemInstruction || buildAssistenteHusmSystemInstruction(),
    };

    const globalTimeoutOverride = resolveCascadeTimeoutOverrideMs();
    const fallbackEvents: FallbackLogEntry[] = [];

    for (let tierIndex = 0; tierIndex < CASCADE_CONFIG.length; tierIndex++) {
      const currentTierConfig = CASCADE_CONFIG[tierIndex];
      const nextTierConfig =
        tierIndex < CASCADE_CONFIG.length - 1 ? CASCADE_CONFIG[tierIndex + 1] : null;
      const timeoutMs = globalTimeoutOverride ?? currentTierConfig.timeoutMs;

      const tierResponse = await this.executeSingleTierAttempts({
        provider,
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
}

export const orchestrator = new AIOrchestrator();
