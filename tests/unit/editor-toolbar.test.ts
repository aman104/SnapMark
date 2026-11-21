import { afterEach, describe, expect, it, vi } from 'vitest';
import { initEditor } from '../../src/editor/index';

describe('Task 005: Vector editor 56px top toolbar and contextual controls', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders Cluster 1 metadata, defaults to Strzałka (#FF3B30, 4px) in Cluster 2 & 3, and shows Cluster 4 export actions', () => {
    const container = document.createElement('div');
    const controller = initEditor(container, { initialSearch: '?mode=viewport' });

    expect(container.querySelector('#meta-filename')?.textContent?.trim()).toBe(
      'domena-pl_2026-11-21_14-10.png',
    );
    expect(
      container.querySelector('#meta-dimensions')?.textContent?.trim(),
    ).toBe('960×580 • @2x');

    const arrowBtn = container.querySelector('#tool-arrow');
    expect(arrowBtn?.classList.contains('is-active')).toBe(true);
    expect(controller.getState().activeTool).toBe('arrow');
    expect(controller.getState().activeColor).toBe('#FF3B30');
    expect(controller.getState().strokeWidth).toBe(4);

    const activeSwatch = container.querySelector('.color-swatch.is-active');
    expect(activeSwatch?.getAttribute('data-color')).toBe('#FF3B30');

    expect(container.querySelector('#stroke-width-picker')).not.toBeNull();
    expect(container.querySelector('#line-subtype-picker')).toBeNull();
    expect(container.querySelector('#text-style-picker')).toBeNull();
  });

  it('dynamically updates Cluster 3 contextual controls when switching tools via click or keys 1, 2, 3', () => {
    const container = document.createElement('div');
    const controller = initEditor(container);

    // Switch to Linia / Marker (Tool 2)
    container.querySelector<HTMLButtonElement>('#tool-line')?.click();
    expect(controller.getState().activeTool).toBe('line');
    expect(container.querySelector('#line-subtype-picker')).not.toBeNull();
    expect(container.querySelector('#shift-axis-hint')?.textContent).toContain(
      'Shift',
    );

    // Switch subtype from Zakreślacz to Podkreślenie -> reveals stroke width picker
    container
      .querySelector<HTMLButtonElement>('[data-line-subtype="underline"]')
      ?.click();
    expect(controller.getState().lineSubtype).toBe('underline');
    expect(container.querySelector('#stroke-width-picker')).not.toBeNull();

    // Switch to Tekst via keyboard shortcut "3"
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }));
    expect(controller.getState().activeTool).toBe('text');
    expect(container.querySelector('#text-style-picker')).not.toBeNull();
    expect(container.querySelector('#line-subtype-picker')).toBeNull();

    // Change text readability mode to Obrys
    container
      .querySelector<HTMLButtonElement>('[data-text-style="outline"]')
      ?.click();
    expect(controller.getState().textStyleMode).toBe('outline');
  });

  it('updates active color, stroke width, supports Ctrl+Z undo and Delete selected object', () => {
    const container = document.createElement('div');
    const controller = initEditor(container);

    const initialCount = controller.getState().annotations.length;

    // Pick yellow color swatch (#FFCC00)
    container
      .querySelector<HTMLButtonElement>('[data-color="#FFCC00"]')
      ?.click();
    expect(controller.getState().activeColor).toBe('#FFCC00');
    expect(controller.getState().annotations[0]?.color).toBe('#FFCC00');

    // Undo via Ctrl+Z restores #FF3B30
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }),
    );
    expect(controller.getState().annotations[0]?.color).toBe('#FF3B30');

    // Delete selected annotation
    container
      .querySelector<HTMLButtonElement>('#btn-delete-selected')
      ?.click();
    expect(controller.getState().annotations.length).toBe(initialCount - 1);
  });

  it('transitions "Kopiuj do schowka" to green "✓ Skopiowano!" state for 2000ms', () => {
    vi.useFakeTimers();
    const container = document.createElement('div');
    initEditor(container);

    const copyBtn = container.querySelector<HTMLButtonElement>(
      '#btn-copy-clipboard',
    );
    expect(copyBtn?.textContent).toContain('Kopiuj do schowka');

    copyBtn?.click();

    const updatedBtn = container.querySelector<HTMLButtonElement>(
      '#btn-copy-clipboard',
    );
    expect(updatedBtn?.classList.contains('is-success')).toBe(true);
    expect(updatedBtn?.textContent).toContain('✓ Skopiowano!');

    vi.advanceTimersByTime(2000);

    const revertedBtn = container.querySelector<HTMLButtonElement>(
      '#btn-copy-clipboard',
    );
    expect(revertedBtn?.classList.contains('is-success')).toBe(false);
    expect(revertedBtn?.textContent).toContain('Kopiuj do schowka');
  });
});
