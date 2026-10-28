'use client';

/**
 * @file StudyTopicSelector.tsx
 * @description Tela inicial do Modo Estudo para seleção de especialidade médica pré-definida
 * ou digitação de um tema clínico personalizado para geração de caso simulado.
 */

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { PREDEFINED_STUDY_TOPICS } from '@/lib/constants/session';

interface StudyTopicSelectorProps {
  onSelectTopic: (topicName: string) => void;
}

/**
 * Renders the topic selection screen for starting a simulated clinical case study.
 * Allows selecting from predefined medical specialties or entering a custom topic.
 */
export function StudyTopicSelector({ onSelectTopic }: StudyTopicSelectorProps) {
  const [customTopicInput, setCustomTopicInput] = useState('');

  const trimmedCustomTopic = customTopicInput.trim();
  const isCustomTopicValid = trimmedCustomTopic.length > 0;

  const handleCustomTopicSubmit = (): void => {
    if (!isCustomTopicValid) return;
    onSelectTopic(trimmedCustomTopic);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-lg)',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
      }}
    >
      <h2
        style={{
          fontSize: 'var(--typography-fontsizes-subtitle)',
          fontWeight: 'var(--typography-fontweights-semibold)',
        }}
      >
        Selecione um Tema de Estudo
      </h2>
      <p
        style={{
          color: 'var(--color-semantic-text-textlight)',
          textAlign: 'center',
          maxWidth: '400px',
        }}
      >
        Escolha uma das especialidades abaixo ou digite um tema específico para gerar um caso
        clínico focado.
      </p>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--spacing-ml)',
          justifyContent: 'center',
          maxWidth: '500px',
        }}
      >
        {PREDEFINED_STUDY_TOPICS.map((topicName) => (
          <button
            key={topicName}
            type="button"
            onClick={() => onSelectTopic(topicName)}
            className="neu-button"
            style={{
              border: 'none',
              borderRadius: 'var(--radius-radius-full)',
              padding: 'var(--spacing-sm) var(--spacing-md)',
              cursor: 'pointer',
              color: 'var(--color-semantic-text-textdark)',
              fontWeight: 500,
              fontFamily: 'var(--typography-fontfamilies-mainsans)',
            }}
          >
            {topicName}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-ml)',
          marginTop: 'var(--spacing-md)',
          width: '100%',
          maxWidth: '400px',
        }}
      >
        <Input
          type="text"
          pill
          placeholder="Ou digite um tema (ex: Sepse)"
          value={customTopicInput}
          onChange={(event) => setCustomTopicInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              handleCustomTopicSubmit();
            }
          }}
        />
        <button
          type="button"
          onClick={handleCustomTopicSubmit}
          disabled={!isCustomTopicValid}
          className="neu-button"
          style={{
            border: 'none',
            borderRadius: 'var(--radius-radius-full)',
            width: '40px',
            height: '40px',
            flexShrink: 0,
            cursor: isCustomTopicValid ? 'pointer' : 'not-allowed',
            opacity: isCustomTopicValid ? 1 : 'var(--opacity-md)',
            color: 'var(--color-semantic-text-textdark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Iniciar com tema personalizado"
          aria-label="Iniciar com tema personalizado"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
