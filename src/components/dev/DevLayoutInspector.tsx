'use client';

/**
 * @file DevLayoutInspector.tsx
 * @description Modo Dev Secreto (Layout X-Ray Inspector) com ativação por Konami Code, Ctrl+Shift+D ou DevTools.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DevHoverOverlay, type InspectedMetrics } from './DevHoverOverlay';
import {
  clearLayoutOutlineAttributes,
  isEditableTarget,
  KONAMI_SEQUENCE,
  readWorkspaceRulerRect,
  syncLayoutOutlineAttributes,
  type WorkspaceRulerRect,
} from './devLayoutUtils';
import styles from './DevLayoutInspector.module.css';

declare global {
  interface Window {
    toggleDevMode?: () => boolean;
  }
}

function formatSides(sides: { top: number; right: number; bottom: number; left: number }): string {
  return `${sides.top} ${sides.right} ${sides.bottom} ${sides.left} px`;
}

function DevHudDetails({ metrics }: { metrics: InspectedMetrics | null }) {
  if (!metrics) {
    return <div className={styles.hudEmpty}>Mova o cursor sobre um elemento para inspecionar.</div>;
  }
  return (
    <>
      <div className={styles.hudSelector}>{metrics.selector}</div>
      <div className={styles.hudRow}>
        <span className={styles.hudLabel}>Dimensões</span>
        <span className={styles.hudValue}>{metrics.width} × {metrics.height} px</span>
      </div>
      <div className={styles.hudRow}>
        <span className={styles.hudLabel}>Padding</span>
        <span className={styles.hudValue}>{formatSides(metrics.padding)}</span>
      </div>
      <div className={styles.hudRow}>
        <span className={styles.hudLabel}>Margin</span>
        <span className={styles.hudValue}>{formatSides(metrics.margin)}</span>
      </div>
      <div className={styles.hudRow}>
        <span className={styles.hudLabel}>Gap</span>
        <span className={styles.hudValue}>{metrics.gap}</span>
      </div>
      <div className={styles.hudRow}>
        <span className={styles.hudLabel}>Radius</span>
        <span className={styles.hudValue}>{metrics.borderRadius}</span>
      </div>
      <div className={styles.hudRow}>
        <span className={styles.hudLabel}>Overflow</span>
        <span className={styles.hudValue}>{metrics.overflow}</span>
      </div>
    </>
  );
}

function DevHudPanel({
  showOutlines,
  showGridRuler,
  showHoverXRay,
  metrics,
  onToggleOutlines,
  onToggleGridRuler,
  onToggleHoverXRay,
  onClose,
}: {
  showOutlines: boolean;
  showGridRuler: boolean;
  showHoverXRay: boolean;
  metrics: InspectedMetrics | null;
  onToggleOutlines: () => void;
  onToggleGridRuler: () => void;
  onToggleHoverXRay: () => void;
  onClose: () => void;
}) {
  return (
    <aside className={styles.hudPanel} data-dev-inspector="true" aria-label="Layout X-Ray Inspector">
      <div className={styles.hudHeader}>
        <span className={styles.hudTitle}>Layout X-Ray Inspector</span>
        <button type="button" className={styles.hudCloseBtn} onClick={onClose}>
          Fechar (ESC)
        </button>
      </div>

      <div className={styles.hudButtons}>
        <button type="button" className={`${styles.hudBtn} ${showOutlines ? styles.hudBtnActive : ''}`} onClick={onToggleOutlines}>
          Outlines
        </button>
        <button type="button" className={`${styles.hudBtn} ${showGridRuler ? styles.hudBtnActive : ''}`} onClick={onToggleGridRuler}>
          Régua de Grid
        </button>
        <button type="button" className={`${styles.hudBtn} ${showHoverXRay ? styles.hudBtnActive : ''}`} onClick={onToggleHoverXRay}>
          Raio-X de Hover
        </button>
      </div>

      <div className={styles.hudDetails}>
        <DevHudDetails metrics={metrics} />
      </div>

      <div className={styles.hudLegend}>
        <span className={styles.legendItem}><i className={styles.legendSwatch} style={{ background: 'rgba(156, 39, 176, 0.85)' }} />Grid</span>
        <span className={styles.legendItem}><i className={styles.legendSwatch} style={{ background: 'rgba(33, 150, 243, 0.85)' }} />Flex</span>
        <span className={styles.legendItem}><i className={styles.legendSwatch} style={{ background: 'rgba(244, 67, 54, 0.85)' }} />Overflow</span>
        <span className={styles.legendItem}><i className={styles.legendSwatch} style={{ background: 'rgba(76, 175, 80, 0.85)' }} />Interativo</span>
      </div>
    </aside>
  );
}

function useDevModeTriggers(isOpen: boolean, setIsOpen: React.Dispatch<React.SetStateAction<boolean>>) {
  const konamiIndexRef = useRef(0);
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const toggleDevMode = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, [setIsOpen]);

  useEffect(() => {
    window.toggleDevMode = () => {
      const nextState = !isOpenRef.current;
      setIsOpen(nextState);
      return nextState;
    };

    const htmlObserver = new MutationObserver(() => {
      const attrActive = document.documentElement.getAttribute('data-dev-mode') === 'true';
      setIsOpen((prev) => (prev === attrActive ? prev : attrActive));
    });
    htmlObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-dev-mode'] });

    return () => {
      delete window.toggleDevMode;
      htmlObserver.disconnect();
    };
  }, [setIsOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        toggleDevMode();
        return;
      }
      if (event.key === 'Escape' && isOpenRef.current) {
        setIsOpen(false);
        return;
      }
      if (isEditableTarget(event.target) || isEditableTarget(document.activeElement)) {
        konamiIndexRef.current = 0;
        return;
      }

      const expected = KONAMI_SEQUENCE[konamiIndexRef.current];
      const normalizedKey = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (normalizedKey === expected) {
        konamiIndexRef.current += 1;
        if (konamiIndexRef.current === KONAMI_SEQUENCE.length) {
          konamiIndexRef.current = 0;
          toggleDevMode();
        }
        return;
      }
      konamiIndexRef.current = normalizedKey === KONAMI_SEQUENCE[0] ? 1 : 0;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsOpen, toggleDevMode]);
}

export function DevLayoutInspector() {
  const [isOpen, setIsOpen] = useState(false);
  const [showOutlines, setShowOutlines] = useState(true);
  const [showGridRuler, setShowGridRuler] = useState(true);
  const [showHoverXRay, setShowHoverXRay] = useState(true);
  const [metrics, setMetrics] = useState<InspectedMetrics | null>(null);
  const [rulerRect, setRulerRect] = useState<WorkspaceRulerRect | null>(null);

  useDevModeTriggers(isOpen, setIsOpen);

  useEffect(() => {
    const root = document.documentElement;
    if (!isOpen) {
      root.removeAttribute('data-dev-mode');
      root.removeAttribute('data-dev-outlines');
      clearLayoutOutlineAttributes();
      return;
    }
    root.setAttribute('data-dev-mode', 'true');
    if (showOutlines) {
      root.removeAttribute('data-dev-outlines');
    } else {
      root.setAttribute('data-dev-outlines', 'false');
    }
  }, [isOpen, showOutlines]);

  useEffect(() => {
    if (!isOpen) return;
    let rafId = 0;
    const refreshLayoutData = (): void => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        syncLayoutOutlineAttributes();
        setRulerRect(showGridRuler ? readWorkspaceRulerRect() : null);
      });
    };

    refreshLayoutData();
    const domObserver = new MutationObserver(refreshLayoutData);
    domObserver.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', refreshLayoutData, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      domObserver.disconnect();
      window.removeEventListener('resize', refreshLayoutData);
    };
  }, [isOpen, showGridRuler]);

  if (!isOpen) return null;

  return (
    <>
      {showGridRuler && rulerRect && (
        <div
          className={styles.gridRulerOverlay}
          data-dev-inspector="true"
          aria-hidden="true"
          style={{
            top: rulerRect.top,
            left: rulerRect.left,
            width: rulerRect.width,
            height: rulerRect.height,
            padding: rulerRect.padding,
            gap: rulerRect.gap,
          }}
        >
          <div className={styles.gridRulerColumn}><span className={styles.gridRulerLabel}>COL 1</span></div>
          <div className={styles.gridRulerColumn}><span className={styles.gridRulerLabel}>COL 2</span></div>
          <div className={styles.gridRulerColumn}><span className={styles.gridRulerLabel}>COL 3</span></div>
        </div>
      )}

      <DevHoverOverlay enabled={showHoverXRay} metrics={metrics} onMetricsChange={setMetrics} />

      <DevHudPanel
        showOutlines={showOutlines}
        showGridRuler={showGridRuler}
        showHoverXRay={showHoverXRay}
        metrics={showHoverXRay ? metrics : null}
        onToggleOutlines={() => setShowOutlines((prev) => !prev)}
        onToggleGridRuler={() => setShowGridRuler((prev) => !prev)}
        onToggleHoverXRay={() => setShowHoverXRay((prev) => !prev)}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
