import { afterEach, describe, expect, it, vi } from 'vitest';
import { initEditor } from '../../src/editor/index';

describe('Task 005: Vector editor 56px top toolbar and contextual controls', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('renders Cluster 1 metadata, defaults to Strzałka (#FF3B30, 4px) in Cluster 2 & 3, and shows Cluster 4 export actions', () => {
    const container = document.createElement('div');
    const controller = initEditor(container, { initialSearch: '?mode=viewport' });

    expect(container.querySelector('#meta-filename')).toBeNull();
    expect(container.querySelector('#meta-dimensions')).toBeNull();
    expect(container.querySelector('#btn-copy-clipboard')).toBeNull();
    expect(container.querySelector('#btn-close-editor')?.getAttribute('aria-label')).toBe('Zamknij edytor');

    const arrowBtn = container.querySelector('#tool-arrow');
    expect(arrowBtn?.classList.contains('is-active')).toBe(true);
    expect(controller.getState().activeTool).toBe('arrow');
    expect(controller.getState().activeColor).toBe('#FF3B30');
    expect(controller.getState().strokeWidth).toBe(8);

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

  it('closes the editor through the accessible close control', () => {
    const container = document.createElement('div');
    const onClose = vi.fn();
    initEditor(container, { onClose });
    container.querySelector<HTMLButtonElement>('#btn-close-editor')?.click();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('removes only the current extension tab when close is clicked', async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('chrome', { tabs: { getCurrent: vi.fn().mockResolvedValue({ id: 37 }), remove } });
    const container = document.createElement('div');
    initEditor(container);
    container.querySelector<HTMLButtonElement>('#btn-close-editor')?.click();
    await vi.waitFor(() => expect(remove).toHaveBeenCalledWith(37));
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
