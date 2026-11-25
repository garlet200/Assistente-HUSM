/**
 * @file pngCanvasLayout.ts
 * @description Motor de quebra de linha estilizada (bold, italic, code) e desenho de texto/tabelas em Canvas 2D.
 */

import type { InlineSpan } from './markdownParser';

export interface StyledToken {
  text: string;
  kind: InlineSpan['kind'];
}

export type StyledLine = StyledToken[];

export interface FontSet {
  regular: string;
  bold: string;
  italic: string;
  code: string;
}

export const BODY_FONTS: FontSet = {
  regular: '400 15px Georgia, serif',
  bold: '700 15px Georgia, serif',
  italic: 'italic 400 15px Georgia, serif',
  code: '400 13px ui-monospace, Consolas, monospace',
};

export const TABLE_HEADER_FONTS: FontSet = {
  regular: '600 13px sans-serif',
  bold: '700 13px sans-serif',
  italic: 'italic 600 13px sans-serif',
  code: '600 12px ui-monospace, Consolas, monospace',
};

export const TABLE_CELL_FONTS: FontSet = {
  regular: '400 13px Georgia, serif',
  bold: '700 13px Georgia, serif',
  italic: 'italic 400 13px Georgia, serif',
  code: '400 12px ui-monospace, Consolas, monospace',
};

export function fontForKind(fonts: FontSet, kind: InlineSpan['kind']): string {
  if (kind === 'bold') return fonts.bold;
  if (kind === 'italic') return fonts.italic;
  if (kind === 'code') return fonts.code;
  return fonts.regular;
}

function tokenizeSpans(spans: InlineSpan[]): StyledToken[] {
  const tokens: StyledToken[] = [];
  for (const span of spans) {
    const parts = span.text.split(/(\s+)/).filter((part) => part.length > 0);
    for (const part of parts) {
      tokens.push({ text: part, kind: span.kind });
    }
  }
  return tokens;
}

function splitLongToken(
  ctx: CanvasRenderingContext2D,
  token: StyledToken,
  maxWidth: number
): StyledToken[] {
  const chunks: StyledToken[] = [];
  let current = '';
  for (const char of token.text) {
    if (ctx.measureText(current + char).width > maxWidth && current) {
      chunks.push({ text: current, kind: token.kind });
      current = char;
    } else {
      current += char;
    }
  }
  if (current) chunks.push({ text: current, kind: token.kind });
  return chunks;
}

export function wrapStyledSpans(
  ctx: CanvasRenderingContext2D,
  spans: InlineSpan[],
  maxWidth: number,
  fonts: FontSet
): StyledLine[] {
  const tokens = tokenizeSpans(spans);
  const lines: StyledLine[] = [];
  let currentLine: StyledLine = [];
  let lineWidth = 0;

  for (const token of tokens) {
    const isWhitespace = /^\s+$/.test(token.text);
    if (isWhitespace && currentLine.length === 0) continue;

    ctx.font = fontForKind(fonts, token.kind);
    const extraPad = token.kind === 'code' ? 6 : 0;
    const tokenWidth = ctx.measureText(token.text).width + extraPad;

    if (!isWhitespace && tokenWidth > maxWidth) {
      if (currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = [];
        lineWidth = 0;
      }
      const chunks = splitLongToken(ctx, token, Math.max(24, maxWidth - extraPad));
      for (let i = 0; i < chunks.length - 1; i += 1) {
        lines.push([chunks[i]]);
      }
      const last = chunks[chunks.length - 1];
      if (last) {
        currentLine = [last];
        lineWidth = ctx.measureText(last.text).width + extraPad;
      }
      continue;
    }

    if (lineWidth + tokenWidth > maxWidth && currentLine.length > 0 && !isWhitespace) {
      lines.push(currentLine);
      currentLine = [token];
      lineWidth = tokenWidth;
      continue;
    }

    currentLine.push(token);
    lineWidth += tokenWidth;
  }

  if (currentLine.length > 0) lines.push(currentLine);
  return lines.length > 0 ? lines : [[]];
}

export function drawStyledLine(
  ctx: CanvasRenderingContext2D,
  line: StyledLine,
  startX: number,
  baselineY: number,
  fonts: FontSet,
  textColor = '#0d1520'
): void {
  let cursorX = startX;

  for (const token of line) {
    ctx.font = fontForKind(fonts, token.kind);
    const textWidth = ctx.measureText(token.text).width;

    if (token.kind === 'code') {
      ctx.fillStyle = '#e5e9f0';
      ctx.fillRect(cursorX, baselineY - 13, textWidth + 6, 17);
      ctx.fillStyle = textColor;
      ctx.fillText(token.text, cursorX + 3, baselineY);
      cursorX += textWidth + 6;
      continue;
    }

    ctx.fillStyle = textColor;
    ctx.fillText(token.text, cursorX, baselineY);
    cursorX += textWidth;
  }
}

export function wrapPlainLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const rawLine of text.split('\n')) {
    if (!rawLine.trim()) {
      lines.push('');
      continue;
    }
    let current = '';
    for (const word of rawLine.split(' ')) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}
