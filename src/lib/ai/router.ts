import { AIRequest, AIResponse, PrivacyLevel } from './types';
import { getBestModelForRole } from './registry';
import { deIdentify, requiresHighPrivacy } from './privacyGate';
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
  }
}

export const orchestrator = new AIOrchestrator();
