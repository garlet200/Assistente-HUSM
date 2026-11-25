/**
 * @file markdownParser.ts
 * @description Parser estrutural leve de Markdown clínico (títulos, listas, blockquotes, tabelas GFM e estilos inline)
 * compartilhado pelos exportadores de PDF e Imagem (.png).
 */

export type InlineSpan =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'italic'; text: string }
  | { kind: 'code'; text: string };

export type MarkdownBlock =
  | { kind: 'heading'; level: 1 | 2 | 3; spans: InlineSpan[] }
  | { kind: 'paragraph'; spans: InlineSpan[] }
  | { kind: 'blockquote'; paragraphs: InlineSpan[][] }
  | { kind: 'list'; ordered: boolean; items: Array<{ marker: string; spans: InlineSpan[] }> }
  | { kind: 'table'; headers: InlineSpan[][]; rows: InlineSpan[][][] };

const INLINE_TOKEN_REGEX =
  /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|_[^_\n]+_|\[([^\]]+)\]\(([^)]+)\))/g;
const TABLE_SEPARATOR_REGEX = /^\s*\|?(?:\s*:?-{2,}:?\s*\|)+\s*:?-{2,}:?\s*\|?\s*$/;
const ORDERED_LIST_REGEX = /^\s*(\d+\.)\s+(.+)$/;
const UNORDERED_LIST_REGEX = /^\s*[-*+]\s+(.+)$/;
const HEADING_REGEX = /^\s*(#{1,3})\s+(.+)$/;

export function stripSuggestionLinks(markdownText: string): string {
  return markdownText
    .replace(/\[([^\]]+)\]\(#sugestao-[^)]+\)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function parseInlineSpans(rawText: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  let lastIndex = 0;

  for (const match of rawText.matchAll(INLINE_TOKEN_REGEX)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > lastIndex) {
      spans.push({ kind: 'text', text: rawText.slice(lastIndex, matchIndex) });
    }

    const token = match[0];
    if (token.startsWith('`')) {
      spans.push({ kind: 'code', text: token.slice(1, -1) });
    } else if (token.startsWith('**') || token.startsWith('__')) {
      spans.push({ kind: 'bold', text: token.slice(2, -2) });
    } else if (token.startsWith('*') || token.startsWith('_')) {
      spans.push({ kind: 'italic', text: token.slice(1, -1) });
    } else if (match[2] && match[3]) {
      spans.push({ kind: 'text', text: `${match[2]} (${match[3]})` });
    }

    lastIndex = matchIndex + token.length;
  }

  if (lastIndex < rawText.length) {
    spans.push({ kind: 'text', text: rawText.slice(lastIndex) });
  }
  return spans.length > 0 ? spans : [{ kind: 'text', text: rawText }];
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

function isTableStart(lines: string[], index: number): boolean {
  if (index + 1 >= lines.length) return false;
  return lines[index].includes('|') && TABLE_SEPARATOR_REGEX.test(lines[index + 1]);
}

function consumeTable(lines: string[], startIndex: number): { block: MarkdownBlock; nextIndex: number } {
  const headers = splitTableRow(lines[startIndex]).map(parseInlineSpans);
  const rows: InlineSpan[][][] = [];
  let index = startIndex + 2;

  while (index < lines.length && lines[index].includes('|') && lines[index].trim().length > 0) {
    rows.push(splitTableRow(lines[index]).map(parseInlineSpans));
    index += 1;
  }

  return { block: { kind: 'table', headers, rows }, nextIndex: index };
}

function consumeBlockquote(lines: string[], startIndex: number): { block: MarkdownBlock; nextIndex: number } {
  const paragraphs: InlineSpan[][] = [];
  let buffer: string[] = [];
  let index = startIndex;

  while (index < lines.length && /^\s*>/.test(lines[index])) {
    const content = lines[index].replace(/^\s*>\s?/, '').trim();
    if (!content) {
      if (buffer.length > 0) {
        paragraphs.push(parseInlineSpans(buffer.join(' ')));
        buffer = [];
      }
    } else {
      buffer.push(content);
    }
    index += 1;
  }

  if (buffer.length > 0) paragraphs.push(parseInlineSpans(buffer.join(' ')));
  return { block: { kind: 'blockquote', paragraphs }, nextIndex: index };
}

function consumeList(lines: string[], startIndex: number): { block: MarkdownBlock; nextIndex: number } {
  const ordered = ORDERED_LIST_REGEX.test(lines[startIndex]);
  const items: Array<{ marker: string; spans: InlineSpan[] }> = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];
    const match = ordered ? line.match(ORDERED_LIST_REGEX) : line.match(UNORDERED_LIST_REGEX);
    if (!match) break;

    const marker = ordered ? match[1] : '•';
    const text = ordered ? match[2] : match[1];
    items.push({ marker, spans: parseInlineSpans(text.trim()) });
    index += 1;
  }

  return { block: { kind: 'list', ordered, items }, nextIndex: index };
}

function isBlockBoundary(lines: string[], index: number): boolean {
  const line = lines[index];
  return (
    !line.trim() ||
    HEADING_REGEX.test(line) ||
    /^\s*>/.test(line) ||
    ORDERED_LIST_REGEX.test(line) ||
    UNORDERED_LIST_REGEX.test(line) ||
    isTableStart(lines, index)
  );
}

export function parseMarkdownBlocks(rawMarkdown: string): MarkdownBlock[] {
  const lines = stripSuggestionLinks(rawMarkdown).split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const headingMatch = line.match(HEADING_REGEX);
    if (headingMatch) {
      const level = Math.min(3, headingMatch[1].length) as 1 | 2 | 3;
      blocks.push({ kind: 'heading', level, spans: parseInlineSpans(headingMatch[2].trim()) });
      index += 1;
      continue;
    }

    if (isTableStart(lines, index)) {
      const result = consumeTable(lines, index);
      blocks.push(result.block);
      index = result.nextIndex;
      continue;
    }

    if (/^\s*>/.test(line)) {
      const result = consumeBlockquote(lines, index);
      blocks.push(result.block);
      index = result.nextIndex;
      continue;
    }

    if (ORDERED_LIST_REGEX.test(line) || UNORDERED_LIST_REGEX.test(line)) {
      const result = consumeList(lines, index);
      blocks.push(result.block);
      index = result.nextIndex;
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length && !isBlockBoundary(lines, index)) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ kind: 'paragraph', spans: parseInlineSpans(paragraphLines.join(' ')) });
  }

  return blocks;
}
