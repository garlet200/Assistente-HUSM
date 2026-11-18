/**
 * @file authValidation.ts
 * @description Utilitários centralizados de validação em tempo real de nome, e-mail,
 * critérios de senha forte e detecção de parâmetros de recuperação de senha na URL.
 */

const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const UPPERCASE_REGEX = /[A-Z]/;
const LOWERCASE_REGEX = /[a-z]/;
const NUMBER_REGEX = /[0-9]/;
const SYMBOL_REGEX = /[^A-Za-z0-9]/;

export const USER_NAME_MIN_LENGTH = 2;

export interface PasswordCriteriaStatus {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  isAllValid: boolean;
}

export type PasswordCriterionKey = keyof Omit<PasswordCriteriaStatus, 'isAllValid'>;

export const PASSWORD_CRITERIA_ITEMS: ReadonlyArray<{
  key: PasswordCriterionKey;
  label: string;
}> = [
  { key: 'minLength', label: 'Mínimo de 8 caracteres' },
  { key: 'hasUppercase', label: 'Pelo menos 1 letra maiúscula' },
  { key: 'hasLowercase', label: 'Pelo menos 1 letra minúscula' },
  { key: 'hasNumber', label: 'Pelo menos 1 número' },
  { key: 'hasSymbol', label: 'Pelo menos 1 símbolo (ex: !@#$%)' },
];

export function isValidUserName(fullName: string): boolean {
  return fullName.trim().length >= USER_NAME_MIN_LENGTH;
}

export function isValidEmailFormat(email: string): boolean {
  return EMAIL_FORMAT_REGEX.test(email.trim());
}

export function evaluatePasswordCriteria(password: string): PasswordCriteriaStatus {
  const minLength = password.length >= PASSWORD_MIN_LENGTH;
  const hasUppercase = UPPERCASE_REGEX.test(password);
  const hasLowercase = LOWERCASE_REGEX.test(password);
  const hasNumber = NUMBER_REGEX.test(password);
  const hasSymbol = SYMBOL_REGEX.test(password);

  return {
    minLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSymbol,
    isAllValid: minLength && hasUppercase && hasLowercase && hasNumber && hasSymbol,
  };
}

export function hasRecoveryUrlSignal(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.location.search.includes('type=recovery') ||
    window.location.hash.includes('type=recovery')
  );
}
