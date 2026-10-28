/**
 * @file privacyGate.ts
 * @description Barreira de privacidade e anonimização (LGPD) que censura dados sensíveis
 * (CPF, número de prontuário e nomes de pacientes) antes do envio a provedores externos.
 */

const BRAZILIAN_CPF_PATTERN = /\d{3}\.\d{3}\.\d{3}-\d{2}/g;
const HOSPITAL_RECORD_NUMBER_PATTERN = /\b\d{5,6}\/\d{1}\b/g;
const COMMON_PATIENT_NAME_SAMPLE_PATTERN = /Paciente (Maria|João|José|Ana|Carlos) [A-Za-z]+/gi;

/**
 * Replaces sensitive identifiers (CPF, Prontuário, identifiable names) with redacted placeholders.
 */
export function deIdentify(rawInputText: string): string {
  return rawInputText
    .replace(BRAZILIAN_CPF_PATTERN, '[CPF CENSURADO]')
    .replace(HOSPITAL_RECORD_NUMBER_PATTERN, '[PRONTUÁRIO CENSURADO]')
    .replace(COMMON_PATIENT_NAME_SAMPLE_PATTERN, 'Paciente [NOME CENSURADO]');
}
