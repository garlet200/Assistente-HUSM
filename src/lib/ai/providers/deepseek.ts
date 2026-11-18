/**
 * @file deepseek.ts
 * @description Adaptador do provedor DeepSeek (API compatível com OpenAI) atuando como contingência final,
 * com limite de tokens de saída por requisição (`max_tokens`) e teto acumulado diário de tokens.
 */

import { DEEPSEEK_TOKEN_LIMITS } from '../cascadeConfig';
import { AIProvider, AIRequest, AIResponse } from '../types';

interface DeepSeekChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekApiResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    total_tokens?: number;
  };
}

function getCurrentUtcDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function resolveApiModelIdentifier(modelId: string): string {
  return modelId === 'deepseek-flash' ? 'deepseek-chat' : modelId;
}

function stripMarkdownJsonFences(rawText: string): string {
  return rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function estimateFallbackTokens(messages: DeepSeekChatMessage[], outputText: string): number {
  const totalChars =
    messages.reduce((sum, message) => sum + message.content.length, 0) + outputText.length;
  return Math.ceil(totalChars / 4);
}

export class DeepSeekProvider implements AIProvider {
  id = 'deepseek';
  name = 'DeepSeek';
  supportsTools = false;
  privacyLevel = 'medium' as const;

  private apiKey: string;
  private currentDayKey: string = getCurrentUtcDayKey();
  private dailyTokensUsed = 0;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private resetCounterIfNewDay(): void {
    const todayKey = getCurrentUtcDayKey();
    if (todayKey !== this.currentDayKey) {
      this.currentDayKey = todayKey;
      this.dailyTokensUsed = 0;
    }
  }

  private assertWithinDailyTokenBudget(): void {
    this.resetCounterIfNewDay();
    if (this.dailyTokensUsed >= DEEPSEEK_TOKEN_LIMITS.maxDailyTotalTokens) {
      throw new Error(
        `QUOTA_OR_RATE_LIMIT_EXCEEDED: Limite diário de tokens do DeepSeek atingido (${this.dailyTokensUsed}/${DEEPSEEK_TOKEN_LIMITS.maxDailyTotalTokens})`
      );
    }
  }

  private buildMessagesPayload(request: AIRequest): DeepSeekChatMessage[] {
    const messages: DeepSeekChatMessage[] = [];

    if (request.systemInstruction) {
      messages.push({ role: 'system', content: request.systemInstruction });
    }

    if (request.history && request.history.length > 0) {
      for (const historyItem of request.history) {
        messages.push({
          role: historyItem.role === 'model' ? 'assistant' : 'user',
          content: historyItem.content,
        });
      }
    }

    messages.push({ role: 'user', content: request.prompt });
    return messages;
  }

  async generate(request: AIRequest, modelId: string): Promise<AIResponse> {
    this.assertWithinDailyTokenBudget();

    const messages = this.buildMessagesPayload(request);
    const requestPayload: Record<string, unknown> = {
      model: resolveApiModelIdentifier(modelId),
      messages,
      max_tokens: DEEPSEEK_TOKEN_LIMITS.maxOutputTokensPerRequest,
    };

    if (request.responseFormat === 'json') {
      requestPayload.response_format = { type: 'json_object' };
    }

    const httpResponse = await fetch(DEEPSEEK_TOKEN_LIMITS.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestPayload),
      signal: request.abortSignal,
    });

    if (!httpResponse.ok) {
      const errorBody = await httpResponse.text().catch(() => '');
      throw new Error(`DeepSeek API HTTP ${httpResponse.status}: ${errorBody}`);
    }

    const responseJson = (await httpResponse.json()) as DeepSeekApiResponse;
    const rawContent = responseJson.choices?.[0]?.message?.content?.trim();

    if (!rawContent) {
      throw new Error('DeepSeek API retornou resposta vazia.');
    }

    const tokensConsumed =
      typeof responseJson.usage?.total_tokens === 'number'
        ? responseJson.usage.total_tokens
        : estimateFallbackTokens(messages, rawContent);

    this.dailyTokensUsed += tokensConsumed;

    const normalizedText =
      request.responseFormat === 'json' ? stripMarkdownJsonFences(rawContent) : rawContent;

    return {
      text: normalizedText,
      providerId: this.id,
      modelId,
      citations: [],
    };
  }
}
