/**
 * @file pdfExporter.ts
 * @description Exportador vetorial de PDF via impressão HTML semântica com estilos editoriais Tufte/Booktabs.
 */

import { buildExportBaseName, type ExportableCardItem } from './exportShared';
import {
  parseMarkdownBlocks,
  type InlineSpan,
  type MarkdownBlock,
} from './markdownParser';

function escapeHtmlEntities(rawString: string): string {
  return rawString
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInlineSpansHtml(spans: InlineSpan[]): string {
  return spans
    .map((span) => {
      const safe = escapeHtmlEntities(span.text);
      if (span.kind === 'bold') return `<strong>${safe}</strong>`;
      if (span.kind === 'italic') return `<em>${safe}</em>`;
      if (span.kind === 'code') return `<code>${safe}</code>`;
      return safe;
    })
    .join('');
}

function renderTableHtml(block: Extract<MarkdownBlock, { kind: 'table' }>): string {
  const headCells = block.headers
    .map((cell) => `<th>${renderInlineSpansHtml(cell)}</th>`)
    .join('');
  const bodyRows = block.rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${renderInlineSpansHtml(cell)}</td>`).join('')}</tr>`
    )
    .join('');
  return `<table><thead><tr>${headCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
}

function renderBlockHtml(block: MarkdownBlock): string {
  if (block.kind === 'heading') {
    const tag = block.level === 3 ? 'h3' : 'h2';
    return `<${tag}>${renderInlineSpansHtml(block.spans)}</${tag}>`;
  }
  if (block.kind === 'paragraph') {
    return `<p>${renderInlineSpansHtml(block.spans)}</p>`;
  }
  if (block.kind === 'blockquote') {
    const inner = block.paragraphs.map((p) => `<p>${renderInlineSpansHtml(p)}</p>`).join('');
    return `<blockquote>${inner}</blockquote>`;
  }
  if (block.kind === 'list') {
    const tag = block.ordered ? 'ol' : 'ul';
    const items = block.items.map((item) => `<li>${renderInlineSpansHtml(item.spans)}</li>`).join('');
    return `<${tag}>${items}</${tag}>`;
  }
  return renderTableHtml(block);
}

function renderMarkdownBodyHtml(markdownBody: string): string {
  const blocks = parseMarkdownBlocks(markdownBody);
  if (blocks.length === 0) return '<p></p>';
  return blocks.map(renderBlockHtml).join('');
}

const PRINT_DOCUMENT_STYLES = `
  @page { size: A4 portrait; margin: 18mm 15mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #ffffff; color: #0d1520; font-family: Arial, Helvetica, sans-serif; }
  header { border-bottom: 2px solid #1565c0; padding-bottom: 10px; margin-bottom: 18px; }
  h1 { font-size: 18px; color: #1565c0; margin: 0 0 4px 0; break-after: avoid; page-break-after: avoid; }
  .card-title { font-size: 15px; line-height: 1.35; margin: 0; color: #0d1520; break-after: avoid; page-break-after: avoid; }
  .meta { font-size: 11px; color: #646e7b; }
  .card { border: 1px solid #d8d9e8; background: #ffffff; padding: 14px 16px; margin-bottom: 14px; break-inside: auto; page-break-inside: auto; }
  .card-header { display: block; break-inside: avoid; page-break-inside: avoid; }
  .time { font-size: 11px; color: #646e7b; margin-top: 4px; }
  hr { border: none; border-top: 1px solid #d8d9e8; margin: 10px 0; }
  .card-body { font-family: Georgia, 'Times New Roman', serif; font-size: 13.5px; line-height: 1.65; color: #0d1520; }
  .card-body p { margin: 0 0 12px 0; orphans: 3; widows: 3; }
  .card-body p:last-child { margin-bottom: 0; }
  .card-body h2, .card-body h3 { font-family: Arial, Helvetica, sans-serif; font-weight: 600; line-height: 1.25; color: #0d1520; margin: 18px 0 6px 0; break-after: avoid; page-break-after: avoid; }
  .card-body h2:first-child, .card-body h3:first-child { margin-top: 0; }
  .card-body h2 { font-size: 14.5px; padding-bottom: 4px; border-bottom: 1px solid #d8d9e8; }
  .card-body h3 { font-size: 13.5px; }
  .card-body ul, .card-body ol { margin: 0 0 12px 0; padding-left: 20px; }
  .card-body li { margin-bottom: 5px; }
  .card-body blockquote { margin: 14px 0; padding: 10px 14px; border-left: 3px solid #1565c0; background: #f4f6f8; border-radius: 0 6px 6px 0; break-inside: avoid; }
  .card-body table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 12px; break-inside: avoid; }
  .card-body thead th { font-family: Arial, Helvetica, sans-serif; font-weight: 600; text-align: left; padding: 6px 8px; border-top: 2px solid #0d1520; border-bottom: 1px solid #0d1520; }
  .card-body tbody td { padding: 6px 8px; border-bottom: 1px solid #d8d9e8; font-variant-numeric: tabular-nums; vertical-align: top; }
  .card-body tbody tr:last-child td { border-bottom: 2px solid #0d1520; }
  .card-body code { font-family: ui-monospace, Consolas, monospace; font-size: 12px; background: #f0f2f5; padding: 1px 4px; border-radius: 3px; }
  .citations { margin-top: 12px; font-size: 11px; color: #465161; break-inside: avoid; page-break-inside: avoid; }
  .citations ul { margin: 4px 0 0 16px; padding: 0; }
`;

function buildPrintableHtmlDocument(exportTitle: string, cards: ExportableCardItem[]): string {
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  const cardsHtml = cards
    .map((card) => {
      const citationsHtml =
        card.citations && card.citations.length > 0
          ? `<div class="citations"><strong>Fontes (RAG):</strong><ul>${card.citations
              .map((cit) => `<li>${escapeHtmlEntities(cit)}</li>`)
              .join('')}</ul></div>`
          : '';
      const timestampHtml = card.timestamp
        ? `<div class="time">${escapeHtmlEntities(card.timestamp)}</div>`
        : '';
      return `<article class="card">
        <div class="card-header">
          <h2 class="card-title">${escapeHtmlEntities(card.heading)}</h2>
          ${timestampHtml}
        </div>
        <hr />
        <div class="card-body">${renderMarkdownBodyHtml(card.body)}</div>
        ${citationsHtml}
      </article>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtmlEntities(exportTitle)}</title>
  <style>${PRINT_DOCUMENT_STYLES}</style>
</head>
<body>
  <header>
    <h1>${escapeHtmlEntities(exportTitle)}</h1>
    <div class="meta">Exportado em ${formattedDate}</div>
  </header>
  ${cardsHtml}
</body>
</html>`;
}

function triggerHtmlPrintDialog(htmlContent: string, exportTitle: string): void {
  const printIframe = document.createElement('iframe');
  printIframe.style.position = 'fixed';
  printIframe.style.left = '-9999px';
  printIframe.style.top = '0';
  printIframe.style.width = '794px';
  printIframe.style.height = '1123px';
  printIframe.style.border = '0';
  document.body.appendChild(printIframe);

  const iframeDoc = printIframe.contentWindow?.document;
  if (!iframeDoc || !printIframe.contentWindow) {
    document.body.removeChild(printIframe);
    return;
  }

  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();

  const previousParentTitle = document.title;
  document.title = exportTitle;

  setTimeout(() => {
    printIframe.contentWindow?.focus();
    printIframe.contentWindow?.print();
    setTimeout(() => {
      document.title = previousParentTitle;
      if (document.body.contains(printIframe)) document.body.removeChild(printIframe);
    }, 1500);
  }, 250);
}

export function exportCardAsPdf(card: ExportableCardItem, sessionTitle = 'Consulta Clínica'): void {
  const exportTitle = buildExportBaseName(card.heading || sessionTitle);
  triggerHtmlPrintDialog(buildPrintableHtmlDocument(exportTitle, [card]), exportTitle);
}

export function exportConversationAsPdf(sessionTitle: string, cards: ExportableCardItem[]): void {
  const exportTitle = buildExportBaseName(sessionTitle);
  const safeCards =
    cards.length > 0
      ? cards
      : [{ heading: sessionTitle, body: 'Nenhuma interação registrada nesta sessão.' }];
  triggerHtmlPrintDialog(buildPrintableHtmlDocument(exportTitle, safeCards), exportTitle);
}
