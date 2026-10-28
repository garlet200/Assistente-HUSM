'use client';

/**
 * @file EditableSessionHeader.tsx
 * @description Cabeçalho compartilhado com edição inline de título para sessões de Chat Clínico e Estudo.
 */

import React, { useState, useRef } from 'react';
import { Edit } from 'lucide-react';
import { INPUT_FOCUS_DELAY_MS } from '@/lib/constants/session';

interface EditableSessionHeaderProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  onTitleCommit: (committedTitle: string) => void;
  placeholder?: string;
  editButtonTitle?: string;
  containerStyle?: React.CSSProperties;
}

/**
 * Shared editable title header bar used across Clinical Chat and Case Study sessions.
 */
export function EditableSessionHeader({
  title,
  onTitleChange,
  onTitleCommit,
  placeholder = 'Nome do Caso...',
  editButtonTitle = 'Editar Nome do Caso',
  containerStyle,
}: EditableSessionHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputElementRef = useRef<HTMLInputElement>(null);

  const enableTitleEditingMode = () => {
    setIsEditingTitle(true);
    setTimeout(() => {
      titleInputElementRef.current?.focus();
    }, INPUT_FOCUS_DELAY_MS);
  };

  const commitTitleEdit = (valueToCommit: string) => {
    setIsEditingTitle(false);
    onTitleCommit(valueToCommit);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-ml)',
        padding: 'var(--spacing-md) var(--spacing-lg) 0 var(--spacing-lg)',
        backgroundColor: 'transparent',
        ...containerStyle,
      }}
    >
      <button
        type="button"
        className="neu-button"
        onClick={enableTitleEditingMode}
        style={{
          borderRadius: 'var(--radius-radius-full)',
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-semantic-text-textlight)',
          flexShrink: 0,
        }}
        title={editButtonTitle}
        aria-label={editButtonTitle}
      >
        <Edit size={18} />
      </button>

      {isEditingTitle ? (
        <input
          ref={titleInputElementRef}
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          onBlur={(event) => commitTitleEdit(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commitTitleEdit(event.currentTarget.value);
            }
          }}
          placeholder={placeholder}
          style={{
            fontSize: '1.2rem',
            fontWeight: 'var(--typography-fontweights-semibold)',
            color: 'var(--color-semantic-text-textdark)',
            background: 'transparent',
            border: 'none',
            borderBottom: 'var(--strokewidth-md) solid var(--color-semantic-text-textlight)',
            width: '100%',
            fontFamily: 'var(--typography-fontfamilies-mainsans)',
          }}
        />
      ) : (
        <h1
          style={{
            fontSize: '1.2rem',
            fontWeight: 'var(--typography-fontweights-semibold)',
            color: 'var(--color-semantic-text-textdark)',
            fontFamily: 'var(--typography-fontfamilies-mainsans)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </h1>
      )}
    </div>
  );
}
