'use client';

/**
 * @file Input.tsx
 * @description Campo de entrada de texto neumórfico em baixo-relevo, com suporte a rótulo
 * acessível, formato arredondado ('pill'), botão ver/esconder senha e indicador de validação.
 */

import { type InputHTMLAttributes, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import styles from './ui.module.css';

export type InputValidationState = 'valid' | 'invalid' | 'neutral';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  pill?: boolean;
  validationState?: InputValidationState;
}

function resolveInputHtmlType(
  inputType: InputHTMLAttributes<HTMLInputElement>['type'],
  isPasswordVisible: boolean
): InputHTMLAttributes<HTMLInputElement>['type'] {
  if (inputType !== 'password') {
    return inputType;
  }
  return isPasswordVisible ? 'text' : 'password';
}

function getAdornmentPaddingClass(hasPasswordToggle: boolean, hasValidationIcon: boolean): string {
  if (hasPasswordToggle && hasValidationIcon) return styles.inputWithTwoAdornments;
  if (hasPasswordToggle || hasValidationIcon) return styles.inputWithOneAdornment;
  return '';
}

export function Input({
  label,
  helperText,
  id,
  className,
  pill,
  type,
  validationState = 'neutral',
  ...props
}: InputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isPasswordField = type === 'password';
  const resolvedType = resolveInputHtmlType(type, isPasswordVisible);
  const hasValidationIcon = validationState === 'valid' || validationState === 'invalid';

  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const helperId = inputId && helperText ? `${inputId}-helper` : undefined;
  const baseInputClass = pill ? styles.inputPill : styles.input;
  const paddingClass = getAdornmentPaddingClass(isPasswordField, hasValidationIcon);

  return (
    <div className={styles.inputWrapper}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.inputFieldContainer}>
        <input
          id={inputId}
          type={resolvedType}
          aria-describedby={helperId}
          aria-invalid={validationState === 'invalid' || undefined}
          className={`${baseInputClass} ${paddingClass} ${className || ''}`.trim()}
          {...props}
        />
        {(hasValidationIcon || isPasswordField) && (
          <div className={styles.inputAdornments}>
            {validationState === 'valid' && (
              <CheckCircle2 size={16} className={styles.validationIconValid} aria-hidden="true" />
            )}
            {validationState === 'invalid' && (
              <AlertCircle size={16} className={styles.validationIconInvalid} aria-hidden="true" />
            )}
            {isPasswordField && (
              <button
                type="button"
                className={styles.passwordToggleBtn}
                onClick={() => setIsPasswordVisible((previousVisibility) => !previousVisibility)}
                aria-label={isPasswordVisible ? 'Esconder senha' : 'Ver senha'}
                title={isPasswordVisible ? 'Esconder senha' : 'Ver senha'}
              >
                {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            )}
          </div>
        )}
      </div>
      {helperText && (
        <span
          id={helperId}
          className={`${styles.helperText} ${validationState === 'invalid' ? styles.helperTextInvalid : ''}`.trim()}
        >
          {helperText}
        </span>
      )}
    </div>
  );
}
