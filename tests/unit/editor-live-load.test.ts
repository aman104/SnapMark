import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { initEditor } from '../../src/editor/index';
import {
  deleteCaptureSession,
  getCaptureSession,
  listCaptureSessionIds,
  saveCaptureSession,
} from '../../src/shared/db';
import {
  loadUserSettings,
  resetUserSettings,
  updateUserSettings,
} from '../../src/shared/settings';
import type { CaptureSession } from '../../src/shared/types';

describe('Task 013: Editor IndexedDB Blob consumption, immediate purge, and settings persistence', () => {
  beforeEach(async () => {
    localStorage.clear();
    await resetUserSettings();
    const ids = await listCaptureSessionIds();
    for (const id of ids) {
      await deleteCaptureSession(id);
    }
  });

  it('loads a real CaptureSession from IndexedDB by ?captureId=, displays metadata, sizes Retina canvas, and immediately purges the DB record', async () => {
    const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const blob = new Blob([pngBytes], { type: 'image/png' });
    const capturedAt = new Date(2026, 10, 21, 14, 10, 0).toISOString();

    const session: CaptureSession = {
      id: 'cap_live_viewport_1',
      mode: 'viewport',
      sourceUrl: 'https://example.com/docs',
      sourceDomain: 'example-com',
      capturedAt,
      dpr: 2,
      frames: [
        {
          blob,
          scrollYCss: 0,
          viewportWidthCss: 1440,
          viewportHeightCss: 900,
        },
      ],
      totalWidthCss: 1440,
      totalHeightCss: 900,
    };

    await saveCaptureSession(session);
    await updateUserSettings({
      activeColor: '#34C759',
      strokeWidth: 8,
    });

    const container = document.createElement('div');
    const controller = initEditor(container, {
      initialSearch: '?captureId=cap_live_viewport_1&mode=viewport',
    });
    await controller.ready;

    // Filename remains available for export without occupying the toolbar.
    expect(controller.getState().metadata.filename).toBe('example-com_2026-11-21_14-10.png');
    expect(container.querySelector('#meta-filename')).toBeNull();

    // Canvas is sized to physical pixels (2880x1800) with CSS display 1440x900
    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas');
    expect(canvas?.width).toBe(2880);
    expect(canvas?.height).toBe(1800);
    expect(canvas?.style.width).toBe('1440px');
    expect(canvas?.style.height).toBe('900px');

    // Hydrated saved preferences from chrome.storage.local
    expect(controller.getState().activeColor).toBe('#34C759');
    expect(controller.getState().strokeWidth).toBe(8);

    // Temporary record in IndexedDB is immediately purged!
    expect(await getCaptureSession('cap_live_viewport_1')).toBeNull();
    expect(await listCaptureSessionIds()).toEqual([]);
  });

  it('transitions to the empty fallback state when ?captureId= was already purged or does not exist', async () => {
    const container = document.createElement('div');
    const controller = initEditor(container, {
      initialSearch: '?captureId=cap_already_purged_999',
    });
    await controller.ready;

    expect(controller.getState().prototypeState).toBe('empty');
    expect(container.querySelector('#editor-empty-state')).not.toBeNull();
    expect(container.querySelector('#editor-canvas')).toBeNull();
  });

  it('persists toolbar tool, color, stroke width, and text style selections to user settings', async () => {
    const container = document.createElement('div');
    const controller = initEditor(container);
    await controller.ready;

    controller.setTool('text');
    controller.setColor('#007AFF');
    controller.setStrokeWidth(2);
    controller.setTextStyleMode('outline');

    await new Promise((resolve) => setTimeout(resolve, 0));

    const persisted = await loadUserSettings();
    expect(persisted.activeTool).toBe('text');
    expect(persisted.activeColor).toBe('#007AFF');
    expect(persisted.strokeWidth).toBe(2);
    expect(persisted.textStyleMode).toBe('outline');
  });
});
