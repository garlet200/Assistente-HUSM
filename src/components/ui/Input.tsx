import React, { InputHTMLAttributes } from 'react';
import styles from './ui.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  pill?: boolean;
}

export function Input({ label, id, className, pill, ...props }: InputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const inputClass = pill ? styles.inputPill : styles.input;
  
  return (
    <div className={styles.inputWrapper}>
      {label && <label htmlFor={inputId} className={styles.label}>{label}</label>}
      <input 
        id={inputId}
        className={`${inputClass} ${className || ''}`}
        {...props}
      />
    </div>
  );
}
