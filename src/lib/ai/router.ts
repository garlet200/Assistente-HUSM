<<<<<<< Updated upstream
import { AIRequest, AIResponse, PrivacyLevel } from './types';
import { getBestModelForRole, getFallbackModelForRole } from './registry';
import { deIdentify, requiresHighPrivacy } from './privacyGate';
=======
import { AIRequest, AIResponse, AIProvider } from './types';
import { CASCADE_CONFIG, getModelIdForTier, getCascadeTimeoutMs } from './cascade.config';
import { logFallbackEvent, FallbackLogEntry } from './analytics';
import { deIdentify } from './privacyGate';
>>>>>>> Stashed changes
import { GeminiProvider } from './providers/gemini';
import { searchPubMed } from './pubmed';

export class AIOrchestrator {
  private providers: Map<string, any> = new Map();

  constructor() {
    // Initialize providers (in a real app, API keys come from secure env vars)
    if (process.env.GEMINI_API_KEY) {
      this.providers.set('gemini', new GeminiProvider(process.env.GEMINI_API_KEY));
    }
  }

  async processRequest(request: AIRequest): Promise<AIResponse> {
    // 1. Privacy Gate
    const sanitizedPrompt = deIdentify(request.prompt);
    
    // Check if prompt demands high privacy based on content
    const needsHighPrivacy = requiresHighPrivacy(request.prompt);
    const requiredPrivacyLevel: PrivacyLevel = needsHighPrivacy ? 'high' : 'medium';
    
    // 2. Model Routing
    const bestModel = getBestModelForRole(request.role, requiredPrivacyLevel);
    
    if (!bestModel) {
      throw new Error(`Nenhum modelo disponível para a tarefa: ${request.role} com nível de privacidade ${requiredPrivacyLevel}`);
    }

    const provider = this.providers.get(bestModel.provider);
    
    const generateErrorResponse = (errorMsg: string, isJson: boolean): AIResponse => {
      const displayMsg = `⚠️ **Aviso do Sistema: Limite de Requisições Atingido**\n\nNossos servidores atingiram a capacidade máxima de processamento de IA ou o limite da base de dados.\n\nComo o Assistente_HUSM é uma ferramenta acadêmica, operamos com cotas de acesso na versão gratuita para garantir a disponibilidade. Por favor, tente novamente em alguns instantes.\n\n*(Detalhe técnico: ${errorMsg})*`;
      
      return {
        text: isJson 
          ? JSON.stringify({ content: displayMsg, isMCQ: false, options: [] })
          : displayMsg,
        providerId: 'system',
        modelId: 'error-handler',
        citations: []
      };
    };

    if (!provider) {
      console.warn(`Provedor ${bestModel.provider} não configurado.`);
      return generateErrorResponse('Provedor de IA não configurado', request.responseFormat === 'json');
    }

    // Update request with sanitized prompt and system instructions
    let pubmedContext = '';
    let pmidCitations: string[] = [];

    // If general chat, do Retrieval
    if (request.role === 'MODEL_ROLE_CLINICAL_REASONING') {
      try {
        const extractionPrompt = `Extraia os principais conceitos clínicos da seguinte pergunta e os traduza para o inglês, formando uma query booleana curta para o PubMed (ex: Myocardial Infarction AND Treatment). Retorne APENAS a string da query, sem aspas ou explicações. Pergunta: "${sanitizedPrompt}"`;
        const extractionResponse = await provider.generate({ prompt: extractionPrompt, role: 'MODEL_ROLE_CLINICAL_REASONING' }, bestModel.id);
        const pubmedQuery = extractionResponse.text.trim();
        
        const results = await searchPubMed(pubmedQuery);
        if (results.pmids.length > 0) {
          pubmedContext = `\n\nCONTEXTO DE EVIDÊNCIAS OBTIDAS DO PUBMED (Use estritamente estas informações se aplicável):\n${results.context}`;
          pmidCitations = results.pmids.map(p => `PMID: ${p.id} | ${p.title}`);
        }
      } catch (e) {
        console.error("PubMed RAG failed", e);
      }
    }

    const safeRequest: AIRequest = {
      ...request,
      prompt: sanitizedPrompt + pubmedContext,
      systemInstruction: request.systemInstruction || `Você é o "Assistente_HUSM", uma interface de raciocínio clínico e busca de evidências. Sua natureza é estritamente a de uma ferramenta de processamento de informação. Você deve operar com máxima eficiência e precisão, evitando qualquer linguagem que sugira personalidade, sentimentos, crenças ou consciência. Não use emojis em nenhuma circunstância.

TAREFAS - FUNÇÃO
Sua operação no chat livre é focada em:
1. REFERÊNCIA CONSOLIDADA: Fornecer informações minuciosas, abrangentes e diferenciais, baseadas estritamente nas fontes listadas.
2. SUGESTÃO DE PESQUISA: Após a resposta principal, sugira 2 a 3 tópicos de pesquisa aprofundada ou palavras-chave relevantes para estudo. IMPORTANTE: Formate CADA sugestão EXATAMENTE como um link no formato markdown apontando para "#sugestao-TEXTO", por exemplo: [Hipertensão na gravidez](#sugestao-Hipertensão na gravidez). Não use marcadores de lista, apenas os links.

RESTRIÇÕES - REGRAS INEGOCIÁVEIS
A. Restrições de Segurança (Não Clínico)
* PROIBIÇÃO DE DIAGNÓSTICO: Estritamente proibido fornecer um diagnóstico definitivo, conselho clínico, ou substituir um profissional de saúde licenciado.
* PROIBIÇÃO DE LINGUAGEM PESSOAL: Não use "Eu acho", "Eu sinto", "Minha opinião é". Use somente termos como "Esta interface processa" ou "O modelo indica".
* EMERGÊNCIAS: Para relatos de emergência (dor no peito, dispneia extrema, etc.), a PRIMEIRA resposta deve ser a instrução para buscar ajuda médica imediata.

B. Restrições de Evidência
* Todas as informações DEVEM ser baseadas e rastreáveis.
* Fontes Aceitas: PubMed, Semantic Scholar, OpenAlex, SciELO, MedSul, MSD Manuals, Harrison: Medicina Interna.

FORMATO - CRITÉRIOS DE SUCESSO
1. Linguagem: Use terminologia médica precisa, vocabulário vasto e estruturas frasais variadas. Evite uso excessivo de formatação Markdown (use negrito apenas para o estritamente necessário).
2. Verificação: A resposta deve ser minuciosamente detalhada, incorporando detalhes fisiopatológicos, epidemiológicos e farmacológicos sempre que relevante.
3. Aviso Obrigatório (Disclaimer): Toda resposta DEVE ser finalizada exatamente com o seguinte texto:
<<<<<<< Updated upstream
"AVISO: Esta é uma ferramenta educacional e não substitui o julgamento ou o cuidado de um profissional de saúde licenciado."`
    };

    // 3. Provider Execution
    try {
      const response = await provider.generate(safeRequest, bestModel.id);
      if (pmidCitations.length > 0) {
        response.citations = [...(response.citations || []), ...pmidCitations];
      }
      return response;
    } catch (error: any) {
      if (error?.message && (error.message.includes('429') || error.message.includes('503') || error.message.includes('Quota') || error.message.includes('demand'))) {
        const fallbackModel = getFallbackModelForRole(request.role, bestModel.id, requiredPrivacyLevel);
        if (fallbackModel) {
          console.warn(`Fallback: Alternando de ${bestModel.id} para ${fallbackModel.id} devido a falha da API.`);
          try {
            const fallbackProvider = this.providers.get(fallbackModel.provider);
            if (fallbackProvider) {
              const fbResponse = await fallbackProvider.generate(safeRequest, fallbackModel.id);
              
              const warningText = `\n\n> ⚠️ **Modo de Resiliência Ativo:** Devido à alta demanda ou limite da cota gratuita na API principal, esta resposta foi gerada utilizando o modelo de *backup* (${fallbackModel.id}), que pode apresentar menos processamento cognitivo ou menor capacidade de raciocínio crítico em casos altamente complexos.`;
              
              if (request.responseFormat === 'json') {
                try {
                  const parsed = JSON.parse(fbResponse.text);
                  parsed.content = parsed.content + warningText;
                  fbResponse.text = JSON.stringify(parsed);
                } catch (e) {
                  // Fallback to unparsed
                }
              } else {
                fbResponse.text = fbResponse.text + warningText;
              }

              if (pmidCitations.length > 0) {
                fbResponse.citations = [...(fbResponse.citations || []), ...pmidCitations];
              }
              return fbResponse;
            }
          } catch (fbError) {
             console.error("Fallback também falhou:", fbError);
          }
        }
      }

      console.error(`Provider ${provider.name} falhou:`, error);
      let errorDetail = 'Erro desconhecido da API';
      if (error?.message) {
        if (error.message.includes('429') || error.message.includes('Quota')) {
          errorDetail = 'Cota excedida na API do Gemini (Free Tier)';
        } else if (error.message.includes('503') || error.message.includes('demand')) {
          errorDetail = 'Alta demanda temporária nos servidores do Google';
        } else {
          errorDetail = error.message.substring(0, 50) + '...';
        }
      }
      return generateErrorResponse(errorDetail, request.responseFormat === 'json');
    }
=======
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

    const candidateModels = [
      getModelIdForTier('fallback_1'),
      getModelIdForTier('fallback_2'),
      getModelIdForTier('primary'),
    ];

    for (const modelId of candidateModels) {
      try {
        const extractionResponse = await provider.generate(
          { prompt: extractionPrompt, role: 'MODEL_ROLE_CLINICAL_REASONING' },
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
      } catch {
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
    const timeoutMs = getCascadeTimeoutMs();
    const fallbackEvents: FallbackLogEntry[] = [];

    for (let i = 0; i < CASCADE_CONFIG.length; i++) {
      const currentTierConfig = CASCADE_CONFIG[i];
      const modelId = getModelIdForTier(currentTierConfig.tier);
      const nextTierConfig = i < CASCADE_CONFIG.length - 1 ? CASCADE_CONFIG[i + 1] : null;

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
>>>>>>> Stashed changes
  }
}

export const orchestrator = new AIOrchestrator();
