/**
 * @file exportShared.ts
 * @description Tipos compartilhados, sanitização de nomes de arquivo e exportação em texto puro.
 */

import { stripSuggestionLinks } from './markdownParser';

export interface ExportableCardItem {
  heading: string;
  body: string;
  timestamp?: string;
  citations?: string[];
}

export function buildExportBaseName(rawName: string): string {
  const cleaned = rawName
    .replace(/[\\/:*?"<>|\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 60);
  return `MedHUSM - ${cleaned || 'Exportacao'}`;
}

function stripMarkdownFormatting(markdownText: string): string {
  return stripSuggestionLinks(markdownText)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/[*_`>#~]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function formatCardAsPlainText(card: ExportableCardItem): string {
  const sections: string[] = [
    `TÓPICO / PERGUNTA:\n${card.heading.trim()}`,
    `CONTEÚDO / RESPOSTA:\n${stripMarkdownFormatting(card.body)}`,
  ];
  if (card.citations && card.citations.length > 0) {
    sections.push(`FONTES (RAG):\n${card.citations.join('\n')}`);
  }
  return sections.join('\n\n----------------------------------------\n\n');
}

export async function copyCardTextToClipboard(card: ExportableCardItem): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(formatCardAsPlainText(card));
    return true;
  } catch (clipboardError) {
    console.error('Erro ao copiar texto para a área de transferência:', clipboardError);
    return false;
  }
}
