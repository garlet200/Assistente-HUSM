/**
 * @file session.ts
 * @description Constantes de domínio compartilhadas entre sessões de Chat Clínico e Modo Estudo
 * (chaves de sessionStorage, títulos padrão, tópicos pré-definidos e limiares de UI).
 */

export const SESSION_STORAGE_KEYS = {
  ACTIVE_CHAT_ID: 'activeChatId',
  ACTIVE_STUDY_ID: 'activeStudyId',
} as const;

export const DEFAULT_SESSION_TITLES = {
  NEW_CHAT: 'Novo Caso Clínico',
  CHAT_FALLBACK: 'Caso Clínico',
  STUDY_DEFAULT: 'Sessão de Estudo',
  NEW_STUDY: 'Nova Sessão de Estudo',
} as const;

export const STUDY_TOPIC_PROMPT_PREFIX = 'Quero estudar sobre: ';
export const STUDY_TITLE_PREFIX_REGEX = /^Estudo:\s*/;
export const STUDY_ERROR_MESSAGE_ID_PREFIX = 'study-error';

export const PREDEFINED_STUDY_TOPICS: readonly string[] = [
  'Cardiologia',
  'Neurologia',
  'Pediatria',
  'Infectologia',
  'Terapia Intensiva',
];

/**
 * Institutional ethical guidelines displayed during first-access onboarding and in the "Sobre o MedHUSM" modal.
 */
export const ETHICAL_GUIDELINE_ITEMS: readonly string[] = [
  'Não insira dados identificáveis (nomes, CPFs) de pacientes reais.',
  'Todas as respostas geradas devem ser verificadas usando o RAG ou literatura oficial.',
  'O sistema monitora casos para fins educacionais e de auditoria.',
];

export const CHAT_TITLE_MAX_PREVIEW_LENGTH = 50;
export const SCROLL_BOTTOM_THRESHOLD_PX = 50;
export const INPUT_FOCUS_DELAY_MS = 50;
export const AUTO_SCROLL_DELAY_MS = 100;
