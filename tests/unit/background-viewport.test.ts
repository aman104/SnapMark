import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  captureVisibleViewport,
  CONTEXT_MENU_IDS,
  dataUrlToBlob,
  handleCaptureTrigger,
  registerContextMenus,
} from '../../src/background/capture-orchestrator';
import { CaptureRateLimiter } from '../../src/background/rate-limiter';
import {
  deleteCaptureSession,
  getCaptureSession,
  listCaptureSessionIds,
} from '../../src/shared/db';

const SAMPLE_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('Task 011: MV3 Background Service Worker & Visible Viewport Capture', () => {
  beforeEach(async () => {
    const ids = await listCaptureSessionIds();
    for (const id of ids) {
      await deleteCaptureSession(id);
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('converts a base64 PNG Data URL into a binary image/png Blob', () => {
    const blob = dataUrlToBlob(SAMPLE_PNG_DATA_URL);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBeGreaterThan(20);
  });

  it('registers the 3 context menu items (selection, image, viewport) with Polish titles', () => {
    const createdMenus: chrome.contextMenus.CreateProperties[] = [];
    const removeAllMock = vi.fn((cb?: () => void) => cb?.());
    const createMock = vi.fn(
      (props: chrome.contextMenus.CreateProperties) => {
        createdMenus.push(props);
      },
    );

    vi.stubGlobal('chrome', {
      contextMenus: {
        removeAll: removeAllMock,
        create: createMock,
      },
    });

    registerContextMenus();

    expect(removeAllMock).toHaveBeenCalledTimes(1);
    expect(createdMenus).toEqual([
      {
        id: CONTEXT_MENU_IDS.SELECTION,
        title: 'Zrób screena zaznaczenia',
        contexts: ['selection'],
      },
      {
        id: CONTEXT_MENU_IDS.IMAGE,
        title: 'Edytuj i pobierz obrazek',
        contexts: ['image'],
      },
      {
        id: CONTEXT_MENU_IDS.VIEWPORT,
        title: 'Zrób zrzut widocznego ekranu',
        contexts: ['page'],
      },
    ]);
  });

  it('captures the visible viewport, stores the Blob session in IndexedDB, and opens editor.html?captureId=<id>', async () => {
    const captureVisibleTabMock = vi.fn(async () => SAMPLE_PNG_DATA_URL);
    const tabsCreateMock = vi.fn(async (props: chrome.tabs.CreateProperties) => props);
    const executeScriptMock = vi.fn(async () => [
      {
        result: {
          viewportWidthCss: 1440,
          viewportHeightCss: 900,
          dpr: 2,
        },
      },
    ]);

    vi.stubGlobal('chrome', {
      tabs: {
        query: vi.fn(async () => [
          {
            id: 42,
            windowId: 7,
            url: 'https://domena.pl/artykul/test',
            width: 1440,
            height: 900,
          },
        ]),
        captureVisibleTab: captureVisibleTabMock,
        create: tabsCreateMock,
      },
      scripting: {
        executeScript: executeScriptMock,
      },
      runtime: {
        getURL: (path: string) => `chrome-extension://snapmark-id/${path}`,
      },
    });

    const fastLimiter = new CaptureRateLimiter({
      minIntervalMs: 0,
      sleep: async () => {},
    });

    const session = await captureVisibleViewport(undefined, fastLimiter);

    expect(captureVisibleTabMock).toHaveBeenCalledWith(7, { format: 'png' });
    expect(session.mode).toBe('viewport');
    expect(session.sourceDomain).toBe('domena-pl');
    expect(session.dpr).toBe(2);
    expect(session.totalWidthCss).toBe(1440);
    expect(session.totalHeightCss).toBe(900);

    // Session is stored in SnapMarkDB
    const stored = await getCaptureSession(session.id);
    expect(stored).not.toBeNull();
    expect(stored?.frames[0]?.blob.type).toBe('image/png');

    // Editor tab was opened with captureId
    expect(tabsCreateMock).toHaveBeenCalledWith({
      url: `chrome-extension://snapmark-id/editor.html?captureId=${encodeURIComponent(session.id)}&mode=viewport`,
    });
  });

  it('rejects restricted browser URLs (chrome:// and Chrome Web Store)', async () => {
    vi.stubGlobal('chrome', {
      tabs: {
        query: vi.fn(async () => [
          {
            id: 99,
            windowId: 1,
            url: 'chrome://extensions',
          },
        ]),
      },
    });

    const response = await handleCaptureTrigger('viewport');
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toContain('blokuje wykonywanie zrzutów');
    }
  });
});
