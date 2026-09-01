import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider, AIRequest, AIResponse } from '../types';

export class GeminiProvider implements AIProvider {
  id = 'gemini';
  name = 'Google Gemini';
  supportsTools = true;
  privacyLevel = 'medium' as const;

  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generate(request: AIRequest, modelId: string): Promise<AIResponse> {
    const generationConfig: Record<string, unknown> = {};
    if (request.responseFormat === 'json') {
      generationConfig.responseMimeType = 'application/json';
    }

    const model = this.genAI.getGenerativeModel({ 
      model: modelId,
      systemInstruction: request.systemInstruction,
      generationConfig
    });

    try {
      if (request.history && request.history.length > 0) {
        // Chat mode
        const chat = model.startChat({
          history: request.history.map(msg => ({
            role: msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          })),
        });
        const result = await chat.sendMessage(request.prompt);
        return {
          text: result.response.text(),
          providerId: this.id,
          modelId: modelId,
          citations: ['Protocolo IAM HUSM 2024'] // Mocked RAG citation for demonstration
        };
      } else {
        // Single prompt mode
        const result = await model.generateContent(request.prompt);
        return {
          text: result.response.text(),
          providerId: this.id,
          modelId: modelId,
        };
      }
    } catch (error: unknown) {
      console.error('Gemini Provider Error:', error);
      throw new Error(`Failed to generate content: ${(error as Error).message}`);
    }
  }
}
