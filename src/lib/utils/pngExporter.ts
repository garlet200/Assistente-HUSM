/**
 * @file pngExporter.ts
 * @description Exportador de cards clínicos em imagem .png de alta resolução (scale = 2)
 * com renderização estruturada de títulos, listas, blockquotes e tabelas Booktabs.
 */

import { buildExportBaseName, type ExportableCardItem } from './exportShared';
import { parseMarkdownBlocks, type MarkdownBlock } from './markdownParser';
import {
  BODY_FONTS,
  drawStyledLine,
  TABLE_CELL_FONTS,
  TABLE_HEADER_FONTS,
  wrapPlainLines,
  wrapStyledSpans,
  type FontSet,
  type StyledLine,
} from './pngCanvasLayout';

const PNG_CANVAS_WIDTH = 760;
const PNG_CARD_MARGIN = 20;
const PNG_TEXT_PADDING_X = 44;
const PNG_MAX_TEXT_WIDTH = PNG_CANVAS_WIDTH - PNG_TEXT_PADDING_X * 2;
const PNG_BRAND_FONT = '700 14px monospace';
const PNG_HEADING_FONT = '600 18px sans-serif';
const PNG_CITATION_FONT = '400 12px monospace';
const BODY_LINE_HEIGHT = 23;
const TABLE_LINE_HEIGHT = 19;

type DrawOp = (ctx: CanvasRenderingContext2D) => void;

interface MeasuredBlock {
  height: number;
  draw: DrawOp;
}

function measureHeadingBlock(
  ctx: CanvasRenderingContext2D,
  block: Extract<MarkdownBlock, { kind: 'heading' }>,
  startY: number
): MeasuredBlock {
  const font = block.level === 3 ? '600 15px sans-serif' : '600 17px sans-serif';
  const fonts: FontSet = { regular: font, bold: font, italic: font, code: font };
  const lines = wrapStyledSpans(ctx, block.spans, PNG_MAX_TEXT_WIDTH, fonts);
  const topSpace = 10;
  const lineH = block.level === 3 ? 22 : 24;
  const hasRule = block.level <= 2;
  const height = topSpace + lines.length * lineH + (hasRule ? 10 : 4);

  return {
    height,
    draw: (drawCtx) => {
      let y = startY + topSpace + 14;
      for (const line of lines) {
        drawStyledLine(drawCtx, line, PNG_TEXT_PADDING_X, y, fonts);
        y += lineH;
      }
      if (hasRule) {
        const ruleY = y - lineH + 7;
        drawCtx.strokeStyle = '#c8d0dc';
        drawCtx.lineWidth = 1;
        drawCtx.beginPath();
        drawCtx.moveTo(PNG_TEXT_PADDING_X, ruleY);
        drawCtx.lineTo(PNG_CANVAS_WIDTH - PNG_TEXT_PADDING_X, ruleY);
        drawCtx.stroke();
      }
    },
  };
}

function measureParagraphBlock(
  ctx: CanvasRenderingContext2D,
  block: Extract<MarkdownBlock, { kind: 'paragraph' }>,
  startY: number
): MeasuredBlock {
  const lines = wrapStyledSpans(ctx, block.spans, PNG_MAX_TEXT_WIDTH, BODY_FONTS);
  const height = lines.length * BODY_LINE_HEIGHT + 10;

  return {
    height,
    draw: (drawCtx) => {
      let y = startY + 16;
      for (const line of lines) {
        drawStyledLine(drawCtx, line, PNG_TEXT_PADDING_X, y, BODY_FONTS);
        y += BODY_LINE_HEIGHT;
      }
    },
  };
}

function measureListBlock(
  ctx: CanvasRenderingContext2D,
  block: Extract<MarkdownBlock, { kind: 'list' }>,
  startY: number
): MeasuredBlock {
  const indent = 22;
  const measuredItems = block.items.map((item) => ({
    marker: item.marker,
    lines: wrapStyledSpans(ctx, item.spans, PNG_MAX_TEXT_WIDTH - indent, BODY_FONTS),
  }));
  const totalLines = measuredItems.reduce((sum, item) => sum + item.lines.length, 0);
  const height = totalLines * BODY_LINE_HEIGHT + measuredItems.length * 4 + 8;

  return {
    height,
    draw: (drawCtx) => {
      let y = startY + 16;
      for (const item of measuredItems) {
        drawCtx.fillStyle = '#1565c0';
        drawCtx.font = BODY_FONTS.bold;
        drawCtx.fillText(item.marker, PNG_TEXT_PADDING_X, y);
        for (const line of item.lines) {
          drawStyledLine(drawCtx, line, PNG_TEXT_PADDING_X + indent, y, BODY_FONTS);
          y += BODY_LINE_HEIGHT;
        }
        y += 4;
      }
    },
  };
}

function measureBlockquoteBlock(
  ctx: CanvasRenderingContext2D,
  block: Extract<MarkdownBlock, { kind: 'blockquote' }>,
  startY: number
): MeasuredBlock {
  const innerPadX = 14;
  const innerPadY = 10;
  const wrappedParas = block.paragraphs.map((p) =>
    wrapStyledSpans(ctx, p, PNG_MAX_TEXT_WIDTH - innerPadX * 2, BODY_FONTS)
  );
  const totalLines = wrappedParas.reduce((sum, lines) => sum + lines.length, 0);
  const boxHeight = innerPadY * 2 + totalLines * BODY_LINE_HEIGHT + Math.max(0, wrappedParas.length - 1) * 6;

  return {
    height: boxHeight + 14,
    draw: (drawCtx) => {
      const boxTop = startY + 2;
      drawCtx.fillStyle = '#e9eef5';
      drawCtx.fillRect(PNG_TEXT_PADDING_X, boxTop, PNG_MAX_TEXT_WIDTH, boxHeight);
      drawCtx.fillStyle = '#1565c0';
      drawCtx.fillRect(PNG_TEXT_PADDING_X, boxTop, 3, boxHeight);

      let y = boxTop + innerPadY + 15;
      for (const lines of wrappedParas) {
        for (const line of lines) {
          drawStyledLine(drawCtx, line, PNG_TEXT_PADDING_X + innerPadX, y, BODY_FONTS);
          y += BODY_LINE_HEIGHT;
        }
        y += 6;
      }
    },
  };
}

function measureTableBlock(
  ctx: CanvasRenderingContext2D,
  block: Extract<MarkdownBlock, { kind: 'table' }>,
  startY: number
): MeasuredBlock {
  const colCount = Math.max(1, block.headers.length);
  const colWidth = PNG_MAX_TEXT_WIDTH / colCount;
  const cellPadX = 8;
  const cellPadY = 7;

  const measureRow = (cells: typeof block.headers, fonts: FontSet) => {
    const wrappedCells: StyledLine[][] = cells.map((cell) =>
      wrapStyledSpans(ctx, cell, Math.max(30, colWidth - cellPadX * 2), fonts)
    );
    const maxLines = Math.max(1, ...wrappedCells.map((lines) => lines.length));
    return { wrappedCells, rowHeight: cellPadY * 2 + maxLines * TABLE_LINE_HEIGHT };
  };

  const headerRow = measureRow(block.headers, TABLE_HEADER_FONTS);
  const bodyRows = block.rows.map((row) => measureRow(row, TABLE_CELL_FONTS));
  const tableHeight = headerRow.rowHeight + bodyRows.reduce((sum, r) => sum + r.rowHeight, 0);

  return {
    height: tableHeight + 16,
    draw: (drawCtx) => {
      const topY = startY + 4;
      drawCtx.strokeStyle = '#0d1520';
      drawCtx.lineWidth = 1.5;
      drawCtx.beginPath();
      drawCtx.moveTo(PNG_TEXT_PADDING_X, topY);
      drawCtx.lineTo(PNG_CANVAS_WIDTH - PNG_TEXT_PADDING_X, topY);
      drawCtx.stroke();

      let rowY = topY;
      const drawRow = (row: typeof headerRow, fonts: FontSet, borderColor: string, borderWidth: number) => {
        row.wrappedCells.forEach((lines, colIdx) => {
          let cellY = rowY + cellPadY + 13;
          for (const line of lines) {
            drawStyledLine(drawCtx, line, PNG_TEXT_PADDING_X + colIdx * colWidth + cellPadX, cellY, fonts);
            cellY += TABLE_LINE_HEIGHT;
          }
        });
        rowY += row.rowHeight;
        drawCtx.strokeStyle = borderColor;
        drawCtx.lineWidth = borderWidth;
        drawCtx.beginPath();
        drawCtx.moveTo(PNG_TEXT_PADDING_X, rowY);
        drawCtx.lineTo(PNG_CANVAS_WIDTH - PNG_TEXT_PADDING_X, rowY);
        drawCtx.stroke();
      };

      drawRow(headerRow, TABLE_HEADER_FONTS, '#0d1520', 1);
      bodyRows.forEach((row, idx) => {
        const isLast = idx === bodyRows.length - 1;
        drawRow(row, TABLE_CELL_FONTS, isLast ? '#0d1520' : '#d8d9e8', isLast ? 1.5 : 1);
      });
    },
  };
}

function measureMarkdownBlock(
  ctx: CanvasRenderingContext2D,
  block: MarkdownBlock,
  startY: number
): MeasuredBlock {
  if (block.kind === 'heading') return measureHeadingBlock(ctx, block, startY);
  if (block.kind === 'paragraph') return measureParagraphBlock(ctx, block, startY);
  if (block.kind === 'list') return measureListBlock(ctx, block, startY);
  if (block.kind === 'blockquote') return measureBlockquoteBlock(ctx, block, startY);
  return measureTableBlock(ctx, block, startY);
}

export function exportCardAsPng(card: ExportableCardItem, sessionTitle = 'Consulta Clínica'): void {
  const measureCtx = document.createElement('canvas').getContext('2d');
  if (!measureCtx) return;

  measureCtx.font = PNG_HEADING_FONT;
  const headingLines = wrapPlainLines(measureCtx, card.heading, PNG_MAX_TEXT_WIDTH);
  measureCtx.font = PNG_CITATION_FONT;
  const citationLines =
    card.citations && card.citations.length > 0
      ? wrapPlainLines(measureCtx, `Fontes: ${card.citations.join(' | ')}`, PNG_MAX_TEXT_WIDTH)
      : [];

  let cursorY = PNG_TEXT_PADDING_X + 10 + 28 + headingLines.length * 26 + 28;
  const measuredBlocks: MeasuredBlock[] = [];
  for (const block of parseMarkdownBlocks(card.body)) {
    const measured = measureMarkdownBlock(measureCtx, block, cursorY);
    measuredBlocks.push(measured);
    cursorY += measured.height;
  }

  const canvasHeight = cursorY + (citationLines.length > 0 ? 18 + citationLines.length * 20 : 0) + PNG_TEXT_PADDING_X;
  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = PNG_CANVAS_WIDTH * scale;
  canvas.height = canvasHeight * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(scale, scale);
  ctx.fillStyle = '#dde2ea';
  ctx.fillRect(0, 0, PNG_CANVAS_WIDTH, canvasHeight);
  ctx.fillStyle = '#f4f6f8';
  ctx.fillRect(PNG_CARD_MARGIN, PNG_CARD_MARGIN, PNG_CANVAS_WIDTH - PNG_CARD_MARGIN * 2, canvasHeight - PNG_CARD_MARGIN * 2);

  let y = PNG_TEXT_PADDING_X + 10;
  ctx.fillStyle = '#1565c0';
  ctx.font = PNG_BRAND_FONT;
  ctx.fillText('MedHUSM — Assistente de Raciocínio Clínico', PNG_TEXT_PADDING_X, y);
  y += 28;

  ctx.fillStyle = '#0d1520';
  ctx.font = PNG_HEADING_FONT;
  for (const line of headingLines) {
    ctx.fillText(line, PNG_TEXT_PADDING_X, y);
    y += 26;
  }

  ctx.strokeStyle = '#aaaccc';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PNG_TEXT_PADDING_X, y + 6);
  ctx.lineTo(PNG_CANVAS_WIDTH - PNG_TEXT_PADDING_X, y + 6);
  ctx.stroke();

  for (const measured of measuredBlocks) measured.draw(ctx);

  if (citationLines.length > 0) {
    let citY = cursorY + 14;
    ctx.fillStyle = '#646e7b';
    ctx.font = PNG_CITATION_FONT;
    for (const line of citationLines) {
      ctx.fillText(line, PNG_TEXT_PADDING_X, citY);
      citY += 20;
    }
  }

  const downloadLink = document.createElement('a');
  downloadLink.href = canvas.toDataURL('image/png');
  downloadLink.download = `${buildExportBaseName(card.heading || sessionTitle)}.png`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}
