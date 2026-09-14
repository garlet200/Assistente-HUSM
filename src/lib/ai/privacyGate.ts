/**
 * Privacy Gate: Sanitization and De-identification layer for LGPD compliance.
 * Protects Brazilian Personally Identifiable Information (PII) and hospital medical record numbers
 * before prompt text is transmitted to external model providers.
 */

const BRAZILIAN_CPF_PATTERN = /\d{3}\.\d{3}\.\d{3}-\d{2}/g;
const HOSPITAL_RECORD_NUMBER_PATTERN = /\b\d{5,6}\/\d{1}\b/g;
const COMMON_PATIENT_NAME_SAMPLE_PATTERN = /Paciente (Maria|João|José|Ana|Carlos) [A-Za-z]+/gi;

const HIGH_PRIVACY_TRIGGER_KEYWORD = 'sigilo absoluto';

/**
 * Replaces sensitive identifiers (CPF, Prontuário, identifiable names) with redacted placeholders.
 */
export function deIdentify(rawInputText: string): string {
  let sanitizedText = rawInputText;

  sanitizedText = sanitizedText.replace(BRAZILIAN_CPF_PATTERN, '[CPF CENSURADO]');
  sanitizedText = sanitizedText.replace(HOSPITAL_RECORD_NUMBER_PATTERN, '[PRONTUÁRIO CENSURADO]');
  sanitizedText = sanitizedText.replace(COMMON_PATIENT_NAME_SAMPLE_PATTERN, 'Paciente [NOME CENSURADO]');

  return sanitizedText;
}

/**
 * Checks whether the prompt contains explicit instructions demanding high confidentiality
 * that would require local, on-premise execution rather than cloud APIs.
 */
export function requiresHighPrivacy(promptText: string): boolean {
  const normalizedText = promptText.toLowerCase();
  return normalizedText.includes(HIGH_PRIVACY_TRIGGER_KEYWORD);
}
