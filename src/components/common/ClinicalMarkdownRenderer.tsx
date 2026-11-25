'use client';

/**
 * @file ClinicalMarkdownRenderer.tsx
 * @description Renderizador editorial de Markdown clínico (Tufte CSS + Booktabs + GFM)
 * para respostas de IA, simulações de estudo e enunciados MCQ.
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './ClinicalMarkdown.module.css';

interface ClinicalMarkdownRendererProps {
  content: string;
}

export function ClinicalMarkdownRenderer({ content }: ClinicalMarkdownRendererProps) {
  return (
    <div className={styles.clinicalProse}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children, ...props }) => (
            <div className={styles.tableWrapper}>
              <table {...props}>{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
