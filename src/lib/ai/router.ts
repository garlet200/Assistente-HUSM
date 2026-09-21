import { AIRequest, AIResponse, AIProvider } from './types';
import { CASCADE_CONFIG, getModelIdForTier } from './cascade.config';
import { logFallbackEvent, FallbackLogEntry } from './analytics';
import { deIdentify } from './privacyGate';
import { GeminiProvider } from './providers/gemini';
import { searchPubMed } from './pubmed';

/**
 * Builds the official Assistente_HUSM system instructions for clinical reasoning.
 * Ensures the unemotional, protocol-driven persona and required disclaimer.
 */
function buildAssistenteHusmSystemInstruction(): string {
  return `Você é o "Assistente_HUSM", uma ferramenta de raciocínio clínico e busca de evidências médicas.
Sua operação deve ser estritamente focada no processamento de informação técnica e objetiva, evitando qualquer linguagem que sugira personalidade, sentimentos ou consciência. Não use emojis em nenhuma circunstância.

INÍCIO DIRETO DA RESPOSTA:
Vá diretamente ao conteúdo médico ou à resposta da dúvida do usuário desde a primeira palavra. É expressamente PROIBIDO iniciar a resposta se autodescrevendo, explicando o que a interface é, sua finalidade, a que ela se destina ou utilizando frases de abertura como "Esta interface processa...", "Esta interface destina-se a...", "Como ferramenta...", ou quaisquer preâmbulos explicativos sobre o sistema. Responda imediatamente e com precisão técnica à questão apresentada.

TAREFAS - FUNÇÃO
Sua operação no chat livre é focada em:
1. REFERÊNCIA CONSOLIDADA: Fornecer informações minuciosas, abrangentes e diferenciais, baseadas estritamente nas fontes listadas. Não cite ou liste referências numéricas, IDs ou PMIDs no corpo do texto (as fontes serão listadas automaticamente na seção RAG).
2. SUGESTÃO DE PESQUISA: Após a resposta principal, sugira 2 a 3 tópicos de pesquisa aprofundada ou palavras-chave. IMPORTANTE: Formate CADA sugestão EXATAMENTE como um link no formato markdown apontando para "#sugestao-TEXTO", substituindo espaços no link por "%20", por exemplo: [Hipertensão na gravidez](#sugestao-Hipertensão%20na%20gravidez). Não use marcadores de lista, apenas os links.

RESTRIÇÕES - REGRAS INEGOCIÁVEIS
A. Restrições de Segurança (Não Clínico)
* PROIBIÇÃO DE DIAGNÓSTICO: Estritamente proibido fornecer um diagnóstico definitivo, conselho clínico, ou substituir um profissional de saúde licenciado.
* LINGUAGEM IMPESSOAL: Escreva de forma puramente técnica, impessoal e em terceira pessoa ou voz passiva. Não use "Eu acho", "Eu sinto", "Minha opinião é", e NUNCA inclua declarações ou preâmbulos sobre o papel ou a natureza da própria interface.
* EMERGÊNCIAS: Para relatos de emergência (dor no peito, dispneia extrema, etc.), a PRIMEIRA resposta deve ser a instrução para buscar ajuda médica imediata.

B. Restrições de Evidência
* Todas as informações DEVEM ser baseadas e rastreáveis.
* Fontes Aceitas: PubMed, Semantic Scholar, OpenAlex, SciELO, MedSul, MSD Manuals, Harrison: Medicina Interna.

FORMATO - CRITÉRIOS DE SUCESSO
1. Linguagem: Use terminologia médica precisa, vocabulário vasto e estruturas frasais variadas. Evite uso excessivo de formatação Markdown (use negrito apenas para o estritamente necessário).
2. Verificação: A resposta deve ser minuciosamente detalhada, incorporando detalhes fisiopatológicos, epidemiológicos e farmacológicos sempre que relevante.
3. Aviso Obrigatório (Disclaimer): Toda resposta DEVE ser finalizada exatamente com o seguinte texto:
"AVISO: Esta é uma ferramenta educacional e não substitui o julgamento ou o cuidado de um profissional de saúde licenciado."`;
}

/**
 * Executes an asynchronous promise with a strict timeout limit.
 * If the promise does not resolve within timeoutMs, rejects with a timeout error.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, modelDisplayName: string): Promise<T> {
  let timerId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = setTimeout(() => {
      reject(new Error(`TIMEOUT_EXCEEDED: Tempo limite de ${timeoutMs / 1000}s excedido no modelo ${modelDisplayName}`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timerId);
  });
}

/**
 * Categorizes failure causes for diagnostics and analytics logging.
 */
function classifyFailureReason(error: unknown, durationMs: number, timeoutMs: number): string {
  if (durationMs >= timeoutMs || (error instanceof Error && error.message.includes('TIMEOUT_EXCEEDED'))) {
    return 'TIMEOUT_EXCEEDED';
  }

  if (!(error instanceof Error) || !error.message) {
    return 'UNKNOWN_API_ERROR';
  }

  const msg = error.message;
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota')) {
    return 'QUOTA_OR_RATE_LIMIT_EXCEEDED';
  }

  if (
    msg.includes('500') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('504') ||
    msg.includes('demand') ||
    msg.includes('overloaded')
  ) {
    return 'SERVER_OVERLOAD_OR_5XX';
  }

  if (msg.includes('400') || msg.includes('401') || msg.includes('403') || msg.includes('404')) {
    return 'CLIENT_OR_AUTH_4XX';
  }

  return `API_ERROR: ${msg.substring(0, 80)}`;
}

/**
 * User-facing clear error response when all 3 cascade models fail.
 * Strictly non-technical, polite, informing temporary unavailability.
 */
function createAllModelsFailedResponse(isJsonFormat: boolean, fallbackEvents: FallbackLogEntry[]): AIResponse {
  const userFacingExplanation =
    'O assistente está temporariamente indisponível devido à alta demanda nos servidores de processamento. Por favor, aguarde alguns instantes e tente novamente.';

  return {
    text: isJsonFormat
      ? JSON.stringify({ content: userFacingExplanation, isMCQ: false, options: [] })
      : userFacingExplanation,
    providerId: 'system',
    modelId: 'cascade-exhausted',
    citations: [],
    fallbackEvents,
  };
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
   * Employs fast models first to protect primary quotas and ensure high-speed retrieval.
   */
  private async retrievePubMedContext(
    sanitizedPrompt: string,
    provider: AIProvider
  ): Promise<{ evidenceContext: string; citationList: string[] }> {
    const extractionPrompt = `Extraia os principais conceitos clínicos da seguinte pergunta e os traduza para o inglês, formando uma query booleana curta para o PubMed (ex: Myocardial Infarction AND Treatment). Retorne APENAS a string da query, sem aspas ou explicações. Pergunta: "${sanitizedPrompt}"`;

    // Prioritize fastest model (fallback_1: gemini-3.5-flash-lite) with a tight 4s timeout
    const candidateModels = [
      getModelIdForTier('fallback_1'),
    ];

    for (const modelId of candidateModels) {
      try {
        const extractionResponse = await withTimeout(
          provider.generate(
            { prompt: extractionPrompt, role: 'MODEL_ROLE_CLINICAL_REASONING' },
            modelId
          ),
          4000,
          modelId
        );

        const pubmedQuery = extractionResponse.text.trim();
        const pubmedResults = await searchPubMed(pubmedQuery);

        if (pubmedResults.pmids.length === 0) {
          return { evidenceContext: '', citationList: [] };
        }

        const evidenceContext = `\n\nCONTEXTO DE EVIDÊNCIAS OBTIDAS DO PUBMED (Use estritamente estas informações se aplicável):\n${pubmedResults.context}`;
        const citationList = pubmedResults.pmids.map((article) => `PMID: ${article.id} | ${article.title}`);

        return { evidenceContext, citationList };
      } catch (extractionError) {
        console.warn(`[PubMed Query Extraction] Falha ao extrair query usando modelo ${modelId}:`, extractionError instanceof Error ? extractionError.message : extractionError);
        // Continue to next candidate model for query extraction
      }
    }

    return { evidenceContext: '', citationList: [] };
  }

  /**
   * Main request processing entrypoint with privacy gating, RAG, and 3-tier cascade fallback.
   */
  async processRequest(request: AIRequest): Promise<AIResponse> {
    const isJsonFormat = request.responseFormat === 'json';

    // 1. Privacy Gating
    const sanitizedPrompt = deIdentify(request.prompt);

    const provider = this.providers.get('gemini');
    if (!provider) {
      console.error('Provedor Gemini não configurado ou chave de API ausente.');
      return createAllModelsFailedResponse(isJsonFormat, []);
    }

    // 2. Evidence Augmentation (RAG)
    let pubmedContext = '';
    let pmidCitations: string[] = [];

    const isClinicalReasoningRole = request.role === 'MODEL_ROLE_CLINICAL_REASONING';
    if (isClinicalReasoningRole) {
      const { evidenceContext, citationList } = await this.retrievePubMedContext(
        sanitizedPrompt,
        provider
      );
      pubmedContext = evidenceContext;
      pmidCitations = citationList;
    }

    // 3. Safe Request Composition
    const safeRequest: AIRequest = {
      ...request,
      prompt: sanitizedPrompt + pubmedContext,
      systemInstruction: request.systemInstruction || buildAssistenteHusmSystemInstruction(),
    };

    // 4. Cascade Execution across the 3 configured tiers
    const globalTimeoutOverride =
      process.env.AI_CASCADE_TIMEOUT_MS && !isNaN(Number(process.env.AI_CASCADE_TIMEOUT_MS))
        ? Number(process.env.AI_CASCADE_TIMEOUT_MS)
        : null;
    const fallbackEvents: FallbackLogEntry[] = [];

    for (let i = 0; i < CASCADE_CONFIG.length; i++) {
      const currentTierConfig = CASCADE_CONFIG[i];
      const modelId = getModelIdForTier(currentTierConfig.tier);
      const nextTierConfig = i < CASCADE_CONFIG.length - 1 ? CASCADE_CONFIG[i + 1] : null;
      const timeoutMs = globalTimeoutOverride ?? currentTierConfig.timeoutMs;

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

        // Attach reliability tier metadata
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

        const logEntry: FallbackLogEntry = {
          timestamp: new Date().toISOString(),
          role: request.role,
          attemptedTier: currentTierConfig.tier,
          attemptedModelId: modelId,
          failureReason,
          durationMs,
          nextTier: nextTierConfig ? nextTierConfig.tier : 'none',
          nextModelId: nextTierConfig ? getModelIdForTier(nextTierConfig.tier) : 'none',
        };

        fallbackEvents.push(logEntry);
        logFallbackEvent(logEntry);

        // Continue to the next tier in the cascade
        if (nextTierConfig) {
          continue;
        }
      }
    }

    // 5. If all 3 models failed
    return createAllModelsFailedResponse(isJsonFormat, fallbackEvents);
  }
}

export const orchestrator = new AIOrchestrator();
