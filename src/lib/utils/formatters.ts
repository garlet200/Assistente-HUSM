/**
 * Shared utility helpers for date formatting and assistant response categorization.
 */

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
  if (!text) return false;
  return (
    text.includes('Aviso do Sistema:') ||
    text.includes('indisponível') ||
    text.includes('tente novamente') ||
    text.includes('aguarde alguns instantes') ||
    text.includes('alta demanda') ||
    text.includes('erro ao processar') ||
    text.includes('Erro de rede') ||
    text.includes('erro')
  );
}
