/**
 * @file Button.tsx
 * @description Componente atômico de botão neumórfico (variantes 'default' e 'primary')
 * construído sobre os tokens visuais do Design System.
 */

import React, { ButtonHTMLAttributes } from 'react';
import styles from './ui.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'default';
  children: React.ReactNode;
}

export function Button({ variant = 'default', children, className, ...props }: ButtonProps) {
  const classNames = [
    styles.button,
    variant === 'primary' ? styles.primary : '',
    className || ''
  ].filter(Boolean).join(' ');

  return (
    <button className={classNames} {...props}>
      {children}
    </button>
  );
}
