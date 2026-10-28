/**
 * @file gemini.ts
 * @description Adaptador do provedor Google Gemini (@google/generative-ai) responsável por
 * instanciar o modelo, injetar System Instructions e gerenciar sessões multi-turn ou single-turn.
 */

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
      generationConfig,
    });

    try {
      const hasConversationHistory = Boolean(request.history && request.history.length > 0);

      if (hasConversationHistory && request.history) {
        const chatSession = model.startChat({
          history: request.history.map((historyMessage) => ({
            role: historyMessage.role === 'model' ? 'model' : 'user',
            parts: [{ text: historyMessage.content }],
          })),
        });

        const chatResult = await chatSession.sendMessage(request.prompt);
        return {
          text: chatResult.response.text(),
          providerId: this.id,
          modelId,
          citations: [],
        };
      }

      const singlePromptResult = await model.generateContent(request.prompt);
      return {
        text: singlePromptResult.response.text(),
        providerId: this.id,
        modelId,
      };
    } catch (error: unknown) {
      console.error('Gemini Provider Error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate content: ${errorMessage}`);
    }
  }
}
