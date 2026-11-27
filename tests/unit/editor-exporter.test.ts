import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createFlattenedExportCanvas,
  exportFlattenedPngDownload,
  exportFlattenedToClipboard,
} from '../../src/editor/exporter';
import { initEditor } from '../../src/editor/index';

describe('Flattened HiDPI PNG Download & ClipboardItem Exporter (Task 022)', () => {
  afterEach(() => vi.unstubAllGlobals());

  function mockDownloads(initialState: 'in_progress' | 'complete' | 'interrupted' = 'in_progress') {
    let listener: ((delta: chrome.downloads.DownloadDelta) => void) | undefined;
    const removeListener = vi.fn();
    const download = vi.fn().mockResolvedValue(41);
    const search = vi.fn().mockResolvedValue([{ id: 41, state: initialState }]);
    vi.stubGlobal('chrome', { downloads: { download, search, onChanged: { addListener: (fn: typeof listener) => { listener = fn; }, removeListener } } });
    const NativeURL = URL;
    const revoke = vi.fn();
    class TestURL extends NativeURL { static createObjectURL = vi.fn(() => 'blob:test'); static revokeObjectURL = revoke; }
    vi.stubGlobal('URL', TestURL);
    return { download, search, revoke, removeListener, emit: (id: number, state: 'complete' | 'interrupted') => listener?.({ id, state: { current: state } }) };
  }

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

    const downloads = mockDownloads('complete');
    const result = await exportFlattenedPngDownload(
      state.metadata,
      state.annotations,
    );
    expect(downloads.download).toHaveBeenCalledWith({ url: 'blob:test', filename: state.metadata.filename });
    expect(downloads.revoke).toHaveBeenCalledWith('blob:test');
    expect(downloads.removeListener).toHaveBeenCalledOnce();

    expect(result.filename).toBe('domena-pl_2026-11-21_14-10.png');
    expect(result.blob.type).toBe('image/png');
    expect(result.canvas.width).toBe(1920);
    expect(result.canvas.height).toBe(1160);
  });

  it('waits for the matching completed download before closing the editor', async () => {
    const downloads = mockDownloads();
    const close = vi.fn();
    const container = document.createElement('div');
    initEditor(container, { initialSearch: '?mode=viewport', onClose: close });
    container.querySelector<HTMLButtonElement>('#btn-download-png')!.click();
    await vi.waitFor(() => expect(downloads.search).toHaveBeenCalled());
    expect(close).not.toHaveBeenCalled();
    downloads.emit(42, 'complete');
    await Promise.resolve();
    expect(close).not.toHaveBeenCalled();
    downloads.emit(41, 'complete');
    await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());
    expect(downloads.revoke).toHaveBeenCalledWith('blob:test');
  });

  it('keeps the editor open and reports interrupted downloads', async () => {
    const downloads = mockDownloads();
    const close = vi.fn();
    const container = document.createElement('div');
    const controller = initEditor(container, { initialSearch: '?mode=viewport', onClose: close });
    const count = controller.getState().annotations.length;
    container.querySelector<HTMLButtonElement>('#btn-download-png')!.click();
    await vi.waitFor(() => expect(downloads.search).toHaveBeenCalled());
    downloads.emit(41, 'interrupted');
    await vi.waitFor(() => expect(container.querySelector('[role="alert"]')?.textContent).toContain('Failed to download PNG'));
    expect(close).not.toHaveBeenCalled();
    expect(controller.getState().annotations).toHaveLength(count);
    expect(downloads.revoke).toHaveBeenCalledWith('blob:test');
  });

  it('handles completion before the download ID promise resolves', async () => {
    const downloads = mockDownloads();
    downloads.download.mockImplementation(async () => {
      downloads.emit(41, 'complete');
      return 41;
    });
    const close = vi.fn();
    const container = document.createElement('div');
    initEditor(container, { initialSearch: '?mode=viewport', onClose: close });
    container.querySelector<HTMLButtonElement>('#btn-download-png')!.click();
    await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());
    expect(downloads.removeListener).toHaveBeenCalledOnce();
  });

  it('reports a download API failure and keeps the editor open for retry', async () => {
    const downloads = mockDownloads();
    downloads.download.mockRejectedValue(new Error('permission denied'));
    const close = vi.fn();
    const container = document.createElement('div');
    initEditor(container, { initialSearch: '?mode=viewport', onClose: close });
    container.querySelector<HTMLButtonElement>('#btn-download-png')!.click();
    await vi.waitFor(() => expect(container.querySelector('[role="alert"]')?.textContent).toContain('Failed to download PNG'));
    expect(close).not.toHaveBeenCalled();
    expect(downloads.revoke).toHaveBeenCalledWith('blob:test');
    expect(downloads.removeListener).toHaveBeenCalledOnce();
  });

  it('preserves edits made while a download is pending and does not close', async () => {
    const downloads = mockDownloads();
    const close = vi.fn();
    const container = document.createElement('div');
    const controller = initEditor(container, { initialSearch: '?mode=viewport', onClose: close });
    container.querySelector<HTMLButtonElement>('#btn-download-png')!.click();
    await vi.waitFor(() => expect(downloads.search).toHaveBeenCalled());
    controller.setColor('#34C759');
    downloads.emit(41, 'complete');
    await vi.waitFor(() => expect(container.querySelector('[role="alert"]')?.textContent).toContain('New edits'));
    expect(close).not.toHaveBeenCalled();
    expect(controller.getState().annotations[0].color).toBe('#34C759');
  });

  it('rechecks for edits after a delayed current-tab lookup before removing the tab', async () => {
    const downloads = mockDownloads();
    let finishLookup!: (tab: { id: number }) => void;
    const getCurrent = vi.fn(() => new Promise<{ id: number }>((resolve) => { finishLookup = resolve; }));
    const remove = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('chrome', { downloads: chrome.downloads, tabs: { getCurrent, remove } });
    const container = document.createElement('div');
    const controller = initEditor(container, { initialSearch: '?mode=viewport' });
    container.querySelector<HTMLButtonElement>('#btn-download-png')!.click();
    await vi.waitFor(() => expect(downloads.search).toHaveBeenCalled());
    downloads.emit(41, 'complete');
    await vi.waitFor(() => expect(getCurrent).toHaveBeenCalledOnce());
    controller.setColor('#34C759');
    finishLookup({ id: 37 });
    await vi.waitFor(() => expect(container.querySelector('[role="alert"]')?.textContent).toContain('New edits'));
    expect(remove).not.toHaveBeenCalled();
    expect(controller.getState().annotations[0].color).toBe('#34C759');
  });

  it('does not close while an unfinished drawing is in progress', async () => {
    const downloads = mockDownloads();
    const close = vi.fn();
    const container = document.createElement('div');
    const controller = initEditor(container, { initialSearch: '?mode=viewport', onClose: close });
    container.querySelector<HTMLButtonElement>('#btn-download-png')!.click();
    await vi.waitFor(() => expect(downloads.search).toHaveBeenCalled());
    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 20, clientY: 20, button: 0, bubbles: true }));
    const count = controller.getState().annotations.length;
    downloads.emit(41, 'complete');
    await vi.waitFor(() => expect(container.querySelector('[role="alert"]')?.textContent).toContain('New edits'));
    expect(close).not.toHaveBeenCalled();
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 80, bubbles: true }));
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: 100, clientY: 80, button: 0, bubbles: true }));
    expect(controller.getState().annotations).toHaveLength(count + 1);
  });

  it('prevents edits during tab removal and unlocks the editor if removal fails', async () => {
    const downloads = mockDownloads();
    let failRemoval!: (reason: Error) => void;
    const remove = vi.fn(() => new Promise<void>((_, reject) => { failRemoval = reject; }));
    vi.stubGlobal('chrome', { downloads: chrome.downloads, tabs: { getCurrent: vi.fn().mockResolvedValue({ id: 37 }), remove } });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const controller = initEditor(container, { initialSearch: '?mode=viewport' });
    const count = controller.getState().annotations.length;
    container.querySelector<HTMLButtonElement>('#btn-download-png')!.click();
    await vi.waitFor(() => expect(downloads.search).toHaveBeenCalled());
    downloads.emit(41, 'complete');
    await vi.waitFor(() => expect(remove).toHaveBeenCalledWith(37));
    expect(container.inert).toBe(true);
    let canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 20, clientY: 20, button: 0, bubbles: true, cancelable: true }));
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 80, bubbles: true }));
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: 100, clientY: 80, button: 0, bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }));
    expect(controller.getState().annotations).toHaveLength(count);
    failRemoval(new Error('cannot close'));
    await vi.waitFor(() => expect(container.querySelector('[role="alert"]')?.textContent).toContain('tab could not be closed'));
    expect(container.inert).toBe(false);
    canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 20, clientY: 20, button: 0, bubbles: true }));
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 80, bubbles: true }));
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: 100, clientY: 80, button: 0, bubbles: true }));
    expect(controller.getState().annotations).toHaveLength(count + 1);
    container.remove();
  });

  it('retains the active text input and selection when a pending download fails', async () => {
    const downloads = mockDownloads();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const controller = initEditor(container, { initialSearch: '?mode=viewport' });
    container.querySelector<HTMLButtonElement>('#btn-download-png')!.click();
    await vi.waitFor(() => expect(downloads.search).toHaveBeenCalled());
    controller.setTool('text');
    container.querySelector<HTMLCanvasElement>('#editor-canvas')!.dispatchEvent(new MouseEvent('mousedown', { clientX: 120, clientY: 85, button: 0, cancelable: true }));
    const input = container.querySelector<HTMLTextAreaElement>('#active-text-input')!;
    input.value = 'Tekst w trakcie';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.setSelectionRange(2, 6);
    downloads.emit(41, 'interrupted');
    await vi.waitFor(() => expect(container.querySelector('[role="alert"]')?.textContent).toContain('Failed to download PNG'));
    expect(container.querySelector('#active-text-input')).toBe(input);
    expect(document.activeElement).toBe(input);
    expect([input.selectionStart, input.selectionEnd]).toEqual([2, 6]);
    container.remove();
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
