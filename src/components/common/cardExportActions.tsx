'use client';

/**
 * @file cardExportActions.tsx
 * @description Construtor das 3 ações de exportação individual de card (Copiar texto,
 * Exportar PDF e Exportar imagem .png) para o ActionPopupModal dos cards do Chat Clínico.
 */

import React from 'react';
import { Copy, FileDown, Image as ImageIcon } from 'lucide-react';
import { ActionPopupItem } from './ActionPopupModal';
import {
  copyCardTextToClipboard,
  exportCardAsPdf,
  exportCardAsPng,
  ExportableCardItem,
} from '@/lib/utils/exporters';

export function buildCardExportPopupActions(params: {
  cardItem: ExportableCardItem;
  sessionTitle?: string;
}): ActionPopupItem[] {
  const { cardItem, sessionTitle = 'Consulta Clínica' } = params;

  return [
    {
      id: 'copy-clipboard',
      label: 'Copiar texto',
      icon: <Copy size={16} />,
      onClick: async () => {
        await copyCardTextToClipboard(cardItem);
      },
    },
    {
      id: 'export-card-pdf',
      label: 'Exportar PDF',
      icon: <FileDown size={16} />,
      onClick: () => exportCardAsPdf(cardItem, sessionTitle),
    },
    {
      id: 'export-png',
      label: 'Exportar imagem',
      icon: <ImageIcon size={16} />,
      onClick: () => exportCardAsPng(cardItem, sessionTitle),
    },
  ];
}
