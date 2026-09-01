export type PrivacyLevel = 'high' | 'medium' | 'low';
export type ModelRole = 'MODEL_ROLE_CLINICAL_REASONING' | 'MODEL_ROLE_RAG_SYNTHESIS' | 'MODEL_ROLE_EDUCATIONAL';

export interface AIRequest {
  prompt: string;
  role: ModelRole;
  systemInstruction?: string;
  history?: Array<{ role: 'user' | 'model'; content: string }>;
  responseFormat?: 'text' | 'json';
}

export interface AIResponse {
  text: string;
  providerId: string;
  modelId: string;
  citations?: string[];
}

export interface AIProvider {
  id: string;
  name: string;
  generate(request: AIRequest, modelId: string): Promise<AIResponse>;
  supportsTools: boolean;
  privacyLevel: PrivacyLevel;
}

export interface ModelDefinition {
  id: string;
  provider: string; // matches AIProvider id
  privacyLevel: PrivacyLevel;
  cost: number; // 0 for free
  supportedRoles: ModelRole[];
}
