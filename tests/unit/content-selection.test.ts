import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanupSelectionHighlightInDom,
  measureSelectionInDom,
} from '../../src/content/capture-injected';

function makeDomRect(
  left: number,
  top: number,
  width: number,
  height: number,
): DOMRect {
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    x: left,
    y: top,
    toJSON: () => ({}),
  };
}

describe('Task 014: On-demand DOM text selection measurement & temporary yellow highlight', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    Object.defineProperty(window, 'innerWidth', {
      value: 1440,
      configurable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      value: 900,
      configurable: true,
    });
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 2,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanupSelectionHighlightInDom();
    vi.restoreAllMocks();
  });

  it('returns hasSelection: false when no text is selected on the page', () => {
    window.getSelection()?.removeAllRanges();
    const res = measureSelectionInDom({ paddingPx: 20, applyHighlight: true });

    expect(res.hasSelection).toBe(false);
    expect(res.cropRectCss).toBeNull();
    expect(res.highlightApplied).toBe(false);
    expect(
      document.querySelectorAll('[data-snapmark-highlight]').length,
    ).toBe(0);
  });

  it('measures Range.getBoundingClientRect(), adds 20px safety margin, and clamps to viewport boundaries', () => {
    const p = document.createElement('p');
    p.textContent = 'Ważny fragment artykułu do wycięcia z marginesem 20 px';
    document.body.appendChild(p);

    const mockRange = {
      commonAncestorContainer: p,
      getBoundingClientRect: () => makeDomRect(100, 150, 400, 40),
      getClientRects: () =>
        [makeDomRect(100, 150, 400, 40)] as unknown as DOMRectList,
    } as unknown as Range;

    vi.spyOn(window, 'getSelection').mockReturnValue({
      rangeCount: 1,
      toString: () => p.textContent ?? '',
      getRangeAt: () => mockRange,
    } as unknown as Selection);

    const res = measureSelectionInDom({ paddingPx: 20, applyHighlight: false });

    expect(res.hasSelection).toBe(true);
    expect(res.selectedText).toContain('Ważny fragment artykułu');
    expect(res.dpr).toBe(2);
    expect(res.cropRectCss).toEqual({
      x: 80,
      y: 130,
      width: 440,
      height: 80,
    });
    expect(res.highlightApplied).toBe(false);
  });

  it('clamps the 20px safety margin when selection is < 20px from the viewport edge', () => {
    const p = document.createElement('p');
    p.textContent = 'Tekst przy samej górnej krawędzi okna';
    document.body.appendChild(p);

    const mockRange = {
      commonAncestorContainer: p,
      getBoundingClientRect: () => makeDomRect(6, 10, 300, 30),
      getClientRects: () =>
        [makeDomRect(6, 10, 300, 30)] as unknown as DOMRectList,
    } as unknown as Range;

    vi.spyOn(window, 'getSelection').mockReturnValue({
      rangeCount: 1,
      toString: () => p.textContent ?? '',
      getRangeAt: () => mockRange,
    } as unknown as Selection);

    const res = measureSelectionInDom({ paddingPx: 20 });
    expect(res.cropRectCss).toEqual({
      x: 0,
      y: 0,
      width: 326,
      height: 60,
    });
  });

  it('injects temporary yellow highlight overlays (rgba(255, 235, 59, 0.45)) and cleans them up completely', () => {
    const p = document.createElement('p');
    p.textContent = 'Zaznaczony cytat z żółtym podświetleniem';
    document.body.appendChild(p);

    const mockRange = {
      commonAncestorContainer: p,
      getBoundingClientRect: () => makeDomRect(120, 200, 300, 24),
      getClientRects: () =>
        [makeDomRect(120, 200, 300, 24)] as unknown as DOMRectList,
    } as unknown as Range;

    vi.spyOn(window, 'getSelection').mockReturnValue({
      rangeCount: 1,
      toString: () => p.textContent ?? '',
      getRangeAt: () => mockRange,
    } as unknown as Selection);

    const res = measureSelectionInDom({ paddingPx: 20, applyHighlight: true });
    expect(res.highlightApplied).toBe(true);

    const highlightNodes = document.querySelectorAll<HTMLElement>(
      '[data-snapmark-highlight]',
    );
    expect(highlightNodes.length).toBe(1);
    expect(highlightNodes[0]?.style.backgroundColor).toBe(
      'rgba(255, 235, 59, 0.45)',
    );
    expect(
      document.querySelector('[data-snapmark-selection-style]'),
    ).not.toBeNull();

    const removedCount = cleanupSelectionHighlightInDom();
    expect(removedCount).toBe(2);
    expect(
      document.querySelectorAll('[data-snapmark-highlight]').length,
    ).toBe(0);
    expect(
      document.querySelector('[data-snapmark-selection-style]'),
    ).toBeNull();
  });
});
