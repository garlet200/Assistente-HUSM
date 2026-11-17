'use client';

/**
 * @file RotaryKnobDial.tsx
 * @description Controle giratório circular (Rotary Knob / Dial neumórfico) com marcador luminoso,
 * ticks de -135° a +135° e suporte unificado a gestos de arraste vertical/horizontal, clique nos ticks e teclado.
 */

import React, { useRef, useState } from 'react';
import styles from './RotaryKnobDial.module.css';

interface RotaryKnobDialProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  minLabel: string;
  maxLabel: string;
  valueDescription: string;
  onChangeCommit: (committedValue: number) => void;
}

const MIN_ANGLE_DEG = -135;
const MAX_ANGLE_DEG = 135;
const PIXELS_PER_STEP = 24;

function clampLevel(rawValue: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(rawValue)));
}

function levelToAngle(level: number, min: number, max: number): number {
  const ratio = (level - min) / (max - min);
  return MIN_ANGLE_DEG + ratio * (MAX_ANGLE_DEG - MIN_ANGLE_DEG);
}

export function RotaryKnobDial({
  label,
  value,
  min = 1,
  max = 5,
  minLabel,
  maxLabel,
  valueDescription,
  onChangeCommit,
}: RotaryKnobDialProps) {
  const [dragPreviewValue, setDragPreviewValue] = useState<number | null>(null);
  const dragStateRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    startValue: number;
    latestValue: number;
  } | null>(null);

  const displayedValue = dragPreviewValue ?? value;
  const currentAngle = levelToAngle(displayedValue, min, max);
  const steps = Array.from({ length: max - min + 1 }, (_, index) => min + index);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      isDragging: true,
      startX: event.clientX,
      startY: event.clientY,
      startValue: value,
      latestValue: value,
    };
    setDragPreviewValue(value);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    const drag = dragStateRef.current;
    if (!drag || !drag.isDragging) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = drag.startY - event.clientY;
    const stepOffset = (deltaX + deltaY) / PIXELS_PER_STEP;
    const nextValue = clampLevel(drag.startValue + stepOffset, min, max);

    drag.latestValue = nextValue;
    setDragPreviewValue(nextValue);
  };

  const finishDragGesture = (event: React.PointerEvent<HTMLDivElement>): void => {
    const drag = dragStateRef.current;
    if (!drag || !drag.isDragging) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const committedValue = drag.latestValue;
    dragStateRef.current = null;
    setDragPreviewValue(null);

    if (committedValue !== value) {
      onChangeCommit(committedValue);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
      event.preventDefault();
      const next = clampLevel(value + 1, min, max);
      if (next !== value) onChangeCommit(next);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const prev = clampLevel(value - 1, min, max);
      if (prev !== value) onChangeCommit(prev);
    }
  };

  return (
    <div className={styles.dialWrapper}>
      <h4 className={styles.dialTitle}>{label}</h4>

      <div className={styles.dialStage}>
        {steps.map((stepValue) => {
          const tickAngle = levelToAngle(stepValue, min, max);
          const isTickActive = stepValue <= displayedValue;
          return (
            <button
              key={stepValue}
              type="button"
              className={styles.tickButton}
              style={{ transform: `rotate(${tickAngle}deg) translateY(-54px)` }}
              onClick={() => stepValue !== value && onChangeCommit(stepValue)}
              title={`${label}: ${stepValue}/${max}`}
              aria-label={`Definir ${label} para nível ${stepValue}`}
            >
              <span className={`${styles.tickDot} ${isTickActive ? styles.tickDotActive : ''}`} />
            </button>
          );
        })}

        <div className={styles.recessedWell}>
          <div
            role="slider"
            tabIndex={0}
            aria-label={label}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={displayedValue}
            aria-valuetext={valueDescription}
            className={styles.knobDisc}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishDragGesture}
            onPointerCancel={finishDragGesture}
            onKeyDown={handleKeyDown}
          >
            <div className={styles.knobRotor} style={{ transform: `rotate(${currentAngle}deg)` }}>
              <div className={styles.indicatorDot} />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.extremesRow}>
        <span className={styles.extremeLeft}>{minLabel}</span>
        <span className={styles.extremeRight}>{maxLabel}</span>
      </div>

      <div className={styles.valueBadge}>{valueDescription}</div>
    </div>
  );
}
