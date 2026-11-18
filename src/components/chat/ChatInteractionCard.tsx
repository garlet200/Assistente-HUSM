'use client';

/**
 * @file ChatInteractionCard.tsx
 * @description Card de interação do Chat Clínico que exibe a pergunta do usuário, o raciocínio
 * clínico em Markdown, o selo de confiabilidade, sugestões interativas, citações PubMed e opções de exportação.
 */

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2, MoreVertical } from 'lucide-react';
import { ChatCitationList } from './ChatCitationList';
import { ReliabilityBadge } from './ReliabilityBadge';
import { ActionPopupModal } from '@/components/common/ActionPopupModal';
import { buildCardExportPopupActions } from '@/components/common/cardExportActions';
import { RetryActionButton } from '@/components/common/RetryActionButton';
import { ModelTier, ReliabilityLevel } from '@/lib/ai/cascadeConfig';
import { isRetryableResponse } from '@/lib/utils/formatters';

export interface Interaction {
  id: string;
  userMessageId?: string;
  modelMessageId?: string;
  prompt: string;
  response: string | null;
  timestamp: Date;
  citations?: string[];
  reliability?: ReliabilityLevel;
  modelTier?: ModelTier;
  modelDisplayName?: string;
}

interface ChatInteractionCardProps {
  interaction: Interaction;
  sessionTitle?: string;
  onSendSuggestion: (suggestionText: string) => void;
  onRetry: (interaction: Interaction) => void;
}

const SUGGESTION_BUTTON_STYLE: React.CSSProperties = {
  background: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
  border: 'var(--strokewidth-min) solid var(--color-semantic-accent-accentprimary)',
  borderRadius: 'var(--radius-radius-medium)',
  padding: 'var(--spacing-sm) var(--spacing-md)',
  color: 'var(--color-semantic-accent-accentprimary)',
  cursor: 'pointer',
  display: 'inline-block',
  maxWidth: '100%',
  boxSizing: 'border-box',
  whiteSpace: 'normal',
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
  fontSize: '0.875rem',
  fontFamily: 'var(--typography-fontfamilies-mainsans)',
  textAlign: 'left',
};

const DIVIDER_STYLE: React.CSSProperties = {
  border: 'none',
  borderTop: 'var(--strokewidth-min) solid var(--color-semantic-boxshadow-boxshadowfxdark)',
  margin: 'var(--spacing-ml) 0',
};

function decodeSuggestionLabel(rawText: string): string {
  try {
    return decodeURIComponent(rawText).trim();
  } catch {
    return rawText.replace(/%20/g, ' ').trim();
  }
}

function extractSuggestionsAndMainContent(rawResponseText: string): {
  mainContentText: string;
  suggestionTopics: string[];
} {
  const suggestionRegex = /\[([^\]]+)\]\(#sugestao-([^\)]+)\)/g;
  const suggestionTopics: string[] = [];
  let regexMatch: RegExpExecArray | null;

  while ((regexMatch = suggestionRegex.exec(rawResponseText)) !== null) {
    const decodedSuggestion = decodeSuggestionLabel(regexMatch[1]);
    if (decodedSuggestion) suggestionTopics.push(decodedSuggestion);
  }

  return {
    mainContentText: rawResponseText.replace(suggestionRegex, '').trim(),
    suggestionTopics,
  };
}

function SuggestionsListSection({
  suggestionTopics,
  onSendSuggestion,
}: {
  suggestionTopics: string[];
  onSendSuggestion: (suggestionText: string) => void;
}) {
  if (suggestionTopics.length === 0) return null;

  return (
    <div style={{ marginTop: 'var(--spacing-md)', paddingTop: 'var(--spacing-ml)' }}>
      <hr style={DIVIDER_STYLE} />
      <p style={{ fontFamily: 'var(--typography-fontfamilies-mainsans)', fontSize: 'var(--typography-fontsizes-body)', fontWeight: 'var(--typography-fontweights-semibold)', color: 'var(--color-semantic-text-textdark)', marginBottom: 'var(--spacing-sm)' }}>
        Sugestões para continuar pesquisando
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {suggestionTopics.map((topicText, topicIndex) => (
          <div key={topicIndex}>
            <button type="button" onClick={() => onSendSuggestion(topicText)} style={SUGGESTION_BUTTON_STYLE}>
              {topicText}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatInteractionCard({
  interaction,
  sessionTitle = 'Consulta Clínica',
  onSendSuggestion,
  onRetry,
}: ChatInteractionCardProps) {
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const formattedTime = new Date(interaction.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const exportableCard = {
    heading: interaction.prompt,
    body: interaction.response || '',
    timestamp: formattedTime,
    citations: interaction.citations,
  };

  const renderInteractionResponseBody = () => {
    if (!interaction.response) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontFamily: 'var(--typography-fontfamilies-mainsans)', color: 'var(--color-semantic-text-textlight)', fontStyle: 'italic' }}>
          <Loader2 size={18} className="animate-spin" />
          Processando resposta...
        </div>
      );
    }

    const { mainContentText, suggestionTopics } = extractSuggestionsAndMainContent(interaction.response);
    const shouldShowFallbackSpacing = Boolean(interaction.reliability) && interaction.reliability !== 'high';

    return (
      <>
        <div style={{ marginBottom: shouldShowFallbackSpacing ? 'var(--spacing-sm)' : undefined }}>
          <ReliabilityBadge
            reliability={interaction.reliability}
            modelTier={interaction.modelTier}
            modelDisplayName={interaction.modelDisplayName}
          />
        </div>
        <div style={{ fontFamily: 'var(--typography-fontfamilies-mainserif)', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: 'var(--color-semantic-text-textdark)' }}>
          <ReactMarkdown>{mainContentText}</ReactMarkdown>
        </div>
        <SuggestionsListSection suggestionTopics={suggestionTopics} onSendSuggestion={onSendSuggestion} />
        {isRetryableResponse(interaction.response) && (
          <RetryActionButton onRetry={() => onRetry(interaction)} />
        )}
        <ChatCitationList citations={interaction.citations} />
      </>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '90%', margin: '0 auto', width: '100%' }}>
      <div style={{ padding: 'var(--spacing-ml) var(--spacing-md)', backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddimmer)', borderRadius: 'var(--radius-radius-medium)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
          <div style={{ fontWeight: 'var(--typography-fontweights-semibold)', color: 'var(--color-semantic-text-textdark)', fontFamily: 'var(--typography-fontfamilies-mainsans)', flex: 1 }}>
            {interaction.prompt}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexShrink: 0 }}>
            <span style={{ fontSize: 'var(--typography-fontsizes-caption)', color: 'var(--color-semantic-text-textlight)' }}>
              {formattedTime}
            </span>
            <button
              type="button"
              className="neu-button"
              onClick={() => setIsPopupOpen(true)}
              style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-semantic-text-textlight)' }}
              title="Exportar card"
              aria-label="Exportar card"
            >
              <MoreVertical size={15} />
            </button>
          </div>
        </div>
        <hr style={DIVIDER_STYLE} />
        {renderInteractionResponseBody()}
      </div>

      <ActionPopupModal
        isOpen={isPopupOpen}
        title="Exportar Card"
        onClose={() => setIsPopupOpen(false)}
        exportActions={buildCardExportPopupActions({
          cardItem: exportableCard,
          sessionTitle,
        })}
      />
    </div>
  );
}
