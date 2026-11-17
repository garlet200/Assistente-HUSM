'use client';

/**
 * @file DevHoverOverlay.tsx
 * @description Overlay de raio-X em tempo real sob o cursor exibindo camadas de margin, padding e content box.
 */

import React, { useEffect, useRef } from 'react';
import styles from './DevLayoutInspector.module.css';

export interface BoxSides {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface InspectedMetrics {
  selector: string;
  width: number;
  height: number;
  rect: { top: number; left: number; width: number; height: number };
  margin: BoxSides;
  padding: BoxSides;
  border: BoxSides;
  gap: string;
  borderRadius: string;
  overflow: string;
}

interface BandRect {
  key: string;
  value: number;
  top: number;
  left: number;
  width: number;
  height: number;
}

interface DevHoverOverlayProps {
  enabled: boolean;
  metrics: InspectedMetrics | null;
  onMetricsChange: (metrics: InspectedMetrics | null) => void;
}

function roundPx(rawValue: string): number {
  const parsed = Number.parseFloat(rawValue);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 10) / 10;
}

function cleanClassName(rawClass: string): string {
  const moduleMatch = rawClass.match(/^[^_]+_(.+)__[^_]+$/);
  return moduleMatch ? moduleMatch[1] : rawClass;
}

function formatReadableSelector(element: HTMLElement): string {
  const tag = element.tagName.toLowerCase();
  const classList = Array.from(element.classList)
    .map(cleanClassName)
    .filter(Boolean)
    .slice(0, 3);
  const idPart = element.id ? `#${element.id}` : '';
  const classPart = classList.length > 0 ? `.${classList.join('.')}` : '';
  return `${tag}${idPart}${classPart}`;
}

function readBoxMetrics(element: HTMLElement): InspectedMetrics {
  const rect = element.getBoundingClientRect();
  const computed = window.getComputedStyle(element);
  const overflow =
    computed.overflowX === computed.overflowY
      ? computed.overflow
      : `${computed.overflowX} / ${computed.overflowY}`;

  return {
    selector: formatReadableSelector(element),
    width: Math.round(rect.width * 10) / 10,
    height: Math.round(rect.height * 10) / 10,
    rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
    margin: {
      top: roundPx(computed.marginTop),
      right: roundPx(computed.marginRight),
      bottom: roundPx(computed.marginBottom),
      left: roundPx(computed.marginLeft),
    },
    padding: {
      top: roundPx(computed.paddingTop),
      right: roundPx(computed.paddingRight),
      bottom: roundPx(computed.paddingBottom),
      left: roundPx(computed.paddingLeft),
    },
    border: {
      top: roundPx(computed.borderTopWidth),
      right: roundPx(computed.borderRightWidth),
      bottom: roundPx(computed.borderBottomWidth),
      left: roundPx(computed.borderLeftWidth),
    },
    gap: computed.gap === 'normal' ? '0px' : computed.gap,
    borderRadius: computed.borderRadius,
    overflow,
  };
}

function buildMarginBands(metrics: InspectedMetrics): BandRect[] {
  const { rect, margin } = metrics;
  return [
    { key: 'mt', value: margin.top, top: rect.top - margin.top, left: rect.left, width: rect.width, height: margin.top },
    { key: 'mb', value: margin.bottom, top: rect.top + rect.height, left: rect.left, width: rect.width, height: margin.bottom },
    { key: 'ml', value: margin.left, top: rect.top, left: rect.left - margin.left, width: margin.left, height: rect.height },
    { key: 'mr', value: margin.right, top: rect.top, left: rect.left + rect.width, width: margin.right, height: rect.height },
  ];
}

function buildPaddingBands(metrics: InspectedMetrics): { bands: BandRect[]; content: BandRect } {
  const { rect, border, padding } = metrics;
  const innerLeft = rect.left + border.left;
  const innerTop = rect.top + border.top;
  const innerWidth = Math.max(0, rect.width - border.left - border.right);
  const innerHeight = Math.max(0, rect.height - border.top - border.bottom);
  const midHeight = Math.max(0, innerHeight - padding.top - padding.bottom);

  return {
    bands: [
      { key: 'pt', value: padding.top, top: innerTop, left: innerLeft, width: innerWidth, height: padding.top },
      { key: 'pb', value: padding.bottom, top: innerTop + innerHeight - padding.bottom, left: innerLeft, width: innerWidth, height: padding.bottom },
      { key: 'pl', value: padding.left, top: innerTop + padding.top, left: innerLeft, width: padding.left, height: midHeight },
      { key: 'pr', value: padding.right, top: innerTop + padding.top, left: innerLeft + innerWidth - padding.right, width: padding.right, height: midHeight },
    ],
    content: {
      key: 'content',
      value: 0,
      top: innerTop + padding.top,
      left: innerLeft + padding.left,
      width: Math.max(0, innerWidth - padding.left - padding.right),
      height: midHeight,
    },
  };
}

function LayerBands({ bands, className }: { bands: BandRect[]; className: string }) {
  return (
    <>
      {bands
        .filter((band) => band.value > 0 && band.width > 0 && band.height > 0)
        .map((band) => (
          <div
            key={band.key}
            className={className}
            style={{ top: band.top, left: band.left, width: band.width, height: band.height }}
          >
            <span className={styles.metricBadge}>{band.value}px</span>
          </div>
        ))}
    </>
  );
}

export function DevHoverOverlay({ enabled, metrics, onMetricsChange }: DevHoverOverlayProps) {
  const hoveredElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) {
      hoveredElementRef.current = null;
      return;
    }

    const handleMouseMove = (event: MouseEvent): void => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest('[data-dev-inspector="true"]')) return;
      hoveredElementRef.current = target;
      onMetricsChange(readBoxMetrics(target));
    };

    const handleViewportChange = (): void => {
      const current = hoveredElementRef.current;
      if (!current || !current.isConnected) {
        onMetricsChange(null);
        return;
      }
      onMetricsChange(readBoxMetrics(current));
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('scroll', handleViewportChange, { capture: true, passive: true });
    window.addEventListener('resize', handleViewportChange, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleViewportChange, { capture: true });
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [enabled, onMetricsChange]);

  if (!enabled || !metrics) {
    return null;
  }

  const marginBands = buildMarginBands(metrics);
  const { bands: paddingBands, content } = buildPaddingBands(metrics);

  return (
    <div className={styles.overlayRoot} data-dev-inspector="true" aria-hidden="true">
      <LayerBands bands={marginBands} className={styles.marginBox} />
      <LayerBands bands={paddingBands} className={styles.paddingBox} />
      <div
        className={styles.contentBox}
        style={{ top: content.top, left: content.left, width: content.width, height: content.height }}
      />
    </div>
  );
}
