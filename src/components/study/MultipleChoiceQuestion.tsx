'use client';
import React, { useState } from 'react';
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
 * Styled with decreased neumorphic depth for options and high-readability serif typography for questions.
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
      {/* Question / Clinical Case content styled with Plex Serif matching chat bubbles */}
      <div className={styles.questionContent}>
        <ReactMarkdown>{question}</ReactMarkdown>
      </div>

      {/* Multiple-choice option cards with decreased neumorphic elevation */}
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

export default MultipleChoiceQuestion;
