import 'fake-indexeddb/auto';
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { captureTextSelection } from '../../src/background/capture-orchestrator';
import { CaptureRateLimiter } from '../../src/background/rate-limiter';
import { initEditor } from '../../src/editor/index';
import { renderPopup } from '../../src/popup/index';
import { listCaptureSessionIds } from '../../src/shared/db';
import type {
  ArrowAnnotation,
  LineAnnotation,
  TextAnnotation,
} from '../../src/shared/types';

const SAMPLE_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('SnapMark Chrome Extension Manifest V3 — End-to-End Suite (tests/e2e/extension.spec.ts)', () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<div id="popup-app"></div><div id="editor-app"></div>';
  });

  it('E2E 1: verifies built ./dist extension artifacts, Manifest V3 structure, and entry points', () => {
    const distDir = path.resolve(process.cwd(), 'dist');
    expect(fs.existsSync(distDir)).toBe(true);

    const requiredFiles = [
      'manifest.json',
      'background.js',
      'popup.html',
      'editor.html',
      'icons/icon-16.png',
      'icons/icon-32.png',
      'icons/icon-48.png',
      'icons/icon-128.png',
    ];

    for (const rel of requiredFiles) {
      const fullPath = path.join(distDir, rel);
      expect(fs.existsSync(fullPath)).toBe(true);
      expect(fs.statSync(fullPath).size).toBeGreaterThan(0);
    }

    const manifest = JSON.parse(
      fs.readFileSync(path.join(distDir, 'manifest.json'), 'utf-8'),
    ) as Record<string, unknown>;
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toEqual([
      'activeTab',
      'contextMenus',
      'scripting',
      'storage',
    ]);
  });

  it('E2E 2: verifies popup.html flow — restricted page detection, yellow highlight toggle persistence, and scroll progress cancellation', async () => {
    const stored: Record<string, unknown> = {};
    const sendMessage = vi.fn().mockResolvedValue({ ok: true });

    (globalThis as unknown as { chrome: unknown }).chrome = {
      storage: {
        local: {
          get: vi.fn(async () => stored),
          set: vi.fn(async (patch: Record<string, unknown>) => {
            Object.assign(stored, patch);
          }),
        },
      },
      tabs: {
        query: vi.fn().mockResolvedValue([
          {
            id: 10,
            url: 'chrome://extensions',
          },
        ]),
      },
      runtime: {
        sendMessage,
        onMessage: {
          addListener: vi.fn(),
        },
      },
    };

    const popupRoot = document.getElementById('popup-app')!;
    const popup = renderPopup(popupRoot);
    await popup.ready;

    // Restricted browser URL automatically switches popup to 'restricted' state
    expect(popup.getState()).toBe('restricted');
    expect(popupRoot.querySelector('#restricted-banner')).not.toBeNull();

    // Switch to normal ready state, toggle yellow highlight switch, and verify persistence
    popup.setState('default');
    expect(popup.isHighlightEnabled()).toBe(false);

    popupRoot.querySelector<HTMLButtonElement>('#toggle-highlight')?.click();
    expect(popup.isHighlightEnabled()).toBe(true);

    // Trigger full-page scroll progress and cancel with Escape
    popupRoot.querySelector<HTMLButtonElement>('#btn-capture-fullpage')?.click();
    expect(popup.getState()).toBe('progress');
    expect(popupRoot.querySelector('#scroll-progress-panel')).not.toBeNull();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(popup.getState()).toBe('default');
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'SNAPMARK_CANCEL_SCROLL_CAPTURE',
    });
  });

  it('E2E 3: executes full capture -> IndexedDB Blob transfer -> editor.html hydration -> immediate IndexedDB purge -> vector annotation & flattened PNG/Clipboard export', async () => {
    let openedEditorUrl = '';
    const clipboardWriteMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        write: clipboardWriteMock,
      },
      configurable: true,
    });

    (globalThis as unknown as { chrome: unknown }).chrome = {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({
            snapmark_user_settings: {
              highlightSelectionBeforeCapture: true,
              selectionPaddingPx: 20,
              activeTool: 'arrow',
              activeColor: '#FF3B30',
              strokeWidth: 4,
              textStyleMode: 'background',
            },
          }),
          set: vi.fn().mockResolvedValue(undefined),
        },
      },
      action: {
        setBadgeText: vi.fn(),
        setBadgeBackgroundColor: vi.fn(),
      },
      tabs: {
        captureVisibleTab: vi.fn().mockResolvedValue(SAMPLE_PNG_DATA_URL),
        create: vi.fn(async ({ url }: { url: string }) => {
          openedEditorUrl = url;
          return { id: 501 };
        }),
      },
      scripting: {
        executeScript: vi
          .fn()
          // 1. measureSelectionInDom
          .mockResolvedValueOnce([
            {
              result: {
                hasSelection: true,
                cropRectCss: { x: 80, y: 130, width: 440, height: 80 },
                viewportWidthCss: 1440,
                viewportHeightCss: 900,
                dpr: 2,
                highlightApplied: true,
              },
            },
          ])
          // 2. cleanupSelectionHighlightInDom in finally
          .mockResolvedValueOnce([{ result: true }]),
      },
      runtime: {
        getURL: (p: string) => `chrome-extension://snapmark/${p}`,
      },
    };

    const activeTab = {
      id: 101,
      windowId: 1,
      url: 'https://docs.snapmark.pl/architecture',
    } as chrome.tabs.Tab;

    const captureDate = new Date('2026-11-21T16:20:00.000Z');
    const session = await captureTextSelection(
      activeTab,
      new CaptureRateLimiter({ minIntervalMs: 0 }),
      captureDate,
    );

    expect(openedEditorUrl).toContain(`editor.html?captureId=${session.id}`);
    expect(await listCaptureSessionIds()).toContain(session.id);

    // Open editor.html with the ?captureId=<id> query string
    const editorRoot = document.getElementById('editor-app')!;
    const downloadedFiles: string[] = [];
    const editor = initEditor(editorRoot, {
      initialSearch: `?captureId=${session.id}`,
      onDownloadPng: (filename) => {
        downloadedFiles.push(filename);
      },
    });
    await editor.ready;

    // 1. Verify IndexedDB record was immediately deleted upon hydration
    expect(await listCaptureSessionIds()).not.toContain(session.id);

    // 2. Verify canvas physical Retina crop dimensions (440x80 @2x = 880x160)
    const canvas =
      editorRoot.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    expect(canvas.width).toBe(880);
    expect(canvas.height).toBe(160);
    expect(canvas.style.width).toBe('440px');
    expect(canvas.style.height).toBe('80px');

    // 3. Draw a red vector Arrow (#FF3B30) from (20, 30) to (180, 90)
    canvas.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 20, clientY: 30, button: 0 }),
    );
    canvas.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 180, clientY: 90 }),
    );
    canvas.dispatchEvent(
      new MouseEvent('mouseup', { clientX: 180, clientY: 90 }),
    );

    expect(editor.getState().annotations).toHaveLength(1);
    const arrow = editor.getState().annotations[0] as ArrowAnnotation;
    expect(arrow.type).toBe('arrow');
    expect(arrow.color).toBe('#FF3B30');
    expect(arrow.x2).toBe(180);
    expect(arrow.y2).toBe(90);

    // 4. Drag the arrowhead handle (x2, y2) from (180, 90) to (240, 110)
    const canvasAfterArrow =
      editorRoot.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    canvasAfterArrow.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 180, clientY: 90, button: 0 }),
    );
    canvasAfterArrow.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 240, clientY: 110 }),
    );
    canvasAfterArrow.dispatchEvent(
      new MouseEvent('mouseup', { clientX: 240, clientY: 110 }),
    );
    expect(
      (editor.getState().annotations[0] as ArrowAnnotation).x2,
    ).toBe(240);

    // 5. Switch to 2-in-1 Highlighter (Tool 2) and draw with Shift horizontal lock
    editor.setTool('line');
    editor.setLineSubtype('highlighter');
    editor.setColor('#FFCC00');

    const canvasForLine =
      editorRoot.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    canvasForLine.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 30, clientY: 60, button: 0 }),
    );
    canvasForLine.dispatchEvent(
      new MouseEvent('mousemove', {
        clientX: 310,
        clientY: 88,
        shiftKey: true,
      }),
    );
    canvasForLine.dispatchEvent(
      new MouseEvent('mouseup', {
        clientX: 310,
        clientY: 88,
        shiftKey: true,
      }),
    );

    expect(editor.getState().annotations).toHaveLength(2);
    const highlighter = editor.getState().annotations[1] as LineAnnotation;
    expect(highlighter.subtype).toBe('highlighter');
    expect(highlighter.alpha).toBe(0.35);
    expect(highlighter.y1).toBe(60);
    expect(highlighter.y2).toBe(60);

    // 6. Switch to Text tool (Tool 3) with Outline mode ("Obrys") and commit via Enter
    editor.setTool('text');
    editor.setTextStyleMode('outline');
    editor.setColor('#FFFFFF');

    const canvasForText =
      editorRoot.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    canvasForText.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 40, clientY: 15, button: 0 }),
    );

    const textInput = editorRoot.querySelector<HTMLTextAreaElement>(
      '#active-text-input',
    )!;
    expect(textInput).not.toBeNull();
    textInput.value = 'Kluczowy fragment dokumentacji';
    textInput.dispatchEvent(new Event('input'));
    textInput.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false }),
    );

    expect(editor.getState().annotations).toHaveLength(3);
    const textAnn = editor.getState().annotations[2] as TextAnnotation;
    expect(textAnn.text).toBe('Kluczowy fragment dokumentacji');
    expect(textAnn.styleMode).toBe('outline');

    // 7. Undo via Ctrl+Z removes the text annotation, then re-verify 2 items remain
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }),
    );
    expect(editor.getState().annotations).toHaveLength(2);

    // 8. Export to clipboard ("✓ Skopiowano!") and download flattened PNG
    editorRoot.querySelector<HTMLButtonElement>('#btn-copy-clipboard')?.click();
    await Promise.resolve();
    expect(editor.getState().copySuccess).toBe(true);
    expect(
      editorRoot.querySelector('#btn-copy-clipboard')?.textContent,
    ).toContain('✓ Skopiowano!');
    expect(clipboardWriteMock).toHaveBeenCalledTimes(1);

    editorRoot.querySelector<HTMLButtonElement>('#btn-download-png')?.click();
    expect(downloadedFiles).toHaveLength(1);
    expect(downloadedFiles[0]).toMatch(
      /^docs-snapmark-pl_2026-11-21_\d{2}-\d{2}\.png$/,
    );
  });
});
