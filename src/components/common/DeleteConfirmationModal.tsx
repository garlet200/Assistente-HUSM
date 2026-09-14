'use client';

import React from 'react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmButtonLabel?: string;
  cancelButtonLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal dialog to confirm destructive deletion actions across chat and study sessions.
 * Extracted to ensure unified styling, accessible UX, and zero visual code duplication.
 */
export function DeleteConfirmationModal({
  isOpen,
  title,
  description,
  confirmButtonLabel = 'Excluir',
  cancelButtonLabel = 'Não excluir',
  onConfirm,
  onCancel,
}: DeleteConfirmationModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
          padding: 'var(--spacing-xl)',
          borderRadius: '24px',
          boxShadow: 'var(--shadow-extruded-large)',
          maxWidth: '400px',
          width: '90%',
          textAlign: 'center',
        }}
      >
        <h3
          id="delete-dialog-title"
          style={{
            margin: '0 0 var(--spacing-md) 0',
            color: 'var(--color-semantic-text-textdark)',
          }}
        >
          {title}
        </h3>

        <p
          style={{
            margin: '0 0 var(--spacing-xl) 0',
            color: 'var(--color-semantic-text-textlight)',
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>

        <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'center' }}>
          <button
            type="button"
            className="neu-button"
            onClick={onCancel}
            style={{
              background: 'var(--color-semantic-backgroundcolor-backgrounddimmer)',
              padding: 'var(--spacing-sm) var(--spacing-lg)',
              borderRadius: '999px',
              fontWeight: 600,
              color: 'var(--color-semantic-text-textdark)',
            }}
          >
            {cancelButtonLabel}
          </button>

          <button
            type="button"
            className="neu-button"
            onClick={onConfirm}
            style={{
              background: 'var(--color-semantic-status-error)',
              padding: 'var(--spacing-sm) var(--spacing-lg)',
              borderRadius: '999px',
              fontWeight: 600,
              color: 'var(--color-primitive-white)',
            }}
          >
            {confirmButtonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
