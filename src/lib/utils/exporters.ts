/**
 * @file exporters.ts
 * @description Utilitários nativos do navegador para exportação de cards e sessões completas
 * (Área de transferência, impressão/PDF A4 individual ou da conversa, e imagem .png via Canvas).
 */

export interface ExportableCardItem {
  heading: string;
  body: string;
  timestamp?: string;
  citations?: string[];
}

const PNG_CANVAS_WIDTH = 760;
const PNG_CARD_MARGIN = 20;
const PNG_TEXT_PADDING_X = 44;
const PNG_MAX_TEXT_WIDTH = PNG_CANVAS_WIDTH - PNG_TEXT_PADDING_X * 2;
const PNG_BRAND_FONT = '700 14px monospace';
const PNG_HEADING_FONT = '600 18px sans-serif';
const PNG_BODY_FONT = '400 15px Georgia, serif';
const PNG_CITATION_FONT = '400 12px monospace';

function buildExportBaseName(rawName: string): string {
  const cleaned = rawName
    .replace(/[\\/:*?"<>|\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 60);
  return `MedHUSM - ${cleaned || 'Exportacao'}`;
}

function stripMarkdownFormatting(markdownText: string): string {
  return markdownText
    .replace(/\[([^\]]+)\]\(#sugestao-[^)]+\)/g, '')
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

/** 1. Copies the formatted card text to the system clipboard. */
export async function copyCardTextToClipboard(card: ExportableCardItem): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(formatCardAsPlainText(card));
    return true;
  } catch (clipboardError) {
    console.error('Erro ao copiar texto para a área de transferência:', clipboardError);
    return false;
  }
}

function escapeHtmlEntities(rawString: string): string {
  return rawString
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatBodyToSemanticParagraphsHtml(plainBody: string): string {
  const paragraphs = plainBody.split(/\n{2,}/).filter((block) => block.trim().length > 0);
  if (paragraphs.length === 0) return '<p></p>';
  return paragraphs
    .map((paragraph) => `<p>${escapeHtmlEntities(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

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
      const bodyHtml = formatBodyToSemanticParagraphsHtml(stripMarkdownFormatting(card.body));
      const timestampHtml = card.timestamp
        ? `<div class="time">${escapeHtmlEntities(card.timestamp)}</div>`
        : '';
      return `<article class="card">
        <div class="card-header">
          <h2>${escapeHtmlEntities(card.heading)}</h2>
          ${timestampHtml}
        </div>
        <hr />
        <div class="card-body">${bodyHtml}</div>
        ${citationsHtml}
      </article>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtmlEntities(exportTitle)}</title>
  <style>
    @page { size: A4 portrait; margin: 18mm 15mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #ffffff; color: #0d1520; font-family: Arial, Helvetica, sans-serif; }
    header { border-bottom: 2px solid #1565c0; padding-bottom: 10px; margin-bottom: 18px; }
    h1 { font-size: 18px; color: #1565c0; margin: 0 0 4px 0; break-after: avoid; page-break-after: avoid; }
    h2 { font-size: 15px; line-height: 1.35; margin: 0; color: #0d1520; break-after: avoid; page-break-after: avoid; }
    .meta { font-size: 11px; color: #646e7b; }
    .card { border: 1px solid #d8d9e8; background: #ffffff; padding: 14px 16px; margin-bottom: 14px; break-inside: auto; page-break-inside: auto; }
    .card-header { display: block; break-inside: avoid; page-break-inside: avoid; }
    .time { font-size: 11px; color: #646e7b; margin-top: 4px; }
    hr { border: none; border-top: 1px solid #d8d9e8; margin: 10px 0; }
    .card-body { font-family: Georgia, 'Times New Roman', serif; font-size: 13.5px; line-height: 1.55; color: #0d1520; }
    .card-body p { margin: 0 0 10px 0; orphans: 3; widows: 3; }
    .card-body p:last-child { margin-bottom: 0; }
    .citations { margin-top: 12px; font-size: 11px; color: #465161; break-inside: avoid; page-break-inside: avoid; }
    .citations ul { margin: 4px 0 0 16px; padding: 0; }
  </style>
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
      if (document.body.contains(printIframe)) {
        document.body.removeChild(printIframe);
      }
    }, 1500);
  }, 250);
}

/** 2. Exports a single card as a PDF via native browser print/Save-as-PDF. */
export function exportCardAsPdf(card: ExportableCardItem, sessionTitle = 'Consulta Clínica'): void {
  const exportTitle = buildExportBaseName(card.heading || sessionTitle);
  triggerHtmlPrintDialog(buildPrintableHtmlDocument(exportTitle, [card]), exportTitle);
}

/** 3. Exports the entire session conversation as a formatted PDF. */
export function exportConversationAsPdf(sessionTitle: string, cards: ExportableCardItem[]): void {
  const exportTitle = buildExportBaseName(sessionTitle);
  const safeCards =
    cards.length > 0
      ? cards
      : [{ heading: sessionTitle, body: 'Nenhuma interação registrada nesta sessão.' }];
  triggerHtmlPrintDialog(buildPrintableHtmlDocument(exportTitle, safeCards), exportTitle);
}

function splitOversizedWord(ctx: CanvasRenderingContext2D, word: string, maxWidth: number): string[] {
  const chunks: string[] = [];
  let currentChunk = '';
  for (const char of word) {
    const candidate = currentChunk + char;
    if (ctx.measureText(candidate).width > maxWidth && currentChunk) {
      chunks.push(currentChunk);
      currentChunk = char;
    } else {
      currentChunk = candidate;
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

function wrapCanvasParagraphs(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const wrappedLines: string[] = [];
  for (const rawLine of text.split('\n')) {
    if (!rawLine.trim()) {
      wrappedLines.push('');
      continue;
    }
    let currentLine = '';
    for (const word of rawLine.split(' ')) {
      if (ctx.measureText(word).width > maxWidth) {
        if (currentLine) {
          wrappedLines.push(currentLine);
          currentLine = '';
        }
        const wordChunks = splitOversizedWord(ctx, word, maxWidth);
        wrappedLines.push(...wordChunks.slice(0, -1));
        currentLine = wordChunks[wordChunks.length - 1] || '';
        continue;
      }
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        wrappedLines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) wrappedLines.push(currentLine);
  }
  return wrappedLines;
}

/** 4. Renders the card onto a high-DPI HTML5 Canvas and downloads it as a .png image. */
export function exportCardAsPng(card: ExportableCardItem, sessionTitle = 'Consulta Clínica'): void {
  const measureCtx = document.createElement('canvas').getContext('2d');
  if (!measureCtx) return;

  measureCtx.font = PNG_HEADING_FONT;
  const headingLines = wrapCanvasParagraphs(measureCtx, card.heading, PNG_MAX_TEXT_WIDTH);
  measureCtx.font = PNG_BODY_FONT;
  const bodyLines = wrapCanvasParagraphs(measureCtx, stripMarkdownFormatting(card.body), PNG_MAX_TEXT_WIDTH);
  measureCtx.font = PNG_CITATION_FONT;
  const citationLines =
    card.citations && card.citations.length > 0
      ? wrapCanvasParagraphs(measureCtx, `Fontes: ${card.citations.join(' | ')}`, PNG_MAX_TEXT_WIDTH)
      : [];

  const bodyLineHeight = 24;
  const canvasHeight =
    PNG_TEXT_PADDING_X * 2 +
    40 +
    headingLines.length * 26 +
    24 +
    bodyLines.length * bodyLineHeight +
    (citationLines.length > 0 ? 24 + citationLines.length * 20 : 0);

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

  ctx.save();
  ctx.beginPath();
  ctx.rect(24, 24, PNG_CANVAS_WIDTH - 48, canvasHeight - 48);
  ctx.clip();

  let cursorY = PNG_TEXT_PADDING_X + 10;
  ctx.fillStyle = '#1565c0';
  ctx.font = PNG_BRAND_FONT;
  ctx.fillText('MedHUSM — Assistente de Raciocínio Clínico', PNG_TEXT_PADDING_X, cursorY);
  cursorY += 28;

  ctx.fillStyle = '#0d1520';
  ctx.font = PNG_HEADING_FONT;
  for (const line of headingLines) {
    ctx.fillText(line, PNG_TEXT_PADDING_X, cursorY);
    cursorY += 26;
  }

  cursorY += 6;
  ctx.strokeStyle = '#aaaccc';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PNG_TEXT_PADDING_X, cursorY);
  ctx.lineTo(PNG_CANVAS_WIDTH - PNG_TEXT_PADDING_X, cursorY);
  ctx.stroke();
  cursorY += 22;

  ctx.fillStyle = '#0d1520';
  ctx.font = PNG_BODY_FONT;
  for (const line of bodyLines) {
    ctx.fillText(line, PNG_TEXT_PADDING_X, cursorY);
    cursorY += bodyLineHeight;
  }

  if (citationLines.length > 0) {
    cursorY += 12;
    ctx.fillStyle = '#646e7b';
    ctx.font = PNG_CITATION_FONT;
    for (const line of citationLines) {
      ctx.fillText(line, PNG_TEXT_PADDING_X, cursorY);
      cursorY += 20;
    }
  }

  ctx.restore();

  const fileName = `${buildExportBaseName(card.heading || sessionTitle)}.png`;
  const downloadLink = document.createElement('a');
  downloadLink.href = canvas.toDataURL('image/png');
  downloadLink.download = fileName;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}
