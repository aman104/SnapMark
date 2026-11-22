import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cancelActiveScrollCapture,
  captureFullPageScroll,
  captureImageElement,
  captureTextSelection,
  handleCaptureTrigger,
} from '../../src/background/capture-orchestrator';
import { CaptureRateLimiter } from '../../src/background/rate-limiter';
import {
  cleanupSelectionHighlightInDom,
  hideFixedAndStickyElementsInDom,
  measureSelectionInDom,
  measureTargetImageInDom,
  prepareFullPageScrollInDom,
  restoreFullPageScrollInDom,
  settleFullPageScrollInDom,
  stepFullPageScrollInDom,
} from '../../src/content/capture-injected';
import {
  deleteCaptureSession,
  getCaptureSession,
  listCaptureSessionIds,
} from '../../src/shared/db';
import {
  resetUserSettings,
  updateUserSettings,
} from '../../src/shared/settings';

const SAMPLE_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('Task 017: Selection, Image, and Full-Page Scroll orchestration in Background Service Worker', () => {
  beforeEach(async () => {
    localStorage.clear();
    await resetUserSettings();
    const ids = await listCaptureSessionIds();
    for (const id of ids) {
      await deleteCaptureSession(id);
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('captures text selection with 20px safety margin, optional yellow highlight, and guarantees finally cleanup', async () => {
    await updateUserSettings({ highlightSelectionBeforeCapture: true });

    const calledFunctions: unknown[] = [];
    const executeScriptMock = vi.fn(async (injection: { func: unknown }) => {
      calledFunctions.push(injection.func);
      if (injection.func === measureSelectionInDom) {
        return [
          {
            result: {
              hasSelection: true,
              selectedText: 'Zaznaczony akapit',
              cropRectCss: { x: 80, y: 130, width: 440, height: 80 },
              viewportWidthCss: 1440,
              viewportHeightCss: 900,
              dpr: 2,
              highlightApplied: true,
            },
          },
        ];
      }
      if (injection.func === cleanupSelectionHighlightInDom) {
        return [{ result: 2 }];
      }
      return [];
    });

    const tabsCreateMock = vi.fn(async (props: chrome.tabs.CreateProperties) => props);

    vi.stubGlobal('chrome', {
      tabs: {
        query: vi.fn(async () => [
          { id: 11, windowId: 2, url: 'https://domena.pl/artykul' },
        ]),
        captureVisibleTab: vi.fn(async () => SAMPLE_PNG_DATA_URL),
        create: tabsCreateMock,
      },
      scripting: {
        executeScript: executeScriptMock,
      },
      runtime: {
        getURL: (p: string) => `chrome-extension://id/${p}`,
      },
    });

    const fastLimiter = new CaptureRateLimiter({
      minIntervalMs: 0,
      sleep: async () => {},
    });

    const session = await captureTextSelection(undefined, fastLimiter);

    expect(session.mode).toBe('selection');
    expect(session.cropRectCss).toEqual({
      x: 80,
      y: 130,
      width: 440,
      height: 80,
    });
    expect(session.totalWidthCss).toBe(440);
    expect(session.totalHeightCss).toBe(80);

    // Highlight cleanup was executed in finally block
    expect(calledFunctions).toContain(measureSelectionInDom);
    expect(calledFunctions).toContain(cleanupSelectionHighlightInDom);

    const stored = await getCaptureSession(session.id);
    expect(stored?.cropRectCss).toEqual({
      x: 80,
      y: 130,
      width: 440,
      height: 80,
    });
  });

  it('returns a clear Polish error when selection capture is triggered with no text selected', async () => {
    vi.stubGlobal('chrome', {
      tabs: {
        query: vi.fn(async () => [
          { id: 12, windowId: 2, url: 'https://domena.pl/artykul' },
        ]),
      },
      scripting: {
        executeScript: vi.fn(async () => [
          {
            result: {
              hasSelection: false,
              selectedText: '',
              cropRectCss: null,
              viewportWidthCss: 1440,
              viewportHeightCss: 900,
              dpr: 2,
              highlightApplied: false,
            },
          },
        ]),
      },
    });

    const res = await handleCaptureTrigger('selection');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain('Najpierw zaznacz fragment tekstu');
    }
  });

  it('captures a clicked <img> element by srcUrl and stores cropRectCss in IndexedDB without network fetch', async () => {
    const executeScriptMock = vi.fn(
      async (injection: { func: unknown; args?: unknown[] }) => {
        if (injection.func === measureTargetImageInDom) {
          return [
            {
              result: {
                found: true,
                cropRectCss: { x: 240, y: 180, width: 640, height: 420 },
                viewportWidthCss: 1440,
                viewportHeightCss: 900,
                dpr: 2,
                matchedSrc: String(injection.args?.[0] ?? ''),
              },
            },
          ];
        }
        return [];
      },
    );

    vi.stubGlobal('chrome', {
      tabs: {
        query: vi.fn(async () => [
          { id: 15, windowId: 3, url: 'https://domena.pl/galeria' },
        ]),
        captureVisibleTab: vi.fn(async () => SAMPLE_PNG_DATA_URL),
        create: vi.fn(async () => ({})),
      },
      scripting: {
        executeScript: executeScriptMock,
      },
    });

    const fastLimiter = new CaptureRateLimiter({
      minIntervalMs: 0,
      sleep: async () => {},
    });

    const session = await captureImageElement(
      'https://cdn.domena.pl/photo.avif',
      undefined,
      fastLimiter,
    );

    expect(session.mode).toBe('image');
    expect(session.cropRectCss).toEqual({
      x: 240,
      y: 180,
      width: 640,
      height: 420,
    });
    expect(session.totalWidthCss).toBe(640);
    expect(session.totalHeightCss).toBe(420);
  });

  it('orchestrates multi-frame full-page scroll capture with >= 550ms rate limiting, fixed/sticky suppression after Frame #1, badge updates, and finally restoration', async () => {
    const stepLog: string[] = [];
    const badgeTexts: string[] = [];

    const executeScriptMock = vi.fn(
      async (injection: { func: unknown; args?: unknown[] }) => {
        if (injection.func === prepareFullPageScrollInDom) {
          stepLog.push('prepare');
          return [
            {
              result: {
                originalScrollX: 0,
                originalScrollY: 250,
                totalWidthCss: 1440,
                totalHeightCss: 2250,
                viewportWidthCss: 1440,
                viewportHeightCss: 900,
                dpr: 2,
                frameOffsetsY: [0, 900, 1350],
                exceededMaxHeight: false,
              },
            },
          ];
        }
        if (injection.func === hideFixedAndStickyElementsInDom) {
          stepLog.push('hideFixedSticky');
          return [{ result: 2 }];
        }
        if (injection.func === settleFullPageScrollInDom) {
          const targetY = Number(injection.args?.[0] ?? 0);
          stepLog.push(`settle:${targetY}`);
          return [{ result: targetY }];
        }
        if (injection.func === stepFullPageScrollInDom) {
          const targetY = Number(injection.args?.[0] ?? 0);
          stepLog.push(`scrollTo:${targetY}`);
          return [
            {
              result: {
                // Simulate a browser where the immediate measurement is stale.
                actualScrollY: targetY === 900 ? 0 : targetY,
                viewportWidthCss: 1440,
                viewportHeightCss: 900,
              },
            },
          ];
        }
        if (injection.func === restoreFullPageScrollInDom) {
          stepLog.push(
            `restore:${String(injection.args?.[0])},${String(injection.args?.[1])}`,
          );
          return [];
        }
        return [];
      },
    );

    vi.stubGlobal('chrome', {
      tabs: {
        query: vi.fn(async () => [
          { id: 21, windowId: 4, url: 'https://domena.pl/dlugi-artykul' },
        ]),
        captureVisibleTab: vi.fn(async () => {
          stepLog.push('captureFrame');
          return SAMPLE_PNG_DATA_URL;
        }),
        create: vi.fn(async () => ({})),
      },
      scripting: {
        executeScript: executeScriptMock,
      },
      action: {
        setBadgeBackgroundColor: vi.fn(),
        setBadgeText: vi.fn(({ text }: { text: string }) => {
          badgeTexts.push(text);
        }),
      },
      runtime: {
        sendMessage: vi.fn(async () => {}),
      },
    });

    let virtualNow = 1000;
    const sleepCalls: number[] = [];
    const rateLimiter = new CaptureRateLimiter({
      minIntervalMs: 550,
      now: () => virtualNow,
      sleep: async (ms: number) => {
        sleepCalls.push(ms);
        virtualNow += ms;
      },
    });

    const session = await captureFullPageScroll(undefined, rateLimiter);

    expect(session.mode).toBe('fullpage');
    expect(session.frames.length).toBe(3);
    expect(session.frames.map((f) => f.scrollYCss)).toEqual([0, 900, 1350]);
    expect(session.totalHeightCss).toBe(2250);

    // Order of operations: prepare -> capture Frame #1 -> hideFixedSticky -> scrollTo:900 -> capture Frame #2 -> scrollTo:1350 -> capture Frame #3 -> restore:0,250
    expect(stepLog).toEqual([
      'prepare',
      'settle:0',
      'captureFrame',
      'hideFixedSticky',
      'scrollTo:900',
      'settle:900',
      'captureFrame',
      'scrollTo:1350',
      'settle:1350',
      'captureFrame',
      'restore:0,250',
    ]);

    // Enforced >= 550ms delay between Frame 1->2 and Frame 2->3
    expect(sleepCalls).toEqual([550, 550]);

    // Badge progressed 1/3 -> 2/3 -> 3/3 and cleared to '' in finally
    expect(badgeTexts).toEqual(['1/3', '2/3', '3/3', '']);
  });

  it('does not capture when the first frame cannot be confirmed at the top and restores the page', async () => {
    const capture = vi.fn();
    const restore = vi.fn();
    vi.stubGlobal('chrome', {
      tabs: { captureVisibleTab: capture },
      scripting: { executeScript: vi.fn(async (injection: { func: unknown }) => {
        if (injection.func === prepareFullPageScrollInDom) return [{ result: {
          originalScrollX: 0, originalScrollY: 400, totalWidthCss: 100,
          totalHeightCss: 200, viewportWidthCss: 100, viewportHeightCss: 100,
          dpr: 1, frameOffsetsY: [0, 100], exceededMaxHeight: false,
        } }];
        if (injection.func === settleFullPageScrollInDom) return [{ result: 400 }];
        if (injection.func === restoreFullPageScrollInDom) restore();
        return [];
      }) },
    });
    await expect(captureFullPageScroll(
      { id: 1, windowId: 1, url: 'https://example.com' } as chrome.tabs.Tab,
      new CaptureRateLimiter({ minIntervalMs: 0 }),
    )).rejects.toThrow('Nie udało się potwierdzić pozycji');
    expect(capture).not.toHaveBeenCalled();
    expect(restore).toHaveBeenCalledOnce();
  });

  it('restores the page when settling times out after cancellation', async () => {
    const restore = vi.fn();
    vi.stubGlobal('chrome', {
      tabs: { captureVisibleTab: vi.fn() },
      scripting: { executeScript: vi.fn(async (injection: { func: unknown }) => {
        if (injection.func === prepareFullPageScrollInDom) return [{ result: {
          originalScrollX: 0, originalScrollY: 400, totalWidthCss: 100,
          totalHeightCss: 200, viewportWidthCss: 100, viewportHeightCss: 100,
          dpr: 1, frameOffsetsY: [0, 100], exceededMaxHeight: false,
        } }];
        if (injection.func === settleFullPageScrollInDom) {
          cancelActiveScrollCapture();
          throw new Error('Przekroczono czas');
        }
        if (injection.func === restoreFullPageScrollInDom) restore();
        return [];
      }) },
    });
    await expect(captureFullPageScroll(
      { id: 1, windowId: 1, url: 'https://example.com' } as chrome.tabs.Tab,
      new CaptureRateLimiter({ minIntervalMs: 0 }),
    )).rejects.toThrow('Przekroczono czas');
    expect(restore).toHaveBeenCalledOnce();
  });

  it('aborts cleanly and restores DOM state when full-page scroll capture is cancelled mid-flight', async () => {
    let restored = false;
    const tabsCreateMock = vi.fn(async () => ({}));

    vi.stubGlobal('chrome', {
      tabs: {
        query: vi.fn(async () => [
          { id: 30, windowId: 5, url: 'https://domena.pl/dlugi' },
        ]),
        captureVisibleTab: vi.fn(async () => {
          // User cancels right after Frame #1
          cancelActiveScrollCapture();
          return SAMPLE_PNG_DATA_URL;
        }),
        create: tabsCreateMock,
      },
      scripting: {
        executeScript: vi.fn(async (injection: { func: unknown }) => {
          if (injection.func === prepareFullPageScrollInDom) {
            return [
              {
                result: {
                  originalScrollX: 0,
                  originalScrollY: 100,
                  totalWidthCss: 1200,
                  totalHeightCss: 2400,
                  viewportWidthCss: 1200,
                  viewportHeightCss: 800,
                  dpr: 1,
                  frameOffsetsY: [0, 800, 1600],
                  exceededMaxHeight: false,
                },
              },
            ];
          }
          if (injection.func === restoreFullPageScrollInDom) {
            restored = true;
          }
          if (injection.func === settleFullPageScrollInDom) return [{ result: 0 }];
          return [];
        }),
      },
    });

    const fastLimiter = new CaptureRateLimiter({
      minIntervalMs: 0,
      sleep: async () => {},
    });

    await expect(
      captureFullPageScroll(undefined, fastLimiter),
    ).rejects.toThrow(/anulowane/i);

    expect(restored).toBe(true);
    expect(tabsCreateMock).not.toHaveBeenCalled();
  });
});
