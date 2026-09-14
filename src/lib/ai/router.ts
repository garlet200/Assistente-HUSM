import { AIRequest, AIResponse, PrivacyLevel, AIProvider } from './types';
import { getBestModelForRole, getFallbackModelForRole } from './registry';
import { deIdentify, requiresHighPrivacy } from './privacyGate';
import { GeminiProvider } from './providers/gemini';
import { searchPubMed } from './pubmed';

/**
 * Builds the official Assistente_HUSM system instructions for clinical reasoning.
 * Ensures the unemotional, protocol-driven persona and required disclaimer.
 */
function buildAssistenteHusmSystemInstruction(): string {
  return `Você é o "Assistente_HUSM", uma interface de raciocínio clínico e busca de evidências. Sua natureza é estritamente a de uma ferramenta de processamento de informação. Você deve operar com máxima eficiência e precisão, evitando qualquer linguagem que sugira personalidade, sentimentos, crenças ou consciência. Não use emojis em nenhuma circunstância.

TAREFAS - FUNÇÃO
Sua operação no chat livre é focada em:
1. REFERÊNCIA CONSOLIDADA: Fornecer informações minuciosas, abrangentes e diferenciais, baseadas estritamente nas fontes listadas. Não cite ou liste referências numéricas, IDs ou PMIDs no corpo do texto (as fontes serão listadas automaticamente na seção RAG).
2. SUGESTÃO DE PESQUISA: Após a resposta principal, sugira 2 a 3 tópicos de pesquisa aprofundada ou palavras-chave. IMPORTANTE: Formate CADA sugestão EXATAMENTE como um link no formato markdown apontando para "#sugestao-TEXTO", substituindo espaços no link por "%20", por exemplo: [Hipertensão na gravidez](#sugestao-Hipertensão%20na%20gravidez). Não use marcadores de lista, apenas os links.

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
"AVISO: Esta é uma ferramenta educacional e não substitui o julgamento ou o cuidado de um profissional de saúde licenciado."`;
}

/**
 * Builds user-facing friendly error responses when external API limits are exceeded.
 */
function createSystemErrorResponse(technicalErrorMessage: string, isJsonFormat: boolean): AIResponse {
  const userFacingExplanation = `⚠️ **Aviso do Sistema: Limite de Requisições Atingido**\n\nNossos servidores atingiram a capacidade máxima de processamento de IA ou o limite da base de dados.\n\nComo o Assistente_HUSM é uma ferramenta acadêmica, operamos com cotas de acesso na versão gratuita para garantir a disponibilidade. Por favor, tente novamente em alguns instantes.\n\n*(Detalhe técnico: ${technicalErrorMessage})*`;

  return {
    text: isJsonFormat
      ? JSON.stringify({ content: userFacingExplanation, isMCQ: false, options: [] })
      : userFacingExplanation,
    providerId: 'system',
    modelId: 'error-handler',
    citations: [],
  };
}

/**
 * Categorizes external API failure messages for diagnostics.
 */
function classifyApiErrorMessage(error: unknown): string {
  if (!(error instanceof Error) || !error.message) {
    return 'Erro desconhecido da API';
  }

  const errorMessage = error.message;

  if (errorMessage.includes('429') || errorMessage.includes('Quota')) {
    return 'Cota excedida na API do Gemini (Free Tier)';
  }

  if (errorMessage.includes('503') || errorMessage.includes('demand')) {
    return 'Alta demanda temporária nos servidores do Google';
  }

  return `${errorMessage.substring(0, 50)}...`;
}

/**
 * Checks whether an error is caused by rate limits or high provider traffic.
 */
function isQuotaOrRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error) || !error.message) {
    return false;
  }

  const message = error.message;
  return (
    message.includes('429') ||
    message.includes('503') ||
    message.includes('Quota') ||
    message.includes('demand')
  );
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
   */
  private async retrievePubMedContext(
    sanitizedPrompt: string,
    provider: AIProvider,
    modelIdentifier: string
  ): Promise<{ evidenceContext: string; citationList: string[] }> {
    try {
      const extractionPrompt = `Extraia os principais conceitos clínicos da seguinte pergunta e os traduza para o inglês, formando uma query booleana curta para o PubMed (ex: Myocardial Infarction AND Treatment). Retorne APENAS a string da query, sem aspas ou explicações. Pergunta: "${sanitizedPrompt}"`;

      const extractionResponse = await provider.generate(
        { prompt: extractionPrompt, role: 'MODEL_ROLE_CLINICAL_REASONING' },
        modelIdentifier
      );

      const pubmedQuery = extractionResponse.text.trim();
      const pubmedResults = await searchPubMed(pubmedQuery);

      if (pubmedResults.pmids.length === 0) {
        return { evidenceContext: '', citationList: [] };
      }

      const evidenceContext = `\n\nCONTEXTO DE EVIDÊNCIAS OBTIDAS DO PUBMED (Use estritamente estas informações se aplicável):\n${pubmedResults.context}`;
      const citationList = pubmedResults.pmids.map((article) => `PMID: ${article.id} | ${article.title}`);

      return { evidenceContext, citationList };
    } catch (pubmedError) {
      console.error('PubMed RAG retrieval failed:', pubmedError);
      return { evidenceContext: '', citationList: [] };
    }
  }

  /**
   * Main request processing entrypoint with privacy gating, RAG, and resilience fallback.
   */
  async processRequest(request: AIRequest): Promise<AIResponse> {
    const isJsonFormat = request.responseFormat === 'json';

    // 1. Privacy Gating
    const sanitizedPrompt = deIdentify(request.prompt);
    const requiresHighConfidentiality = requiresHighPrivacy(request.prompt);
    const requiredPrivacyLevel: PrivacyLevel = requiresHighConfidentiality ? 'high' : 'medium';

    // 2. Model Selection
    const selectedModel = getBestModelForRole(request.role, requiredPrivacyLevel);

    if (!selectedModel) {
      throw new Error(
        `Nenhum modelo disponível para a tarefa: ${request.role} com nível de privacidade ${requiredPrivacyLevel}`
      );
    }

    const provider = this.providers.get(selectedModel.provider);

    if (!provider) {
      console.warn(`Provedor ${selectedModel.provider} não configurado.`);
      return createSystemErrorResponse('Provedor de IA não configurado', isJsonFormat);
    }

    // 3. Evidence Augmentation (RAG)
    let pubmedContext = '';
    let pmidCitations: string[] = [];

    const isClinicalReasoningRole = request.role === 'MODEL_ROLE_CLINICAL_REASONING';
    if (isClinicalReasoningRole) {
      const { evidenceContext, citationList } = await this.retrievePubMedContext(
        sanitizedPrompt,
        provider,
        selectedModel.id
      );
      pubmedContext = evidenceContext;
      pmidCitations = citationList;
    }

    // 4. Safe Request Composition
    const safeRequest: AIRequest = {
      ...request,
      prompt: sanitizedPrompt + pubmedContext,
      systemInstruction: request.systemInstruction || buildAssistenteHusmSystemInstruction(),
    };

    // 5. Execution with Fallback
    try {
      const response = await provider.generate(safeRequest, selectedModel.id);

      if (pmidCitations.length > 0) {
        response.citations = [...(response.citations || []), ...pmidCitations];
      }

      return response;
    } catch (primaryProviderError: unknown) {
      if (isQuotaOrRateLimitError(primaryProviderError)) {
        const fallbackResponse = await this.executeFallback(
          request,
          safeRequest,
          selectedModel.id,
          requiredPrivacyLevel,
          pmidCitations
        );

        if (fallbackResponse) {
          return fallbackResponse;
        }
      }

      console.error(`Provider ${provider.name} falhou:`, primaryProviderError);
      const technicalDetail = classifyApiErrorMessage(primaryProviderError);
      return createSystemErrorResponse(technicalDetail, isJsonFormat);
    }
  }

  /**
   * Resilient fallback handler when the primary model is throttled or unavailable.
   */
  private async executeFallback(
    originalRequest: AIRequest,
    safeRequest: AIRequest,
    primaryModelId: string,
    requiredPrivacyLevel: PrivacyLevel,
    pmidCitations: string[]
  ): Promise<AIResponse | null> {
    const fallbackModel = getFallbackModelForRole(
      originalRequest.role,
      primaryModelId,
      requiredPrivacyLevel
    );

    if (!fallbackModel) {
      return null;
    }

    console.warn(`Fallback: Alternando de ${primaryModelId} para ${fallbackModel.id} devido a falha da API.`);

    try {
      const fallbackProvider = this.providers.get(fallbackModel.provider);
      if (!fallbackProvider) {
        return null;
      }

      const fallbackResponse = await fallbackProvider.generate(safeRequest, fallbackModel.id);

      const resilienceWarningText = `\n\n> ⚠️ **Modo de Resiliência Ativo:** Devido à alta demanda ou limite da cota gratuita na API principal, esta resposta foi gerada utilizando o modelo de *backup* (${fallbackModel.id}), que pode apresentar menos processamento cognitivo ou menor capacidade de raciocínio crítico em casos altamente complexos.`;

      const isJsonFormat = originalRequest.responseFormat === 'json';
      if (isJsonFormat) {
        try {
          const parsedPayload = JSON.parse(fallbackResponse.text);
          parsedPayload.content = parsedPayload.content + resilienceWarningText;
          fallbackResponse.text = JSON.stringify(parsedPayload);
        } catch {
          // Fallback to unparsed if JSON parse fails
        }
      } else {
        fallbackResponse.text = fallbackResponse.text + resilienceWarningText;
      }

      if (pmidCitations.length > 0) {
        fallbackResponse.citations = [...(fallbackResponse.citations || []), ...pmidCitations];
      }

      return fallbackResponse;
    } catch (fallbackExecutionError) {
      console.error('Fallback também falhou:', fallbackExecutionError);
      return null;
    }
  }
}

export const orchestrator = new AIOrchestrator();
