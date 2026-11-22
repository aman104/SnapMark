import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import {
  captureInteractiveArea,
  handleCaptureTrigger,
} from '../../src/background/capture-orchestrator';
import { CaptureRateLimiter } from '../../src/background/rate-limiter';
import { getCaptureSession } from '../../src/shared/db';

const SAMPLE_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('Task 027: Background Service Worker Interactive Screen Area Selection Orchestration', () => {
  it('injects selectAreaOverlayInDom, captures the visible tab, saves cropRectCss in IndexedDB, and opens editor.html', async () => {
    let createdTabUrl = '';
    const captureVisibleTab = vi.fn().mockResolvedValue(SAMPLE_PNG_DATA_URL);

    (globalThis as unknown as { chrome: unknown }).chrome = {
      tabs: {
        captureVisibleTab,
        create: vi.fn(async ({ url }: { url: string }) => {
          createdTabUrl = url;
          return { id: 888 };
        }),
      },
      scripting: {
        executeScript: vi.fn().mockResolvedValue([
          {
            result: {
              cancelled: false,
              cropRectCss: { x: 140, y: 95, width: 520, height: 310 },
              viewportWidthCss: 1440,
              viewportHeightCss: 900,
              dpr: 2,
            },
          },
        ]),
      },
      runtime: {
        getURL: (p: string) => `chrome-extension://snapmark/${p}`,
      },
    };

    const fakeTab = {
      id: 21,
      windowId: 1,
      url: 'https://landingi.com/pl/funkcje',
    } as chrome.tabs.Tab;

    const session = await captureInteractiveArea(
      fakeTab,
      new CaptureRateLimiter({ minIntervalMs: 0 }),
    );

    expect(session).not.toBeNull();
    expect(session?.mode).toBe('selection');
    expect(session?.cropRectCss).toEqual({
      x: 140,
      y: 95,
      width: 520,
      height: 310,
    });
    expect(session?.totalWidthCss).toBe(520);
    expect(session?.totalHeightCss).toBe(310);
    expect(session?.dpr).toBe(2);
    expect(captureVisibleTab).toHaveBeenCalledTimes(1);
    expect(createdTabUrl).toContain(`editor.html?captureId=${session?.id}`);

    const stored = await getCaptureSession(session!.id);
    expect(stored?.cropRectCss).toEqual({
      x: 140,
      y: 95,
      width: 520,
      height: 310,
    });
  });

  it('returns null and does not capture or open editor.html when user cancels area selection with Escape', async () => {
    const captureVisibleTab = vi.fn();
    const createTab = vi.fn();

    (globalThis as unknown as { chrome: unknown }).chrome = {
      tabs: {
        captureVisibleTab,
        create: createTab,
      },
      scripting: {
        executeScript: vi.fn().mockResolvedValue([
          {
            result: {
              cancelled: true,
              cropRectCss: null,
              viewportWidthCss: 1440,
              viewportHeightCss: 900,
              dpr: 2,
            },
          },
        ]),
      },
      runtime: {
        getURL: (p: string) => `chrome-extension://snapmark/${p}`,
      },
    };

    const fakeTab = {
      id: 22,
      windowId: 1,
      url: 'https://landingi.com/pl',
    } as chrome.tabs.Tab;

    const response = await handleCaptureTrigger(
      'selection',
      fakeTab,
      new CaptureRateLimiter({ minIntervalMs: 0 }),
      { interactiveArea: true },
    );

    expect(response.ok).toBe(false);
    expect(captureVisibleTab).not.toHaveBeenCalled();
    expect(createTab).not.toHaveBeenCalled();
  });
});
