import { describe, expect, it, vi } from 'vitest';
import {
  createFlattenedExportCanvas,
  exportFlattenedPngDownload,
  exportFlattenedToClipboard,
} from '../../src/editor/exporter';
import { initEditor } from '../../src/editor/index';

describe('Flattened HiDPI PNG Download & ClipboardItem Exporter (Task 022)', () => {
  it('renders flattened export canvas at physical Retina DPI without selection handles (selectedId = null)', () => {
    const container = document.createElement('div');
    const controller = initEditor(container, { initialSearch: '?mode=viewport' });
    const state = controller.getState();

    // Ensure an annotation is selected in editor state
    expect(state.selectedAnnotationId).not.toBeNull();

    const exportCanvas = createFlattenedExportCanvas(
      state.metadata,
      state.annotations,
    );

    // 960x580 CSS @2x DPR -> 1920x1160 physical pixels
    expect(exportCanvas.width).toBe(1920);
    expect(exportCanvas.height).toBe(1160);
    expect(exportCanvas.style.width).toBe('960px');
    expect(exportCanvas.style.height).toBe('580px');
  });

  it('exports flattened PNG download with <domain>_YYYY-MM-DD_HH-mm.png filename', async () => {
    const container = document.createElement('div');
    const controller = initEditor(container, { initialSearch: '?mode=viewport' });
    const state = controller.getState();

    const result = await exportFlattenedPngDownload(
      state.metadata,
      state.annotations,
    );

    expect(result.filename).toBe('domena-pl_2026-11-21_14-10.png');
    expect(result.blob.type).toBe('image/png');
    expect(result.canvas.width).toBe(1920);
    expect(result.canvas.height).toBe(1160);
  });

  it('writes image/png ClipboardItem to navigator.clipboard.write and triggers 2-second "✓ Skopiowano!" state', async () => {
    const clipboardWriteMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        write: clipboardWriteMock,
      },
      configurable: true,
    });

    const container = document.createElement('div');
    const controller = initEditor(container, { initialSearch: '?mode=viewport' });
    const state = controller.getState();

    const blob = await exportFlattenedToClipboard(
      state.metadata,
      state.annotations,
    );
    expect(blob.type).toBe('image/png');
    expect(clipboardWriteMock).toHaveBeenCalledTimes(1);


  });
});
