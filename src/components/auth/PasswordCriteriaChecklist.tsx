'use client';

/**
 * @file PasswordCriteriaChecklist.tsx
 * @description Checklist neumórfico compacto que exibe em tempo real o cumprimento dos requisitos de senha.
 */

import type { CSSProperties } from 'react';
import { Check, Circle } from 'lucide-react';
import {
  evaluatePasswordCriteria,
  PASSWORD_CRITERIA_ITEMS,
} from '@/lib/utils/authValidation';

interface PasswordCriteriaChecklistProps {
  password: string;
}

const CHECKLIST_BOX_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--spacing-min)',
  padding: 'var(--spacing-min) 0',
};

const ICON_SLOT_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 'var(--spacing-md)',
  flexShrink: 0,
};

export function PasswordCriteriaChecklist({ password }: PasswordCriteriaChecklistProps) {
  const criteriaStatus = evaluatePasswordCriteria(password);

  return (
    <ul
      style={{ ...CHECKLIST_BOX_STYLE, listStyle: 'none', margin: 0 }}
      aria-label="Requisitos de senha"
    >
      {PASSWORD_CRITERIA_ITEMS.map(({ key, label }) => {
        const isCriterionMet = criteriaStatus[key];
        return (
          <li
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
              fontSize: 'var(--typography-fontsizes-caption)',
              color: isCriterionMet
                ? 'var(--color-primitive-general-succes-3)'
                : 'var(--color-semantic-text-textlight)',
              transition: 'color 150ms ease',
            }}
          >
            <span style={ICON_SLOT_STYLE} aria-hidden="true">
              {isCriterionMet ? <Check size={14} /> : <Circle size={10} />}
            </span>
            <span>{label}</span>
          </li>
        );
      })}
    </ul>
  );
}
