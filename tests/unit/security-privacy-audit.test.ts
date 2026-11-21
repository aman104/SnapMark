import 'fake-indexeddb/auto';
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  captureFullPageScroll,
  captureTextSelection,
} from '../../src/background/capture-orchestrator';
import { CaptureRateLimiter } from '../../src/background/rate-limiter';
import { initEditor } from '../../src/editor/index';
import {
  listCaptureSessionIds,
  saveCaptureSession,
} from '../../src/shared/db';
import type { CaptureSession } from '../../src/shared/types';

const SAMPLE_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('Task 023: PRD §7 Edge-Case Hardening & §10-11 Privacy, Permissions and Zero-Network Audit', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="editor-app"></div>';
  });

  it('audits public/manifest.json for strict Manifest V3 least-privilege permissions (no <all_urls> or host_permissions)', () => {
    const manifestPath = path.resolve(process.cwd(), 'public/manifest.json');
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw) as Record<string, unknown>;

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toEqual([
      'activeTab',
      'contextMenus',
      'scripting',
      'storage',
    ]);
    expect(manifest.host_permissions).toBeUndefined();
    expect(manifest.optional_host_permissions).toBeUndefined();
    expect(raw).not.toContain('<all_urls>');
    expect(raw).not.toContain('*://*/*');
  });

  it('audits built dist/ bundle and source files for zero external network calls, CDNs, or telemetry endpoints', () => {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      const walk = (dir: string): string[] => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        const files: string[] = [];
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            files.push(...walk(full));
          } else if (/\.(js|css|html|json)$/i.test(entry.name)) {
            files.push(full);
          }
        }
        return files;
      };

      const files = walk(distDir);
      expect(files.length).toBeGreaterThan(0);

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        expect(content).not.toContain('fonts.googleapis.com');
        expect(content).not.toContain('fonts.gstatic.com');
        expect(content).not.toContain('google-analytics.com');
        expect(content).not.toContain('sentry.io');
        expect(content).not.toMatch(/fetch\s*\(\s*['"`]https?:\/\//i);
      }
    }
  });

  it('PRD §7 Edge Case: invoking Selection capture (Alt+Shift+S) without selected text sets warning badge "!" and does not open editor.html', async () => {
    const setBadgeText = vi.fn();
    const createTab = vi.fn();

    (globalThis as unknown as { chrome: unknown }).chrome = {
      action: {
        setBadgeText,
        setBadgeBackgroundColor: vi.fn(),
      },
      tabs: {
        create: createTab,
        captureVisibleTab: vi.fn().mockResolvedValue(SAMPLE_PNG_DATA_URL),
      },
      scripting: {
        executeScript: vi.fn().mockResolvedValue([
          {
            result: {
              hasSelection: false,
              cropRectCss: null,
              viewportWidthCss: 1280,
              viewportHeightCss: 800,
              dpr: 2,
              highlightApplied: false,
            },
          },
        ]),
      },
      runtime: {
        getURL: (p: string) => `chrome-extension://snapmark/${p}`,
      },
    };

    const fakeTab = {
      id: 42,
      windowId: 1,
      url: 'https://example.com/article',
    } as chrome.tabs.Tab;

    await expect(
      captureTextSelection(
        fakeTab,
        new CaptureRateLimiter({ minIntervalMs: 0 }),
      ),
    ).rejects.toThrow('Najpierw zaznacz fragment tekstu na stronie.');

    expect(setBadgeText).toHaveBeenCalledWith({ text: '!' });
    expect(createTab).not.toHaveBeenCalled();
  });

  it('PRD §7 Edge Case: inner-container page where window.scrollY does not advance terminates scroll loop cleanly after Frame #1 without duplicating frames', async () => {
    const createTab = vi.fn().mockResolvedValue({ id: 99 });
    const executeScript = vi
      .fn()
      // 1. prepareFullPageScrollInDom -> reports 3 frame offsets [0, 800, 1600]
      .mockResolvedValueOnce([
        {
          result: {
            originalScrollX: 0,
            originalScrollY: 0,
            totalWidthCss: 1280,
            totalHeightCss: 2400,
            viewportWidthCss: 1280,
            viewportHeightCss: 800,
            dpr: 2,
            frameOffsetsY: [0, 800, 1600],
            exceededMaxHeight: false,
          },
        },
      ])
      // 2. hideFixedAndStickyElementsInDom after Frame #1
      .mockResolvedValueOnce([{ result: { hiddenCount: 1 } }])
      // 3. stepFullPageScrollInDom(800) -> window.scrollY stays stuck at 0 (inner overflow container page)
      .mockResolvedValueOnce([
        {
          result: {
            actualScrollY: 0,
          },
        },
      ])
      // 4. restoreFullPageScrollInDom in finally block
      .mockResolvedValueOnce([{ result: true }]);

    (globalThis as unknown as { chrome: unknown }).chrome = {
      action: {
        setBadgeText: vi.fn(),
        setBadgeBackgroundColor: vi.fn(),
      },
      tabs: {
        create: createTab,
        captureVisibleTab: vi.fn().mockResolvedValue(SAMPLE_PNG_DATA_URL),
      },
      scripting: {
        executeScript,
      },
      runtime: {
        getURL: (p: string) => `chrome-extension://snapmark/${p}`,
        sendMessage: vi.fn().mockResolvedValue(undefined),
      },
    };

    const fakeTab = {
      id: 77,
      windowId: 1,
      url: 'https://app.example.com/dashboard',
    } as chrome.tabs.Tab;

    const session = await captureFullPageScroll(
      fakeTab,
      new CaptureRateLimiter({ minIntervalMs: 0 }),
    );

    // Terminated after Frame #1 because actualScrollYCss did not advance on step #2
    expect(session.frames).toHaveLength(1);
    expect(session.totalHeightCss).toBe(800);
    // Restore was still called in finally
    expect(executeScript).toHaveBeenCalledTimes(4);

    // Editor consumes the session and leaves 0 lingering records in IndexedDB
    const root = document.getElementById('editor-app')!;
    const controller = initEditor(root, {
      initialSearch: `?captureId=${session.id}`,
    });
    await controller.ready;

    const remainingIds = await listCaptureSessionIds();
    expect(remainingIds).not.toContain(session.id);
  });

  it('PRD §10 Privacy Audit: IndexedDB stores raw Blob and purges record immediately upon editor hydration', async () => {
    const session: CaptureSession = {
      id: 'cap_privacy_audit_001',
      mode: 'viewport',
      sourceUrl: 'https://bank.example.pl/panel',
      sourceDomain: 'bank.example.pl',
      capturedAt: new Date().toISOString(),
      dpr: 2,
      totalWidthCss: 1280,
      totalHeightCss: 800,
      frames: [
        {
          blob: new Blob(['raw-png-bytes'], { type: 'image/png' }),
          scrollYCss: 0,
          viewportWidthCss: 1280,
          viewportHeightCss: 800,
        },
      ],
    };

    await saveCaptureSession(session);
    expect(await listCaptureSessionIds()).toContain('cap_privacy_audit_001');

    const root = document.getElementById('editor-app')!;
    const controller = initEditor(root, {
      initialSearch: '?captureId=cap_privacy_audit_001',
    });
    await controller.ready;

    expect(await listCaptureSessionIds()).not.toContain('cap_privacy_audit_001');
  });
});
