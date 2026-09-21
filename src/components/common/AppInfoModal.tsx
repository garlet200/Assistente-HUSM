'use client';

import React, { useEffect } from 'react';
import { Info, X, ShieldAlert, Layers } from 'lucide-react';
import { ReliabilityBadge } from '@/components/chat/ReliabilityBadge';
import { Button } from '@/components/ui/Button';

interface AppInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal displaying comprehensive information about MedHUSM:
 * 1. PWA purpose and target audience (HUSM-UFSM).
 * 2. Ethical guidelines and clinical limitations from onboarding.
 * 3. Operation of 3-tier cascade reliability indicators.
 */
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-info-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 'var(--spacing-md)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          background: 'var(--color-semantic-backgroundcolor-backgrounddefault)',
          borderRadius: 'var(--radius-radius-large)',
          boxShadow: 'var(--shadow-extruded-large)',
          maxWidth: '440px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: 'var(--spacing-md) var(--spacing-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 'var(--strokewidth-min) solid var(--color-semantic-boxshadow-boxshadowfxdark)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-radius-full)',
                backgroundColor: 'var(--color-primitive-blue-blue-50)',
                color: 'var(--color-semantic-text-textdark)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Info size={18} />
            </div>
            <h2
              id="app-info-title"
              style={{
                margin: 0,
                fontSize: 'var(--typography-fontsizes-subtitle)',
                fontWeight: 'var(--typography-fontweights-semibold)',
                color: 'var(--color-semantic-text-textdark)',
                fontFamily: 'var(--typography-fontfamilies-mainsans)',
              }}
            >
              Sobre o MedHUSM
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-semantic-text-textdark)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--spacing-min)',
              borderRadius: 'var(--radius-radius-full)',
            }}
            title="Fechar"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div
          style={{
            padding: 'var(--spacing-lg)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-lg)',
            fontFamily: 'var(--typography-fontfamilies-mainsans)',
            fontSize: 'var(--typography-fontsizes-body)',
            lineHeight: 'var(--typography-lineheights-default)',
            color: 'var(--color-semantic-text-textdark)',
          }}
        >
          {/* Seção 1: Apresentação da Plataforma */}
          <div
            style={{
              padding: 'var(--spacing-md)',
              backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddimmer)',
              borderRadius: 'var(--radius-radius-medium)',
              borderLeft: 'var(--strokewidth-max) solid var(--color-semantic-accent-accentprimary)',
            }}
          >
            <p style={{ margin: 0, color: 'var(--color-semantic-text-textdark)' }}>
              O MedHUSM é um assistente clínico virtual baseado em inteligência artificial, desenvolvido como PWA (aplicativo acessível direto pelo navegador, sem necessidade de instalação). Ele foi projetado para apoiar estudantes de medicina e profissionais de saúde do HUSM-UFSM na consulta de hipóteses diagnósticas, revisão de literatura e atualizações sobre tópicos clínicos durante a rotina hospitalar e de estudos.
            </p>
          </div>

          {/* Seção 2: Diretrizes Éticas e Limitações (Onboarding) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', color: 'var(--color-semantic-text-textdark)' }}>
              <ShieldAlert size={18} color="var(--color-semantic-text-textdark)" />
              <h3
                style={{
                  margin: 0,
                  fontSize: 'var(--typography-fontsizes-body)',
                  fontWeight: 'var(--typography-fontweights-semibold)',
                  color: 'var(--color-semantic-text-textdark)',
                }}
              >
                Diretrizes Éticas e Limitações
              </h3>
            </div>

            <p style={{ margin: 0, color: 'var(--color-semantic-text-textdark)' }}>
              O MedHUSM é um assistente de raciocínio clínico.{' '}
              <strong style={{ color: 'var(--color-semantic-text-textdark)', fontWeight: 'var(--typography-fontweights-bold)' }}>Lembre-se:</strong> a inteligência artificial aprimora, mas nunca substitui o julgamento médico.
            </p>

            <ul
              style={{
                margin: 'var(--spacing-min) 0 0 0',
                paddingLeft: 'var(--spacing-md-lg)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-sm)',
                color: 'var(--color-semantic-text-textdark)',
              }}
            >
              <li style={{ color: 'var(--color-semantic-text-textdark)' }}>Não insira dados identificáveis (nomes, CPFs) de pacientes reais.</li>
              <li style={{ color: 'var(--color-semantic-text-textdark)' }}>Todas as respostas geradas devem ser verificadas usando o RAG ou literatura oficial.</li>
              <li style={{ color: 'var(--color-semantic-text-textdark)' }}>O sistema monitora casos para fins educacionais e de auditoria.</li>
            </ul>

            <div
              style={{
                marginTop: 'var(--spacing-min)',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddimmer)',
                borderRadius: 'var(--radius-radius-smallest)',
                fontSize: 'var(--typography-fontsizes-caption)',
                color: 'var(--color-semantic-text-textdark)',
                fontStyle: 'italic',
              }}
            >
              AVISO: Esta é uma ferramenta educacional e não substitui o julgamento ou o cuidado de um profissional de saúde licenciado.
            </div>
          </div>

          {/* Seção 3: Indicadores de Confiabilidade */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', color: 'var(--color-semantic-text-textdark)' }}>
              <Layers size={18} color="var(--color-semantic-text-textdark)" />
              <h3
                style={{
                  margin: 0,
                  fontSize: 'var(--typography-fontsizes-body)',
                  fontWeight: 'var(--typography-fontweights-semibold)',
                  color: 'var(--color-semantic-text-textdark)',
                }}
              >
                Indicadores de Confiabilidade (Cascata de IA)
              </h3>
            </div>

            <p style={{ margin: 0, color: 'var(--color-semantic-text-textdark)' }}>
              Para garantir alta disponibilidade sem interrupções, o app opera com 3 modelos em cascata automática:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-min)' }}>
              {/* Modelo Principal */}
              <div
                style={{
                  padding: 'var(--spacing-sm) var(--spacing-ml)',
                  backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddimmer)',
                  borderRadius: 'var(--radius-radius-small)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-min)' }}>
                  <span style={{ fontWeight: 'var(--typography-fontweights-semibold)', fontSize: 'var(--typography-fontsizes-caption)', color: 'var(--color-semantic-text-textdark)' }}>
                    Modelo Principal: Gemini 3.8 Flash
                  </span>
                  <span style={{ fontSize: 'var(--typography-fontsizes-caption)', color: 'var(--color-semantic-text-textdark)', fontStyle: 'italic' }}>
                    (Sem badge no balão)
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 'var(--typography-fontsizes-caption)', color: 'var(--color-semantic-text-textdark)' }}>
                  Prioridade máxima e alta capacidade analítica. Responde a todas as consultas normais.
                </p>
              </div>

              {/* Fallback 1 */}
              <div
                style={{
                  padding: 'var(--spacing-sm) var(--spacing-ml)',
                  backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddimmer)',
                  borderRadius: 'var(--radius-radius-small)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-min)' }}>
                  <span style={{ fontWeight: 'var(--typography-fontweights-semibold)', fontSize: 'var(--typography-fontsizes-caption)', color: 'var(--color-semantic-text-textdark)' }}>
                    Fallback 1: Gemini 3.5 Flash
                  </span>
                  <ReliabilityBadge reliability="standard" modelTier="fallback_1" />
                </div>
                <p style={{ margin: 0, fontSize: 'var(--typography-fontsizes-caption)', color: 'var(--color-semantic-text-textdark)' }}>
                  Acionado caso o modelo principal sofra lentidão (&gt; 45s) ou indisponibilidade temporária.
                </p>
              </div>

              {/* Fallback 2 */}
              <div
                style={{
                  padding: 'var(--spacing-sm) var(--spacing-ml)',
                  backgroundColor: 'var(--color-semantic-backgroundcolor-backgrounddimmer)',
                  borderRadius: 'var(--radius-radius-small)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-min)' }}>
                  <span style={{ fontWeight: 'var(--typography-fontweights-semibold)', fontSize: 'var(--typography-fontsizes-caption)', color: 'var(--color-semantic-text-textdark)' }}>
                    Fallback 2: Gemini 3.5 Flash-Lite
                  </span>
                  <ReliabilityBadge reliability="reduced" modelTier="fallback_2" />
                </div>
                <p style={{ margin: 0, fontSize: 'var(--typography-fontsizes-caption)', color: 'var(--color-semantic-text-textdark)' }}>
                  Contingência rápida em casos de alta demanda global ou picos de tráfego.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div
          style={{
            padding: 'var(--spacing-md) var(--spacing-lg)',
            borderTop: 'var(--strokewidth-min) solid var(--color-semantic-boxshadow-boxshadowfxdark)',
            display: 'flex',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Button
            onClick={onClose}
            style={{
              width: '100%',
              maxWidth: '200px',
              minHeight: '48px',
              height: '48px',
              color: 'var(--color-semantic-text-textdark)',
            }}
          >
            Entendi
          </Button>
        </div>
      </div>
    </div>
  );
}
