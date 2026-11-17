'use client';

/**
 * @file ActionPopupModal.tsx
 * @description Popup neumórfico reutilizável sem borda ou sombra externa no container,
 * com fundo borrado (exceto BottomNav), confirmação obrigatória para ações destrutivas e edição inline.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Edit, Check, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import styles from './ActionPopupModal.module.css';

export interface ActionPopupItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger';
  onClick: () => void | Promise<void>;
}

export interface ActionPopupEditConfig {
  actionLabel: string;
  fieldLabel: string;
  initialValue: string;
  secondaryFieldLabel?: string;
  secondaryInitialValue?: string;
  multiline?: boolean;
  placeholder?: string;
  onSave: (primaryValue: string, secondaryValue?: string) => void | Promise<void>;
}

interface ActionPopupModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  actions?: ActionPopupItem[];
  exportActions?: ActionPopupItem[];
  editConfig?: ActionPopupEditConfig;
}

function InlineEditView({
  editConfig,
  onCancelEdit,
  onCloseModal,
}: {
  editConfig: ActionPopupEditConfig;
  onCancelEdit: () => void;
  onCloseModal: () => void;
}) {
  const [primaryValue, setPrimaryValue] = useState(editConfig.initialValue);
  const [secondaryValue, setSecondaryValue] = useState(editConfig.secondaryInitialValue ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (): Promise<void> => {
    if (!primaryValue.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await editConfig.onSave(primaryValue.trim(), secondaryValue.trim());
      onCloseModal();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.actionList}>
      {editConfig.multiline ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          <label className={styles.sectionLabel}>{editConfig.fieldLabel}</label>
          <textarea
            className={`neu-input ${styles.textareaField}`}
            value={primaryValue}
            onChange={(event) => setPrimaryValue(event.target.value)}
            placeholder={editConfig.placeholder}
          />
        </div>
      ) : (
        <Input
          label={editConfig.fieldLabel}
          value={primaryValue}
          onChange={(event) => setPrimaryValue(event.target.value)}
          placeholder={editConfig.placeholder}
        />
      )}

      {editConfig.secondaryFieldLabel !== undefined && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          <label className={styles.sectionLabel}>{editConfig.secondaryFieldLabel}</label>
          <textarea
            className={`neu-input ${styles.textareaField}`}
            value={secondaryValue}
            onChange={(event) => setSecondaryValue(event.target.value)}
          />
        </div>
      )}

      <div className={styles.editActionsRow}>
        <button
          type="button"
          className={`neu-button ${styles.actionButton}`}
          style={{ flex: 1, justifyContent: 'center' }}
          onClick={onCancelEdit}
          disabled={isSaving}
        >
          Cancelar
        </button>
        <button
          type="button"
          className={`neu-button ${styles.actionButton}`}
          style={{ flex: 1, justifyContent: 'center', color: 'var(--color-semantic-accent-accentprimary)' }}
          onClick={() => void handleSave()}
          disabled={!primaryValue.trim() || isSaving}
        >
          <Check size={16} />
          <span>{isSaving ? 'Salvando...' : 'Salvar'}</span>
        </button>
      </div>
    </div>
  );
}

function DangerConfirmView({
  pendingAction,
  onCancel,
  onCloseModal,
}: {
  pendingAction: ActionPopupItem;
  onCancel: () => void;
  onCloseModal: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async (): Promise<void> => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await pendingAction.onClick();
      onCloseModal();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.actionList}>
      <p className={styles.confirmMessage}>
        Tem certeza que deseja excluir esta sessão permanentemente? Esta ação não pode ser desfeita.
      </p>
      <div className={styles.editActionsRow}>
        <button
          type="button"
          className={`neu-button ${styles.actionButton}`}
          style={{ flex: 1, justifyContent: 'center' }}
          onClick={onCancel}
          disabled={isDeleting}
        >
          Cancelar
        </button>
        <button
          type="button"
          className={`neu-button ${styles.actionButton} ${styles.dangerAction}`}
          style={{ flex: 1, justifyContent: 'center' }}
          onClick={() => void handleConfirmDelete()}
          disabled={isDeleting}
        >
          <Trash2 size={16} />
          <span>{isDeleting ? 'Excluindo...' : 'Excluir'}</span>
        </button>
      </div>
    </div>
  );
}

export function ActionPopupModal({
  isOpen,
  title,
  onClose,
  actions = [],
  exportActions = [],
  editConfig,
}: ActionPopupModalProps) {
  const [isEditingInline, setIsEditingInline] = useState(false);
  const [pendingDangerAction, setPendingDangerAction] = useState<ActionPopupItem | null>(null);

  const handleCloseModal = useCallback((): void => {
    setIsEditingInline(false);
    setPendingDangerAction(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') handleCloseModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleCloseModal]);

  if (!isOpen) return null;

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) handleCloseModal();
  };

  const renderActionItem = (actionItem: ActionPopupItem) => (
    <button
      key={actionItem.id}
      type="button"
      className={`neu-button ${styles.actionButton} ${
        actionItem.variant === 'danger' ? styles.dangerAction : ''
      }`}
      onClick={async () => {
        if (actionItem.variant === 'danger') {
          setPendingDangerAction(actionItem);
          return;
        }
        await actionItem.onClick();
        handleCloseModal();
      }}
    >
      {actionItem.icon}
      <span>{actionItem.label}</span>
    </button>
  );

  const hasPrimaryItems = Boolean(editConfig) || actions.length > 0;

  const renderBody = () => {
    if (pendingDangerAction) {
      return (
        <DangerConfirmView
          pendingAction={pendingDangerAction}
          onCancel={() => setPendingDangerAction(null)}
          onCloseModal={handleCloseModal}
        />
      );
    }

    if (isEditingInline && editConfig) {
      return (
        <InlineEditView
          editConfig={editConfig}
          onCancelEdit={() => setIsEditingInline(false)}
          onCloseModal={handleCloseModal}
        />
      );
    }

    return (
      <div className={styles.actionList}>
        {editConfig && (
          <button
            type="button"
            className={`neu-button ${styles.actionButton}`}
            onClick={() => setIsEditingInline(true)}
          >
            <Edit size={16} />
            <span>{editConfig.actionLabel}</span>
          </button>
        )}

        {actions.map(renderActionItem)}

        {exportActions.length > 0 && hasPrimaryItems && (
          <>
            <hr className={styles.sectionDivider} />
            <p className={styles.sectionLabel}>Exportar</p>
          </>
        )}

        {exportActions.map(renderActionItem)}
      </div>
    );
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={title} className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.popupContainer}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button
            type="button"
            className={`neu-button ${styles.closeButton}`}
            onClick={handleCloseModal}
            title="Fechar"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>
        <hr className={styles.sectionDivider} />
        {renderBody()}
      </div>
    </div>
  );
}
