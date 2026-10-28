'use client';

/**
 * @file MultipleChoiceQuestion.tsx
 * @description Componente interativo de questão de múltipla escolha (MCQ) utilizado na
 * progressão de casos clínicos simulados do Modo Estudo.
 */

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './MultipleChoiceQuestion.module.css';

interface MultipleChoiceQuestionProps {
  question: string;
  options: string[];
  onSelectOption: (selectedOption: string) => void;
  disabled?: boolean;
}

/**
 * Interactive Multiple Choice Question (MCQ) component used during clinical case simulations in Study mode.
 */
export function MultipleChoiceQuestion({
  question,
  options,
  onSelectOption,
  disabled = false,
}: MultipleChoiceQuestionProps) {
  const [userSelectedOption, setUserSelectedOption] = useState<string | null>(null);

  const handleOptionClick = (optionText: string) => {
    setUserSelectedOption(optionText);
    onSelectOption(optionText);
  };

  return (
    <div className={styles.container}>
      <div className={styles.questionContent}>
        <ReactMarkdown>{question}</ReactMarkdown>
      </div>

      <div className={styles.optionsList}>
        {options.map((optionText, optionIndex) => {
          const isSelected = userSelectedOption === optionText;

          return (
            <button
              key={optionIndex}
              type="button"
              disabled={disabled}
              onClick={() => handleOptionClick(optionText)}
              className={`${styles.optionButton} ${isSelected ? styles.selected : ''}`}
            >
              {optionText}
            </button>
          );
        })}
      </div>
    </div>
  );
}
