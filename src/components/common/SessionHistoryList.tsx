'use client';

/**
 * @file SessionHistoryList.tsx
 * @description Listagem compartilhada de histórico de sessões (Hub de Chat Clínico e Hub de Estudos)
 * com botão neumórfico de criação de nova sessão, menu de opções (ActionPopupModal) e estados de carregamento/vazio.
 */

import React, { useState } from 'react';
import { Plus, MoreVertical, Files, Trash2 } from 'lucide-react';
import { ActionPopupModal } from './ActionPopupModal';
import { formatTimestampToLocaleString } from '@/lib/utils/formatters';

export interface SessionSummaryItem {
  id: string;
  title: string;
  updated_at: string;
}

interface SessionHistoryListProps {
  heading: string;
  subtitle: string;
  createButtonTitle: string;
  loadingMessage: string;
  emptyMessage: string;
  isLoading: boolean;
  sessions: SessionSummaryItem[];
  onCreateNewSession: () => void;
  onSelectSession: (sessionId: string) => void;
  onRenameSession?: (sessionId: string, newTitle: string) => void | Promise<void>;
  onDeleteSession?: (sessionId: string) => void | Promise<void>;
  onExportSessionPdf?: (session: SessionSummaryItem) => void | Promise<void>;
}

export function SessionHistoryList({
  heading,
  subtitle,
  createButtonTitle,
  loadingMessage,
  emptyMessage,
  isLoading,
  sessions,
  onCreateNewSession,
  onSelectSession,
  onRenameSession,
  onDeleteSession,
  onExportSessionPdf,
}: SessionHistoryListProps) {
  const [activeMenuSession, setActiveMenuSession] = useState<SessionSummaryItem | null>(null);

  const renderSessionContent = () => {
    if (isLoading) {
      return (
        <p style={{ color: 'var(--color-semantic-text-textlight)', textAlign: 'center' }}>
          {loadingMessage}
        </p>
      );
    }

    if (sessions.length === 0) {
      return (
        <p style={{ color: 'var(--color-semantic-text-textlight)', textAlign: 'center' }}>
          {emptyMessage}
        </p>
      );
    }

    return sessions.map((session) => (
      <div
        key={session.id}
        role="button"
        tabIndex={0}
        className="neu-button"
        onClick={() => onSelectSession(session.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelectSession(session.id);
          }
        }}
        style={{
          borderRadius: 'var(--radius-radius-medium)',
          padding: 'var(--spacing-md-lg)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          textAlign: 'left',
          color: 'var(--color-semantic-text-textdark)',
          width: '100%',
          gap: 'var(--spacing-sm)',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 'var(--typography-fontweights-semibold)',
              fontSize: 'var(--typography-fontsizes-body)',
              marginBottom: 'var(--spacing-min)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {session.title}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-semantic-text-textlight)' }}>
            {formatTimestampToLocaleString(session.updated_at)}
          </div>
        </div>

        <button
          type="button"
          className="neu-button"
          onClick={(event) => {
            event.stopPropagation();
            setActiveMenuSession(session);
          }}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-radius-full)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-semantic-text-textdark)',
            flexShrink: 0,
          }}
          title="Opções da sessão"
          aria-label={`Opções para ${session.title}`}
        >
          <MoreVertical size={18} />
        </button>
      </div>
    ));
  };

  return (
    <div
      style={{
        padding: 'var(--spacing-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-lg)',
        height: '100%',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1
            style={{
              fontSize: 'var(--typography-fontsizes-subheading)',
              fontWeight: 'var(--typography-fontweights-semibold)',
              marginBottom: 'var(--spacing-sm)',
            }}
          >
            {heading}
          </h1>
          <p style={{ color: 'var(--color-semantic-text-textlight)' }}>{subtitle}</p>
        </div>

        <button
          type="button"
          className="neu-button"
          onClick={onCreateNewSession}
          style={{
            background: 'var(--color-semantic-accent-accentprimary)',
            borderRadius: 'var(--radius-radius-full)',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-primitive-mutedblue-muted-50)',
            flexShrink: 0,
          }}
          title={createButtonTitle}
          aria-label={createButtonTitle}
        >
          <Plus size={24} />
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-md)',
          marginTop: 'var(--spacing-md)',
        }}
      >
        {renderSessionContent()}
      </div>

      {activeMenuSession && (
        <ActionPopupModal
          isOpen={Boolean(activeMenuSession)}
          title={activeMenuSession.title}
          onClose={() => setActiveMenuSession(null)}
          editConfig={
            onRenameSession
              ? {
                  actionLabel: 'Editar nome',
                  fieldLabel: 'Nome da sessão',
                  initialValue: activeMenuSession.title,
                  placeholder: 'Digite o novo nome...',
                  onSave: async (newTitle) => {
                    await onRenameSession(activeMenuSession.id, newTitle);
                  },
                }
              : undefined
          }
          actions={[
            ...(onExportSessionPdf
              ? [
                  {
                    id: 'export-session-pdf',
                    label: 'Exportar toda a conversa em PDF',
                    icon: <Files size={16} />,
                    onClick: () => onExportSessionPdf(activeMenuSession),
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
                    onClick: () => onDeleteSession(activeMenuSession.id),
                  },
                ]
              : []),
          ]}
        />
      )}
    </div>
  );
}
