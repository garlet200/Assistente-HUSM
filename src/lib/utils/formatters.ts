/**
 * @file formatters.ts
 * @description Funções utilitárias de formatação de datas (pt-BR), mensagens padrão de
 * indisponibilidade do sistema e detecção de respostas passíveis de retentativa (retry).
 */

export const ASSISTANT_UNAVAILABLE_MESSAGE =
  'O assistente está temporariamente indisponível devido à alta demanda nos servidores de processamento. Por favor, aguarde alguns instantes e tente novamente.';

const RETRYABLE_ERROR_SUBSTRINGS: readonly string[] = [
  'Aviso do Sistema:',
  'indisponível',
  'tente novamente',
  'aguarde alguns instantes',
  'alta demanda',
  'erro ao processar',
  'Erro de rede',
  'erro',
];

/**
 * Formats an ISO date string into Brazilian Portuguese short date and time (e.g. "14 de set., 18:30").
 */
export function formatTimestampToLocaleString(dateString: string): string {
  const dateObject = new Date(dateString);

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObject);
}

/**
 * Detects whether the response message content represents a system error or temporary service unavailability,
 * requiring a retry button to be displayed for the user.
 */
export function isRetryableResponse(text: string | null | undefined): boolean {
  if (!text) {
    return false;
  }

  return RETRYABLE_ERROR_SUBSTRINGS.some((pattern) => text.includes(pattern));
}
