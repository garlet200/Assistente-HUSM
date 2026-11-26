/**
 * @file Card.tsx
 * @description Contêiner de superfície neumórfica com suporte a elevação externa ('out')
 * ou baixo-relevo ('in').
 */

import React, { HTMLAttributes } from 'react';
import styles from './ui.module.css';

export type CardElevation = 'large' | 'medium' | 'flat';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'out' | 'in';
  elevation?: CardElevation;
  children: React.ReactNode;
}

const ELEVATION_CLASS_MAP: Readonly<Record<CardElevation, string>> = {
  large: '',
  medium: styles.cardMedium,
  flat: styles.cardFlat,
};

export function Card({
  variant = 'out',
  elevation = 'large',
  children,
  className,
  ...props
}: CardProps) {
  const classNames = [
    variant === 'out' ? styles.card : styles.cardInset,
    variant === 'out' ? ELEVATION_CLASS_MAP[elevation] : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames} {...props}>
      {children}
    </div>
  );
}
