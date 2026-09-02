import { AIRequest, AIResponse, PrivacyLevel } from './types';
import { getBestModelForRole } from './registry';
import { deIdentify, requiresHighPrivacy } from './privacyGate';
import { GeminiProvider } from './providers/gemini';

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
    
    const generateMockResponse = (prompt: string): AIResponse => ({
      text: `[Fallback Local - Protótipo] Resposta simulada para sua análise clínica baseada em: "${prompt}". No aplicativo real com acesso à API do Gemini ou servidor local LLaMA, o raciocínio diagnóstico e sugestões reais apareceriam aqui.\n\nA conduta recomendada segue os últimos guidelines da AHA/ACC e SBC para manejo desta condição.`,
      providerId: 'mock',
      modelId: 'mock-model',
      citations: ['Diretrizes Brasileiras - SBC 2024', 'AHA/ACC Clinical Guidelines']
    });

    if (!provider) {
      console.warn(`Provedor ${bestModel.provider} não configurado. Utilizando fallback local.`);
      return generateMockResponse(sanitizedPrompt);
    }

    // Update request with sanitized prompt and system instructions
    const safeRequest: AIRequest = {
      ...request,
      prompt: sanitizedPrompt,
      systemInstruction: request.systemInstruction || 'Você é o MedHUSM, um assistente de raciocínio clínico para profissionais de saúde e estudantes. Responda de forma extremamente sucinta, direta e objetiva, baseada em diretrizes médicas atuais. Não utilize emojis em nenhuma circunstância. Evite o uso excessivo de formatação Markdown (use negrito apenas para o estritamente necessário). Não prescreva receitas, apenas auxilie no diagnóstico diferencial, manejo e estudos. Nunca forneça respostas perigosas ou que vão contra a ética médica.'
    };

    // 3. Provider Execution
    try {
      const response = await provider.generate(safeRequest, bestModel.id);
      return response;
    } catch (error: unknown) {
      console.error(`Provider ${provider.name} falhou. Utilizando fallback local.`);
      return generateMockResponse(sanitizedPrompt);
    }
  }
}

export const orchestrator = new AIOrchestrator();
