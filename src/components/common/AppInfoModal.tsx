'use client';

/**
 * @file AppInfoModal.tsx
 * @description Modal informativo institucional apresentando o propósito da PWA MedHUSM (HUSM-UFSM),
 * diretrizes éticas de uso clínico e explicação dos indicadores de confiabilidade da cascata de IA.
 */

import React, { useEffect } from 'react';
import { X, ShieldAlert, Layers } from 'lucide-react';
import { ReliabilityBadge } from '@/components/chat/ReliabilityBadge';
import { BrandLogo } from '@/components/common/BrandLogo';
import { Button } from '@/components/ui/Button';
import { CASCADE_CONFIG } from '@/lib/ai/cascadeConfig';
import { MANDATORY_CLINICAL_DISCLAIMER } from '@/lib/ai/prompts';
import { ETHICAL_GUIDELINE_ITEMS } from '@/lib/constants/session';
import styles from './AppInfoModal.module.css';

interface AppInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function ModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className={styles.header}>
      <div className={styles.headerTitleGroup}>
        <div className={styles.headerIconBadge}>
          <BrandLogo variant="icon" height={20} decorative />
        </div>
        <h2 id="app-info-title" className={styles.headerTitle}>
          Sobre o MedHUSM
        </h2>
      </div>

      <button
        type="button"
        onClick={onClose}
        className={`neu-button ${styles.closeButton}`}
        title="Fechar"
        aria-label="Fechar"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function EthicalGuidelinesSection() {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <ShieldAlert size={18} color="var(--color-semantic-text-textdark)" />
        <h3 className={styles.sectionTitle}>Diretrizes Éticas e Limitações</h3>
      </div>

      <p style={{ margin: 0, color: 'var(--color-semantic-text-textdark)' }}>
        O MedHUSM é um assistente de raciocínio clínico.{' '}
        <strong
          style={{
            color: 'var(--color-semantic-text-textdark)',
            fontWeight: 'var(--typography-fontweights-bold)',
          }}
        >
          Lembre-se:
        </strong>{' '}
        a inteligência artificial aprimora, mas nunca substitui o julgamento médico.
      </p>

      <ul className={styles.guidelinesList}>
        {ETHICAL_GUIDELINE_ITEMS.map((guidelineText) => (
          <li key={guidelineText}>{guidelineText}</li>
        ))}
      </ul>

      <div className={styles.disclaimerBox}>{MANDATORY_CLINICAL_DISCLAIMER}</div>
    </div>
  );
}

function CascadeReliabilitySection() {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <Layers size={18} color="var(--color-semantic-text-textdark)" />
        <h3 className={styles.sectionTitle}>Indicadores de Confiabilidade (Cascata de IA)</h3>
      </div>

      <p style={{ margin: 0, color: 'var(--color-semantic-text-textdark)' }}>
        Para garantir alta disponibilidade sem interrupções, o app opera com {CASCADE_CONFIG.length}{' '}
        modelos em cascata automática:
      </p>

      <div className={styles.tiersList}>
        {CASCADE_CONFIG.map((tierConfig) => (
          <div key={tierConfig.tier} className={styles.tierCard}>
            <div className={styles.tierCardHeader}>
              <span className={styles.tierTitle}>
                {tierConfig.badgeLabel}: {tierConfig.displayName}
              </span>
              {tierConfig.reliability.badgeVisible ? (
                <ReliabilityBadge
                  reliability={tierConfig.reliability.level}
                  modelTier={tierConfig.tier}
                  modelDisplayName={tierConfig.displayName}
                />
              ) : (
                <span className={styles.noBadgeNote}>(Sem badge no balão)</span>
              )}
            </div>
            <p className={styles.tierDescription}>{tierConfig.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AppInfoModal({ isOpen, onClose }: AppInfoModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-info-title"
      className={styles.backdrop}
      onClick={handleBackdropClick}
    >
      <div className={styles.modalDialog}>
        <ModalHeader onClose={onClose} />

        <div className={styles.body}>
          <div className={styles.introCallout}>
            <p style={{ margin: 0, color: 'var(--color-semantic-text-textdark)' }}>
              O MedHUSM é um assistente clínico virtual baseado em inteligência artificial,
              desenvolvido como PWA (aplicativo acessível direto pelo navegador, sem necessidade de
              instalação). Ele foi projetado para apoiar estudantes de medicina e profissionais de
              saúde do HUSM-UFSM na consulta de hipóteses diagnósticas, revisão de literatura e
              atualizações sobre tópicos clínicos durante a rotina hospitalar e de estudos.
            </p>
          </div>

          <EthicalGuidelinesSection />
          <CascadeReliabilitySection />
        </div>

        <div className={styles.footer}>
          <Button onClick={onClose} className={styles.confirmButton}>
            Entendi
          </Button>
        </div>
      </div>
    </div>
  );
}
