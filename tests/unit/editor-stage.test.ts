import { describe, expect, it, vi } from 'vitest';
import { hitTestAnnotations } from '../../src/editor/canvas-stage';
import { initEditor } from '../../src/editor/index';

describe('Task 006: Editor HiDPI canvas stage, sample vector preview, and fallback states', () => {
  it('sizes #editor-canvas to physical Retina pixels (css * dpr) with CSS display dimensions and 0px border-radius', () => {
    const container = document.createElement('div');
    initEditor(container, { initialSearch: '?mode=selection&highlight=1' });

    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas');
    expect(canvas).not.toBeNull();
    // selection mode mock metadata is 680x240 CSS at @2x DPR -> 1360x480 physical pixels
    expect(canvas?.width).toBe(1360);
    expect(canvas?.height).toBe(480);
    expect(canvas?.style.width).toBe('680px');
    expect(canvas?.style.height).toBe('240px');
    expect(canvas?.style.borderRadius).toBe('0px');
  });

  it('renders the ?state=empty fallback card and recovers to active canvas stage on paste or file button click', () => {
    const container = document.createElement('div');
    const controller = initEditor(container, { initialSearch: '?state=empty' });

    expect(container.querySelector('#editor-empty-state')).not.toBeNull();
    expect(container.querySelector('#editor-canvas')).toBeNull();
    expect(container.querySelector('.empty-state-title')?.textContent).toContain(
      'Brak aktywnego zrzutu na płótnie',
    );
    expect(
      container
        .querySelector<HTMLButtonElement>('#btn-download-png')
        ?.hasAttribute('disabled'),
    ).toBe(true);

    // Clicking "Wklej ze schowka (Ctrl+V)" loads the sample capture onto the canvas stage
    container
      .querySelector<HTMLButtonElement>('#btn-paste-clipboard')
      ?.click();

    expect(controller.getState().prototypeState).toBe('default');
    expect(container.querySelector('#editor-empty-state')).toBeNull();
    expect(container.querySelector('#editor-canvas')).not.toBeNull();
  });

  it('renders and dismisses the ?state=max-height-warning banner', () => {
    const container = document.createElement('div');
    initEditor(container, {
      initialSearch: '?state=max-height-warning&mode=fullpage',
    });

    const banner = container.querySelector('#max-height-banner');
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain(
      'Osiągnięto maksymalną bezpieczną wysokość płótna',
    );

    container
      .querySelector<HTMLButtonElement>('#btn-dismiss-warning')
      ?.click();
    expect(container.querySelector('#max-height-banner')).toBeNull();
  });

  it('performs vector hit-testing and triggers PNG download callback with auto-generated filename', () => {
    const container = document.createElement('div');
    const onDownloadPng = vi.fn();
    const controller = initEditor(container, {
      initialSearch: '?mode=viewport',
      onDownloadPng,
    });

    const annotations = controller.getState().annotations;
    const hitArrow = hitTestAnnotations(annotations, 555, 205);
    expect(hitArrow?.type).toBe('arrow');

    const miss = hitTestAnnotations(annotations, 5, 5);
    expect(miss).toBeNull();

    container
      .querySelector<HTMLButtonElement>('#btn-download-png')
      ?.click();
    expect(onDownloadPng).toHaveBeenCalledWith(
      'domena-pl_2026-11-21_14-10.png',
      expect.any(Object),
    );
  });
});
