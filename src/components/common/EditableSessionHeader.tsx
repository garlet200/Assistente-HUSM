'use client';

/**
 * @file EditableSessionHeader.tsx
 * @description Cabeçalho compartilhado para sessões de Chat Clínico e Estudo, com título à esquerda
 * e botão de opções alinhado à direita acionando o ActionPopupModal.
 */

import React, { useState } from 'react';
import { MoreVertical, Files, Trash2 } from 'lucide-react';
import { ActionPopupModal } from './ActionPopupModal';

interface EditableSessionHeaderProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  onTitleCommit: (committedTitle: string) => void | Promise<void>;
  onExportSessionPdf?: () => void | Promise<void>;
  onDeleteSession?: () => void | Promise<void>;
  placeholder?: string;
  editButtonTitle?: string;
  containerStyle?: React.CSSProperties;
}

export function EditableSessionHeader({
  title,
  onTitleChange,
  onTitleCommit,
  onExportSessionPdf,
  onDeleteSession,
  placeholder = 'Nome do Caso...',
  editButtonTitle = 'Opções da Sessão',
  containerStyle,
}: EditableSessionHeaderProps) {
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--spacing-ml)',
          padding: 'var(--spacing-md) var(--spacing-lg) 0 var(--spacing-lg)',
          backgroundColor: 'transparent',
          ...containerStyle,
        }}
      >
        <h1
          style={{
            flex: 1,
            minWidth: 0,
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

        <button
          type="button"
          className="neu-button"
          onClick={() => setIsPopupOpen(true)}
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
          <MoreVertical size={18} />
        </button>
      </div>

      <ActionPopupModal
        isOpen={isPopupOpen}
        title={title}
        onClose={() => setIsPopupOpen(false)}
        editConfig={{
          actionLabel: 'Editar nome',
          fieldLabel: 'Título da sessão',
          initialValue: title,
          placeholder,
          onSave: async (committedTitle) => {
            onTitleChange(committedTitle);
            await onTitleCommit(committedTitle);
          },
        }}
        actions={[
          ...(onExportSessionPdf
            ? [
                {
                  id: 'export-session-pdf',
                  label: 'Exportar toda a conversa em PDF',
                  icon: <Files size={16} />,
                  onClick: () => onExportSessionPdf(),
                },
              ]
            : []),
          ...(onDeleteSession
            ? [
                {
                  id: 'delete-session',
                  label: 'Excluir',
                  icon: <Trash2 size={16} />,
                  variant: 'danger' as const,
                  onClick: () => onDeleteSession(),
                },
              ]
            : []),
        ]}
      />
    </>
  );
}
