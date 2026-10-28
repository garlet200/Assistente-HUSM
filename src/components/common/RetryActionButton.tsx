'use client';

/**
 * @file RetryActionButton.tsx
 * @description Botão compartilhado de retentativa ("Tentar novamente") exibido quando ocorre
 * indisponibilidade temporária ou falha de rede tanto no Chat Clínico quanto no Modo Estudo.
 */

import { RotateCcw } from 'lucide-react';

interface RetryActionButtonProps {
  onRetry: () => void;
  label?: string;
}

/**
 * Renders the standardized retry action button inside chat or study cards when an AI request fails.
 */
export function RetryActionButton({
  onRetry,
  label = 'Tentar novamente',
}: RetryActionButtonProps) {
  return (
    <div style={{ marginTop: 'var(--spacing-md)' }}>
      <button
        type="button"
        onClick={onRetry}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          background: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
          border: 'var(--strokewidth-min) solid var(--color-semantic-boxshadow-boxshadowfxdark)',
          borderRadius: 'var(--radius-radius-medium)',
          padding: 'var(--spacing-sm) var(--spacing-md)',
          color: 'var(--color-semantic-text-textdark)',
          cursor: 'pointer',
          fontWeight: 'var(--typography-fontweights-semibold)',
          fontFamily: 'var(--typography-fontfamilies-mainsans)',
        }}
      >
        <RotateCcw size={16} />
        {label}
      </button>
    </div>
  );
}
