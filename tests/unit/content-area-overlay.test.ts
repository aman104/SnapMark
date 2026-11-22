import { beforeEach, describe, expect, it } from 'vitest';
import { selectAreaOverlayInDom } from '../../src/content/capture-injected';

describe('Task 026: On-demand Interactive Screen Area Selection Overlay (selectAreaOverlayInDom)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<main><h1>Przykładowa strona WWW</h1></main>';
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

  it('injects [data-snapmark-area-overlay], updates live dimensions during drag, removes overlay on mouseup, and returns normalized cropRectCss', async () => {
    const selectionPromise = selectAreaOverlayInDom();

    const overlay = document.querySelector<HTMLElement>(
      '[data-snapmark-area-overlay]',
    );
    expect(overlay).not.toBeNull();
    expect(
      document.querySelector('[data-snapmark-area-hint]')?.textContent,
    ).toContain('Przeciągnij myszą, aby zaznaczyć fragment ekranu');

    // Drag from bottom-right (520, 410) to top-left (120, 160) to verify direction normalization
    overlay!.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 520, clientY: 410, button: 0 }),
    );
    window.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 120, clientY: 160 }),
    );

    const dimBadge = document.querySelector('[data-snapmark-area-dimensions]');
    expect(dimBadge?.textContent).toBe('400 × 250 px');

    window.dispatchEvent(
      new MouseEvent('mouseup', { clientX: 120, clientY: 160 }),
    );

    const result = await selectionPromise;
    expect(result.cancelled).toBe(false);
    expect(result.dpr).toBe(2);
    expect(result.viewportWidthCss).toBe(1440);
    expect(result.viewportHeightCss).toBe(900);
    expect(result.cropRectCss).toEqual({
      x: 120,
      y: 160,
      width: 400,
      height: 250,
    });

    // Guaranteed DOM cleanup before captureVisibleTab fires
    expect(document.querySelector('[data-snapmark-area-overlay]')).toBeNull();
  });

  it('cancels selection when Escape is pressed and cleans up the DOM overlay immediately', async () => {
    const selectionPromise = selectAreaOverlayInDom();
    const overlay = document.querySelector<HTMLElement>(
      '[data-snapmark-area-overlay]',
    );
    expect(overlay).not.toBeNull();

    overlay!.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 100, clientY: 100, button: 0 }),
    );
    window.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 300, clientY: 250 }),
    );

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    const result = await selectionPromise;
    expect(result.cancelled).toBe(true);
    expect(result.cropRectCss).toBeNull();
    expect(document.querySelector('[data-snapmark-area-overlay]')).toBeNull();
  });

  it('treats accidental tiny clicks (< 8x8 px) as cancelled and cleans up the DOM overlay', async () => {
    const selectionPromise = selectAreaOverlayInDom();
    const overlay = document.querySelector<HTMLElement>(
      '[data-snapmark-area-overlay]',
    )!;

    overlay.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 200, clientY: 200, button: 0 }),
    );
    window.dispatchEvent(
      new MouseEvent('mouseup', { clientX: 203, clientY: 202 }),
    );

    const result = await selectionPromise;
    expect(result.cancelled).toBe(true);
    expect(result.cropRectCss).toBeNull();
    expect(document.querySelector('[data-snapmark-area-overlay]')).toBeNull();
  });
});
