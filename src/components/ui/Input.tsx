/**
 * @file Input.tsx
 * @description Campo de entrada de texto neumórfico em baixo-relevo, com suporte a rótulo
 * acessível e formato arredondado ('pill') para a barra de chat.
 */

import React, { InputHTMLAttributes } from 'react';
import styles from './ui.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  pill?: boolean;
}

export function Input({ label, helperText, id, className, pill, ...props }: InputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const helperId = inputId && helperText ? `${inputId}-helper` : undefined;
  const inputClass = pill ? styles.inputPill : styles.input;

  return (
    <div className={styles.inputWrapper}>
      {label && <label htmlFor={inputId} className={styles.label}>{label}</label>}
      <input
        id={inputId}
        aria-describedby={helperId}
        className={`${inputClass} ${className || ''}`}
        {...props}
      />
      {helperText && (
        <span id={helperId} className={styles.helperText}>
          {helperText}
        </span>
      )}
    </div>
  );
}
