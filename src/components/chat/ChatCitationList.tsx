'use client';

/**
 * @file ChatCitationList.tsx
 * @description Renderizador de citações científicas (RAG) que converte strings "PMID: id | título"
 * em links externos verificáveis para o portal NCBI PubMed.
 */

import { ExternalLink } from 'lucide-react';

interface ChatCitationListProps {
  citations?: string[];
}

const MAXIMUM_DISPLAYED_TITLE_LENGTH = 20;

/**
 * Truncates citation titles cleanly so pills fit neatly in the mobile/desktop viewport.
 */
function truncateCitationTitle(titleText: string): string {
  if (titleText.length <= MAXIMUM_DISPLAYED_TITLE_LENGTH) {
    return titleText;
  }
  return `${titleText.substring(0, MAXIMUM_DISPLAYED_TITLE_LENGTH)}...`;
}

/**
 * Parses raw citation strings (e.g. "PMID: 12345678 | Article Title") into structured data.
 */
function parseCitationEntry(rawCitation: string): {
  isPubMedCitation: boolean;
  pubmedIdentifier: string;
  fullTitle: string;
  displayTitle: string;
  articleUrl: string;
} {
  const isPubMedCitation = rawCitation.startsWith('PMID: ');

  if (!isPubMedCitation) {
    return {
      isPubMedCitation: false,
      pubmedIdentifier: '',
      fullTitle: rawCitation,
      displayTitle: rawCitation,
      articleUrl: '',
    };
  }

  const [rawPmidPrefix, rawTitle] = rawCitation.split(' | ');
  const pubmedIdentifier = rawPmidPrefix.replace('PMID:', '').trim();
  const fullTitle = rawTitle || pubmedIdentifier;
  const displayTitle = truncateCitationTitle(fullTitle);
  const articleUrl = `https://pubmed.ncbi.nlm.nih.gov/${pubmedIdentifier}/`;

  return {
    isPubMedCitation: true,
    pubmedIdentifier,
    fullTitle,
    displayTitle,
    articleUrl,
  };
}

/**
 * Displays scientific evidence citations (RAG) retrieved from PubMed or internal sources.
 */
export function ChatCitationList({ citations }: ChatCitationListProps) {
  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: 'var(--spacing-md)', paddingTop: 'var(--spacing-ml)' }}>
      <p
        style={{
          fontSize: 'var(--typography-fontsizes-caption)',
          fontWeight: 'var(--typography-fontweights-bold)',
          marginBottom: 'var(--spacing-sm)',
          color: 'var(--color-semantic-text-textlight)',
        }}
      >
        Fontes (RAG):
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
        {citations.map((rawCitation, citationIndex) => {
          const citation = parseCitationEntry(rawCitation);

          if (!citation.isPubMedCitation) {
            return (
              <span
                key={citationIndex}
                style={{
                  fontFamily: 'var(--typography-fontfamilies-mainmono)',
                  fontSize: 'var(--typography-fontsizes-caption)',
                  backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
                  padding: 'var(--spacing-min) var(--spacing-sm)',
                  borderRadius: 'var(--radius-radius-smallest)',
                  border:
                    'var(--strokewidth-min) solid var(--color-semantic-boxshadow-boxshadowfxdark)',
                  color: 'var(--color-semantic-text-textdark)',
                }}
              >
                {citation.displayTitle}
              </span>
            );
          }

          return (
            <a
              key={citationIndex}
              href={citation.articleUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={citation.fullTitle}
              style={{
                fontFamily: 'var(--typography-fontfamilies-mainmono)',
                fontSize: 'var(--typography-fontsizes-caption)',
                backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
                padding: 'var(--spacing-min) var(--spacing-sm)',
                borderRadius: 'var(--radius-radius-smallest)',
                border:
                  'var(--strokewidth-min) solid var(--color-semantic-boxshadow-boxshadowfxdark)',
                textDecoration: 'none',
                color: 'var(--color-semantic-accent-accentprimary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--spacing-min)',
                cursor: 'pointer',
              }}
            >
              <ExternalLink size={12} />
              <span>{citation.displayTitle}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
