import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { captureVisibleViewport } from '../../src/background/capture-orchestrator';
import { CaptureRateLimiter } from '../../src/background/rate-limiter';
import {
  hideViewportScrollbarInDom,
  restoreViewportScrollbarInDom,
} from '../../src/content/capture-injected';
import { renderPopup } from '../../src/popup/index';
import {
  DEFAULT_USER_SETTINGS,
  STROKE_WIDTHS,
} from '../../src/shared/constants';

const SAMPLE_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('Task 035: Clean viewport scrollbar hiding, removed highlight toggle & reversed thick-first stroke defaults', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('FR-09: hideViewportScrollbarInDom injects scrollbar-hiding style and restoreViewportScrollbarInDom removes it', async () => {
    const hidden = await hideViewportScrollbarInDom();
    expect(hidden).toBe(true);
    const styleEl = document.querySelector(
      '[data-snapmark-viewport-scrollbar-style]',
    );
    expect(styleEl).not.toBeNull();
    expect(styleEl?.textContent).toContain('scrollbar-width: none');
    expect(styleEl?.textContent).toContain('::-webkit-scrollbar');

    restoreViewportScrollbarInDom();
    expect(
      document.querySelector('[data-snapmark-viewport-scrollbar-style]'),
    ).toBeNull();
  });

  it('FR-09: captureVisibleViewport hides scrollbars before captureVisibleTab and restores them in finally even if capture fails', async () => {
    const calls: string[] = [];
    vi.stubGlobal('chrome', {
      scripting: {
        executeScript: vi.fn(
          async ({ func }: { func: (...args: unknown[]) => unknown }) => {
            calls.push(func.name || 'anon');
            if (func === hideViewportScrollbarInDom) {
              return [{ result: true }];
            }
            if (func === restoreViewportScrollbarInDom) {
              return [{ result: undefined }];
            }
            return [
              {
                result: {
                  dpr: 2,
                  viewportWidthCss: 1440,
                  viewportHeightCss: 900,
                },
              },
            ];
          },
        ),
      },
      tabs: {
        captureVisibleTab: vi.fn(async () => {
          calls.push('captureVisibleTab');
          return SAMPLE_PNG_DATA_URL;
        }),
        create: vi.fn(async () => ({ id: 99 })),
      },
      runtime: {
        getURL: (p: string) => `chrome-extension://snapmark/${p}`,
      },
    });

    await captureVisibleViewport(
      { id: 12, windowId: 1, url: 'https://example.com' } as chrome.tabs.Tab,
      new CaptureRateLimiter({ minIntervalMs: 0 }),
    );

    const hideIdx = calls.indexOf('hideViewportScrollbarInDom');
    const capIdx = calls.indexOf('captureVisibleTab');
    const restoreIdx = calls.indexOf('restoreViewportScrollbarInDom');
    expect(hideIdx).toBeGreaterThanOrEqual(0);
    expect(capIdx).toBeGreaterThan(hideIdx);
    expect(restoreIdx).toBeGreaterThan(capIdx);
  });

  it('FR-14: STROKE_WIDTHS is ordered thick -> medium -> thin (8, 4, 2) and default strokeWidth is 8px', () => {
    expect(STROKE_WIDTHS.map((s) => s.value)).toEqual([8, 4, 2]);
    expect(DEFAULT_USER_SETTINGS.strokeWidth).toBe(8);
  });

  it('FR-15: popup.html no longer renders the yellow text highlight toggle footer', () => {
    const container = document.createElement('div');
    renderPopup(container, { initialSearch: '?state=default' });

    expect(container.querySelector('#toggle-highlight')).toBeNull();
    expect(container.querySelector('#label-toggle-highlight')).toBeNull();
    expect(container.textContent).not.toContain(
      'Podświetl zaznaczony tekst na żółto',
    );
  });
});
