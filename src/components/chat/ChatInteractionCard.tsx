'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2, RotateCcw } from 'lucide-react';
import { ChatCitationList } from './ChatCitationList';
import { ReliabilityBadge } from './ReliabilityBadge';
import { isRetryableResponse } from '@/lib/utils/formatters';

export interface Interaction {
  id: string;
  userMessageId?: string;
  modelMessageId?: string;
  prompt: string;
  response: string | null;
  timestamp: Date;
  citations?: string[];
  reliability?: 'high' | 'standard' | 'reduced';
  modelTier?: 'primary' | 'fallback_1' | 'fallback_2';
  modelDisplayName?: string;
}

interface ChatInteractionCardProps {
  interaction: Interaction;
  onSendSuggestion: (suggestionText: string) => void;
  onRetry: (interaction: Interaction) => void;
}

/**
 * Separates embedded '#sugestao-' markdown links from the main clinical reasoning text.
 * Allows rendering the suggestions with a dedicated section header and subtle item dividers.
 */
function extractSuggestionsAndMainContent(rawResponseText: string): {
  mainContentText: string;
  suggestionTopics: string[];
} {
  const suggestionRegex = /\[([^\]]+)\]\(#sugestao-([^\)]+)\)/g;
  const suggestionTopics: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = suggestionRegex.exec(rawResponseText)) !== null) {
    const rawSuggestion = match[1].trim();
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


/**
 * Renders a single consultation interaction card containing the user's prompt at the top,
 * followed by the model's clinical evidence reasoning, research suggestions, and citations.
 */
export function ChatInteractionCard({
  interaction,
  onSendSuggestion,
  onRetry,
}: ChatInteractionCardProps) {
  const formattedTime = new Date(interaction.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const hasResponse = Boolean(interaction.response);
  const { mainContentText, suggestionTopics } = hasResponse
    ? extractSuggestionsAndMainContent(interaction.response!)
    : { mainContentText: '', suggestionTopics: [] };

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
          borderRadius: '16px',
        }}
      >
        {/* Prompt do usuário no topo do card com horário */}
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
              fontWeight: 600,
              color: 'var(--color-semantic-text-textdark)',
              fontFamily: 'var(--typography-fontfamilies-mainsans)',
            }}
          >
            {interaction.prompt}
          </div>
          <div
            style={{
              fontSize: '0.75rem',
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
            borderTop: '1px solid var(--color-semantic-boxshadow-boxshadowfxdark)',
            margin: '12px 0',
          }}
        />

        {!interaction.response ? (
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
        ) : (
          <>
            <div style={{ marginBottom: interaction.reliability && interaction.reliability !== 'high' ? 'var(--spacing-sm)' : undefined }}>
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

            {/* Dedicated Suggestions Section with Title and Dividers */}
            {suggestionTopics.length > 0 && (
              <div style={{ marginTop: 'var(--spacing-md)', paddingTop: '12px' }}>
                <hr
                  style={{
                    border: 'none',
                    borderTop: '1px solid var(--color-semantic-boxshadow-boxshadowfxdark)',
                    margin: '12px 0',
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
                          border: '1px solid var(--color-semantic-accent-accentprimary)',
                          borderRadius: '16px',
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
            )}

            {/* Retry Action if error occurred or assistant is temporarily unavailable */}
            {isRetryableResponse(interaction.response) && (
              <div style={{ marginTop: 'var(--spacing-md)' }}>
                <button
                  type="button"
                  onClick={() => onRetry(interaction)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-sm)',
                    background: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
                    border: '1px solid var(--color-semantic-boxshadow-boxshadowfxdark)',
                    borderRadius: '16px',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    color: 'var(--color-semantic-text-textdark)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontFamily: 'var(--typography-fontfamilies-mainsans)',
                  }}
                >
                  <RotateCcw size={16} />
                  Tentar novamente
                </button>
              </div>
            )}

            {/* RAG Evidence Sources */}
            <ChatCitationList citations={interaction.citations} />
          </>
        )}
      </div>
    </div>
  );
}
