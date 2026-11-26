/**
 * @file devLayoutUtils.ts
 * @description Utilitários de inspeção DOM e régua de grid para o Modo Dev Secreto.
 */

export const DEV_MODE_TRIGGER_ATTR = 'data-dev-mode-trigger';
export const DEV_MODE_CLICK_TARGET = 5;
export const DEV_MODE_CLICK_WINDOW_MS = 1800;

const DEV_ATTRS = ['data-dev-grid', 'data-dev-flex', 'data-dev-overflow'] as const;

export interface WorkspaceRulerRect {
  top: number;
  left: number;
  width: number;
  height: number;
  padding: string;
  gap: string;
}

function toggleAttr(el: Element, attr: string, active: boolean): void {
  if (active) {
    if (el.getAttribute(attr) !== 'true') el.setAttribute(attr, 'true');
    return;
  }
  if (el.hasAttribute(attr)) el.removeAttribute(attr);
}

export function syncLayoutOutlineAttributes(): void {
  const elements = document.body.querySelectorAll('*');
  for (const el of elements) {
    if (el.closest('[data-dev-inspector="true"]')) continue;
    const style = window.getComputedStyle(el);
    const isGrid = style.display === 'grid' || style.display === 'inline-grid';
    const isFlex = style.display === 'flex' || style.display === 'inline-flex';
    const hasOverflowBoundary =
      style.overflow === 'hidden' ||
      style.overflow === 'auto' ||
      style.overflowX === 'hidden' ||
      style.overflowY === 'hidden' ||
      style.overflowY === 'auto';

    toggleAttr(el, 'data-dev-grid', isGrid);
    toggleAttr(el, 'data-dev-flex', isFlex);
    toggleAttr(el, 'data-dev-overflow', hasOverflowBoundary);
  }
}

export function clearLayoutOutlineAttributes(): void {
  for (const attr of DEV_ATTRS) {
    const tagged = document.querySelectorAll(`[${attr}]`);
    for (const el of tagged) {
      el.removeAttribute(attr);
    }
  }
}

export function readWorkspaceRulerRect(): WorkspaceRulerRect | null {
  const el = document.querySelector('[data-desktop-workspace="true"]');
  if (!(el instanceof HTMLElement)) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const style = window.getComputedStyle(el);
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    padding: style.padding,
    gap: style.columnGap || style.gap,
  };
}
