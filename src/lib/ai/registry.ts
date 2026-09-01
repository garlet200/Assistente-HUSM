import { ModelDefinition } from './types';

export const ModelRegistry: ModelDefinition[] = [
  {
    id: 'gemini-3.5-flash',
    provider: 'gemini',
    privacyLevel: 'medium',
    cost: 0, // treating as free for now based on free tier
    supportedRoles: ['MODEL_ROLE_CLINICAL_REASONING', 'MODEL_ROLE_RAG_SYNTHESIS', 'MODEL_ROLE_EDUCATIONAL']
  },
  {
    id: 'gemini-3.5-flash-lite',
    provider: 'gemini',
    privacyLevel: 'medium',
    cost: 0,
    supportedRoles: ['MODEL_ROLE_RAG_SYNTHESIS']
  },
  {
    id: 'llama3-8b-local',
    provider: 'local',
    privacyLevel: 'high',
    cost: 0,
    supportedRoles: ['MODEL_ROLE_CLINICAL_REASONING', 'MODEL_ROLE_RAG_SYNTHESIS']
  }
];

export function getBestModelForRole(role: string, requiredPrivacy: string = 'medium'): ModelDefinition | null {
  // Simple Free-First Router logic:
  // Order: Privacy > Cost > Capabilities
  
  const suitableModels = ModelRegistry.filter(m => 
    m.supportedRoles.includes(role as any)
  );

  // Filter by privacy
  const privacyFiltered = suitableModels.filter(m => {
    if (requiredPrivacy === 'high') return m.privacyLevel === 'high';
    return true; // if medium/low is required, all are fine (assuming high is better)
  });

  if (privacyFiltered.length === 0) return null;

  // Sort by cost (0 first)
  privacyFiltered.sort((a, b) => a.cost - b.cost);

  return privacyFiltered[0];
}
