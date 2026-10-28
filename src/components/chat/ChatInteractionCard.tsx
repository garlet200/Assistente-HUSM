'use client';

/**
 * @file ChatInteractionCard.tsx
 * @description Card de interação do Chat Clínico que exibe a pergunta do usuário, o raciocínio
 * clínico em Markdown, o selo de confiabilidade (fallback), sugestões interativas e citações PubMed (RAG).
 */

import ReactMarkdown from 'react-markdown';
import { Loader2 } from 'lucide-react';
import { ChatCitationList } from './ChatCitationList';
import { ReliabilityBadge } from './ReliabilityBadge';
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
  onSendSuggestion: (suggestionText: string) => void;
  onRetry: (interaction: Interaction) => void;
}

/**
 * Separates embedded '#sugestao-' markdown links from the main clinical reasoning text.
 */
function extractSuggestionsAndMainContent(rawResponseText: string): {
  mainContentText: string;
  suggestionTopics: string[];
} {
  const suggestionRegex = /\[([^\]]+)\]\(#sugestao-([^\)]+)\)/g;
  const suggestionTopics: string[] = [];
  let regexMatch: RegExpExecArray | null;

  while ((regexMatch = suggestionRegex.exec(rawResponseText)) !== null) {
    const rawSuggestion = regexMatch[1].trim();
    if (rawSuggestion) {
      suggestionTopics.push(rawSuggestion);
    }
  }

  const cleanedMainContentText = rawResponseText.replace(suggestionRegex, '').trim();

  return {
    mainContentText: cleanedMainContentText,
    suggestionTopics,
  };
}

interface SuggestionsListSectionProps {
  suggestionTopics: string[];
  onSendSuggestion: (suggestionText: string) => void;
}

function SuggestionsListSection({
  suggestionTopics,
  onSendSuggestion,
}: SuggestionsListSectionProps) {
  if (suggestionTopics.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: 'var(--spacing-md)', paddingTop: 'var(--spacing-ml)' }}>
      <hr
        style={{
          border: 'none',
          borderTop: 'var(--strokewidth-min) solid var(--color-semantic-boxshadow-boxshadowfxdark)',
          margin: 'var(--spacing-ml) 0',
        }}
      />
      <p
        style={{
          fontFamily: 'var(--typography-fontfamilies-mainsans)',
          fontSize: 'var(--typography-fontsizes-body)',
          fontWeight: 'var(--typography-fontweights-semibold)',
          color: 'var(--color-semantic-text-textdark)',
          marginBottom: 'var(--spacing-sm)',
        }}
      >
        Sugestões para continuar pesquisando
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {suggestionTopics.map((topicText, topicIndex) => (
          <div key={topicIndex}>
            <button
              type="button"
              onClick={() => onSendSuggestion(topicText)}
              style={{
                background: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
                border: 'var(--strokewidth-min) solid var(--color-semantic-accent-accentprimary)',
                borderRadius: 'var(--radius-radius-medium)',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                color: 'var(--color-semantic-accent-accentprimary)',
                cursor: 'pointer',
                display: 'inline-block',
                fontSize: '0.875rem',
                fontFamily: 'var(--typography-fontfamilies-mainsans)',
                textAlign: 'left',
              }}
            >
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
  onSendSuggestion,
  onRetry,
}: ChatInteractionCardProps) {
  const formattedTime = new Date(interaction.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const renderInteractionResponseBody = () => {
    if (!interaction.response) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
            fontFamily: 'var(--typography-fontfamilies-mainsans)',
            color: 'var(--color-semantic-text-textlight)',
            fontStyle: 'italic',
          }}
        >
          <Loader2 size={18} className="animate-spin" />
          Processando resposta...
        </div>
      );
    }

    const { mainContentText, suggestionTopics } = extractSuggestionsAndMainContent(
      interaction.response
    );
    const shouldShowFallbackSpacing =
      Boolean(interaction.reliability) && interaction.reliability !== 'high';

    return (
      <>
        <div style={{ marginBottom: shouldShowFallbackSpacing ? 'var(--spacing-sm)' : undefined }}>
          <ReliabilityBadge
            reliability={interaction.reliability}
            modelTier={interaction.modelTier}
            modelDisplayName={interaction.modelDisplayName}
          />
        </div>

        <div
          style={{
            fontFamily: 'var(--typography-fontfamilies-mainserif)',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            color: 'var(--color-semantic-text-textdark)',
          }}
        >
          <ReactMarkdown>{mainContentText}</ReactMarkdown>
        </div>

        <SuggestionsListSection
          suggestionTopics={suggestionTopics}
          onSendSuggestion={onSendSuggestion}
        />

        {isRetryableResponse(interaction.response) && (
          <RetryActionButton onRetry={() => onRetry(interaction)} />
        )}

        <ChatCitationList citations={interaction.citations} />
      </>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '90%',
        margin: '0 auto',
        width: '100%',
      }}
    >
      <div
        style={{
          padding: 'var(--spacing-ml) var(--spacing-md)',
          backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddimmer)',
          borderRadius: 'var(--radius-radius-medium)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 'var(--spacing-sm)',
          }}
        >
          <div
            style={{
              fontWeight: 'var(--typography-fontweights-semibold)',
              color: 'var(--color-semantic-text-textdark)',
              fontFamily: 'var(--typography-fontfamilies-mainsans)',
            }}
          >
            {interaction.prompt}
          </div>
          <div
            style={{
              fontSize: 'var(--typography-fontsizes-caption)',
              color: 'var(--color-semantic-text-textlight)',
              whiteSpace: 'nowrap',
              marginLeft: 'var(--spacing-md)',
            }}
          >
            {formattedTime}
          </div>
        </div>

        <hr
          style={{
            border: 'none',
            borderTop:
              'var(--strokewidth-min) solid var(--color-semantic-boxshadow-boxshadowfxdark)',
            margin: 'var(--spacing-ml) 0',
          }}
        />

        {renderInteractionResponseBody()}
      </div>
    </div>
  );
}
