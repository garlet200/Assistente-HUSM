'use client';

/**
 * @file AiPreferencesControl.tsx
 * @description Painel de preferências de IA com dois RotaryKnobDials neumórficos independentes
 * (Teor da Linguagem e Grau de Detalhes/Extensão) e toggle reservado para Alto Contraste.
 */

import React from 'react';
import { useAuth } from '@/lib/auth';
import { RotaryKnobDial } from './RotaryKnobDial';
import styles from './AiPreferencesControl.module.css';

const LANGUAGE_LEVEL_LABELS: Record<number, string> = {
  1: '1/5 — Popular',
  2: '2/5 — Didática',
  3: '3/5 — Clínica Padrão',
  4: '4/5 — Técnica',
  5: '5/5 — Acadêmica',
};

const DETAIL_LEVEL_LABELS: Record<number, string> = {
  1: '1/5 — Síntese Rápida',
  2: '2/5 — Objetiva',
  3: '3/5 — Equilibrada',
  4: '4/5 — Detalhada',
  5: '5/5 — Extensa',
};

export function AiPreferencesControl() {
  const { user, updateUserProfile } = useAuth();
  const languageLevel = user?.aiLanguageLevel ?? 3;
  const detailLevel = user?.aiDetailLevel ?? 3;

  return (
    <div className={styles.container}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.title}>Regulação de Linguagem e Detalhe da IA</h3>
        <p className={styles.subtitle}>
          Arraste os dials para cima/baixo ou esquerda/direita para ajustar o estilo das respostas.
        </p>
      </div>

      <div className={styles.dialsGrid}>
        <RotaryKnobDial
          label="Teor da Linguagem"
          value={languageLevel}
          minLabel="Popular / Acessível"
          maxLabel="Acadêmica / Técnica"
          valueDescription={LANGUAGE_LEVEL_LABELS[languageLevel]}
          onChangeCommit={(nextLevel) => void updateUserProfile({ aiLanguageLevel: nextLevel })}
        />

        <RotaryKnobDial
          label="Grau de Detalhes"
          value={detailLevel}
          minLabel="Direta e Enxuta"
          maxLabel="Detalhada e Expandida"
          valueDescription={DETAIL_LEVEL_LABELS[detailLevel]}
          onChangeCommit={(nextLevel) => void updateUserProfile({ aiDetailLevel: nextLevel })}
        />
      </div>

      <hr className={styles.divider} />

      <div className={styles.contrastRow}>
        <div className={styles.contrastTextGroup}>
          <span className={styles.title}>Alto Contraste</span>
          <span className={styles.comingSoonTag}>Em breve</span>
        </div>

        <button
          type="button"
          disabled
          aria-label="Alto Contraste (Em breve)"
          className={styles.disabledToggleTrack}
        >
          <span className={styles.disabledToggleThumb} />
        </button>
      </div>
    </div>
  );
}
