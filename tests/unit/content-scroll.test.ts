import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  computeFullPageFrameOffsets,
  hideFixedAndStickyElementsInDom,
  prepareFullPageScrollInDom,
  restoreFullPageScrollInDom,
  settleFullPageScrollInDom,
  stepFullPageScrollInDom,
} from '../../src/content/capture-injected';

describe('Task 016: Full-page scroll DOM controller & fixed/sticky header suppression', () => {
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
    Object.defineProperty(window, 'scrollX', {
      value: 0,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, 'scrollY', {
      value: 320,
      configurable: true,
      writable: true,
    });
    window.scrollTo = vi.fn((x: number | ScrollToOptions, y?: number) => {
      if (typeof x === 'number' && typeof y === 'number') {
        Object.defineProperty(window, 'scrollX', {
          value: x,
          configurable: true,
          writable: true,
        });
        Object.defineProperty(window, 'scrollY', {
          value: y,
          configurable: true,
          writable: true,
        });
      }
    }) as unknown as typeof window.scrollTo;
  });

  afterEach(() => {
    restoreFullPageScrollInDom();
    vi.restoreAllMocks();
  });

  it('computes vertical scroll frame offsets and caps height at MAX_CANVAS_HEIGHT', () => {
    // 2250px tall page with 900px viewport at @2x DPR -> frames at 0, 900, and 1350 (partial last frame)
    const normal = computeFullPageFrameOffsets(2250, 900, 2, 16384);
    expect(normal).toEqual({
      frameOffsetsY: [0, 900, 1350],
      cappedHeightCss: 2250,
      exceededMaxHeight: false,
    });

    // 12000px tall page at @2x DPR = 24000px physical > 16384px limit -> capped to 8192px CSS
    const capped = computeFullPageFrameOffsets(12000, 900, 2, 16384);
    expect(capped.exceededMaxHeight).toBe(true);
    expect(capped.cappedHeightCss).toBe(8192);
    expect(capped.frameOffsetsY[0]).toBe(0);
    expect(capped.frameOffsetsY[capped.frameOffsetsY.length - 1]).toBe(
      8192 - 900,
    );
  });

  it('waits for two frames and rejects a scroll that did not reach the requested position', async () => {
    let callbacks = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callbacks += 1;
      queueMicrotask(() => callback(0));
      return callbacks;
    });
    await expect(settleFullPageScrollInDom(0)).rejects.toThrow('Nie udało się przewinąć');
    expect(callbacks).toBe(2);
    window.scrollTo(0, 0);
    await expect(settleFullPageScrollInDom(0)).resolves.toBe(0);
    vi.unstubAllGlobals();
  });

  it('prepares Frame #1 at (0, 0) while keeping fixed/sticky headers visible, then hides them for Frame #2+ and restores everything in finally', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: 2250,
      configurable: true,
    });

    const fixedHeader = document.createElement('header');
    fixedHeader.id = 'top-fixed-nav';
    fixedHeader.style.position = 'fixed';
    fixedHeader.style.top = '0';

    const stickyBar = document.createElement('div');
    stickyBar.id = 'sub-sticky-bar';
    stickyBar.style.position = 'sticky';
    stickyBar.style.visibility = 'visible';

    const normalArticle = document.createElement('article');
    normalArticle.id = 'main-article';
    normalArticle.style.position = 'relative';

    document.body.append(fixedHeader, stickyBar, normalArticle);

    // Step 1: Prepare scroll for Frame #1
    const plan = prepareFullPageScrollInDom(16384);
    expect(plan.originalScrollY).toBe(320);
    expect(plan.frameOffsetsY).toEqual([0, 900, 1350]);
    expect(window.scrollY).toBe(0);

    // On Frame #1, fixed and sticky headers are NOT hidden yet
    expect(fixedHeader.style.visibility).not.toBe('hidden');
    expect(stickyBar.style.visibility).toBe('visible');

    // Step 2: After Frame #1, hide fixed and sticky elements
    const hiddenCount = hideFixedAndStickyElementsInDom();
    expect(hiddenCount).toBe(2);
    expect(fixedHeader.style.getPropertyValue('visibility')).toBe('hidden');
    expect(fixedHeader.style.getPropertyPriority('visibility')).toBe(
      'important',
    );
    expect(stickyBar.style.getPropertyValue('visibility')).toBe('hidden');
    expect(normalArticle.style.getPropertyValue('visibility')).toBe('');

    // Step 3: Advance scroll for Frame #2
    const step2 = stepFullPageScrollInDom(900);
    expect(step2.actualScrollY).toBe(900);

    // Step 4: Restore DOM state
    restoreFullPageScrollInDom();
    expect(fixedHeader.style.getPropertyValue('visibility')).toBe('');
    expect(stickyBar.style.getPropertyValue('visibility')).toBe('visible');
    expect(
      document.querySelector('[data-snapmark-scroll-style]'),
    ).toBeNull();
    expect(window.scrollY).toBe(320);
  });
});
