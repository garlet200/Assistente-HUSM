import React, { HTMLAttributes } from 'react';
import styles from './ui.module.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'out' | 'in';
  children: React.ReactNode;
}

export function Card({ variant = 'out', children, className, ...props }: CardProps) {
  const classNames = [
    variant === 'out' ? styles.card : styles.cardInset,
    className || ''
  ].filter(Boolean).join(' ');

  return (
    <div className={classNames} {...props}>
      {children}
    </div>
  );
}
