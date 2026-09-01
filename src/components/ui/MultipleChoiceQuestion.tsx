'use client';

import { useState } from 'react';
import { Button } from './Button';

interface MCQProps {
  question: string;
  options: string[];
  onSelect: (option: string) => void;
  disabled?: boolean;
}

export function MultipleChoiceQuestion({ question, options, onSelect, disabled }: MCQProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (option: string) => {
    setSelected(option);
    onSelect(option);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', margin: '8px 0' }}>
      <p style={{ fontWeight: 600, fontFamily: 'var(--typography-fontfamilies-mainsans)' }}>{question}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-ml)' }}>
        {options.map((option, index) => (
          <Button
            key={index}
            variant={selected === option ? 'primary' : 'default'}
            disabled={disabled}
            onClick={() => handleSelect(option)}
            style={{
              justifyContent: 'flex-start',
              textAlign: 'left',
              padding: 'var(--spacing-ml) var(--spacing-md)',
              fontFamily: 'var(--typography-fontfamilies-mainsans)',
              lineHeight: '1.4'
            }}
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  );
}
