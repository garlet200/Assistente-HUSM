'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', margin: '8px 0' }}>
      <p style={{ fontWeight: 600, fontFamily: 'var(--typography-fontfamilies-mainsans)' }}>
        {question}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-ml)' }}>
        {options.map((optionText, optionIndex) => {
          const isSelected = userSelectedOption === optionText;

          return (
            <Button
              key={optionIndex}
              variant={isSelected ? 'primary' : 'default'}
              disabled={disabled}
              onClick={() => handleOptionClick(optionText)}
              style={{
                justifyContent: 'flex-start',
                textAlign: 'left',
                padding: 'var(--spacing-ml) var(--spacing-md)',
                fontFamily: 'var(--typography-fontfamilies-mainsans)',
                lineHeight: '1.4',
              }}
            >
              {optionText}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export default MultipleChoiceQuestion;
