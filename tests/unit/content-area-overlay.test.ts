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
    ).toContain('Drag to select a screen area');

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

    // Overlay stays open with 8 resize handles and floating Apply/Cancel buttons (Crop parity)
    expect(document.querySelectorAll('[data-snapmark-area-handle]')).toHaveLength(8);
    const applyBtn = document.querySelector<HTMLButtonElement>('[data-snapmark-area-apply]');
    const cancelBtn = document.querySelector<HTMLButtonElement>('[data-snapmark-area-cancel]');
    expect(applyBtn).not.toBeNull();
    expect(cancelBtn).not.toBeNull();

    // Move selection by (+30, +20) by dragging inside (250, 250) -> (280, 270)
    overlay!.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 250, clientY: 250, button: 0 }),
    );
    window.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 280, clientY: 270 }),
    );
    window.dispatchEvent(
      new MouseEvent('mouseup', { clientX: 280, clientY: 270 }),
    );
    // Selection is now at (150, 180) with size 400x250 -> SE corner at (550, 430)

    // Resize SE corner by (+20, +10) -> size becomes 420x260
    overlay!.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 550, clientY: 430, button: 0 }),
    );
    window.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 570, clientY: 440 }),
    );
    window.dispatchEvent(
      new MouseEvent('mouseup', { clientX: 570, clientY: 440 }),
    );
    expect(dimBadge?.textContent).toBe('420 × 260 px');

    // Click Apply button to confirm selection
    applyBtn!.click();

    const result = await selectionPromise;
    expect(result.cancelled).toBe(false);
    expect(result.dpr).toBe(2);
    expect(result.viewportWidthCss).toBe(1440);
    expect(result.viewportHeightCss).toBe(900);
    expect(result.cropRectCss).toEqual({
      x: 150,
      y: 180,
      width: 420,
      height: 260,
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
