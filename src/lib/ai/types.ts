/**
 * @file types.ts
 * @description Contratos e interfaces TypeScript centrais do subsistema de Inteligência Artificial
 * (requisições, respostas, papéis de modelo, histórico e provedores).
 */

import { ModelTier, ReliabilityLevel } from './cascadeConfig';
import { FallbackLogEntry } from './analytics';

export type PrivacyLevel = 'high' | 'medium' | 'low';
export type ModelRole =
  | 'MODEL_ROLE_CLINICAL_REASONING'
  | 'MODEL_ROLE_RAG_SYNTHESIS'
  | 'MODEL_ROLE_EDUCATIONAL';

export interface AIRequestHistoryMessage {
  role: 'user' | 'model';
  content: string;
}

export interface AIRequest {
  prompt: string;
  role: ModelRole;
  systemInstruction?: string;
  history?: AIRequestHistoryMessage[];
  responseFormat?: 'text' | 'json';
}

export interface AIResponse {
  text: string;
  providerId: string;
  modelId: string;
  citations?: string[];
  reliability?: ReliabilityLevel;
  modelTier?: ModelTier;
  displayName?: string;
  fallbackEvents?: FallbackLogEntry[];
}

export interface AIProvider {
  id: string;
  name: string;
  generate(request: AIRequest, modelId: string): Promise<AIResponse>;
  supportsTools: boolean;
  privacyLevel: PrivacyLevel;
}
