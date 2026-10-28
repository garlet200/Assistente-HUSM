'use client';

/**
 * @file SessionHistoryList.tsx
 * @description Listagem compartilhada de histórico de sessões (Hub de Chat Clínico e Hub de Estudos)
 * com botão neumórfico de criação de nova sessão e estados de carregamento/vazio.
 */

import { Plus, ChevronRight } from 'lucide-react';
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
}

/**
 * Shared hub view displaying a header with a neumorphic "New" action button
 * and a chronological list of saved clinical chat or study sessions.
 */
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
}: SessionHistoryListProps) {
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
      <button
        key={session.id}
        type="button"
        className="neu-button"
        onClick={() => onSelectSession(session.id)}
        style={{
          borderRadius: 'var(--radius-radius-medium)',
          padding: 'var(--spacing-md-lg)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          textAlign: 'left',
          color: 'var(--color-semantic-text-textdark)',
          width: '100%',
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 'var(--typography-fontweights-semibold)',
              fontSize: 'var(--typography-fontsizes-body)',
              marginBottom: 'var(--spacing-min)',
            }}
          >
            {session.title}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-semantic-text-textlight)' }}>
            {formatTimestampToLocaleString(session.updated_at)}
          </div>
        </div>
        <div style={{ color: 'var(--color-semantic-accent-accentprimary)' }}>
          <ChevronRight size={20} />
        </div>
      </button>
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
    </div>
  );
}
