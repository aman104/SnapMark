import { cleanupStaleCaptures, saveCaptureSession } from '../shared/db';
import { normalizeDpr } from '../shared/dpi';
import { normalizeDomainForFilename } from '../shared/filename';
import type {
  CaptureMode,
  CaptureSession,
  RuntimeCaptureRequest,
  RuntimeCaptureResponse,
} from '../shared/types';
import { isRestrictedBrowserUrl } from '../shared/url-guard';
import { CaptureRateLimiter } from './rate-limiter';

export const CONTEXT_MENU_IDS = {
  SELECTION: 'capture-selection',
  IMAGE: 'capture-image',
  VIEWPORT: 'capture-viewport',
} as const;

export const defaultCaptureRateLimiter = new CaptureRateLimiter();

export function dataUrlToBlob(dataUrl: string): Blob {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) {
    throw new Error('Invalid Data URL format');
  }
  const header = dataUrl.slice(0, commaIdx);
  const base64 = dataUrl.slice(commaIdx + 1);
  const mimeMatch = header.match(/data:([^;]+);base64/i);
  const mimeType = mimeMatch?.[1] ?? 'image/png';

  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export function registerContextMenus(): void {
  if (typeof chrome === 'undefined' || !chrome.contextMenus) {
    return;
  }

  const createItems = (): void => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_IDS.SELECTION,
      title: 'Zrób screena zaznaczenia',
      contexts: ['selection'],
    });
    chrome.contextMenus.create({
      id: CONTEXT_MENU_IDS.IMAGE,
      title: 'Edytuj i pobierz obrazek',
      contexts: ['image'],
    });
    chrome.contextMenus.create({
      id: CONTEXT_MENU_IDS.VIEWPORT,
      title: 'Zrób zrzut widocznego ekranu',
      contexts: ['page'],
    });
  };

  if (typeof chrome.contextMenus.removeAll === 'function') {
    chrome.contextMenus.removeAll(() => {
      createItems();
    });
  } else {
    createItems();
  }
}

interface ViewportMetrics {
  viewportWidthCss: number;
  viewportHeightCss: number;
  dpr: number;
}

async function readTabViewportMetrics(
  tab: chrome.tabs.Tab,
): Promise<ViewportMetrics> {
  const fallbackWidth = tab.width && tab.width > 0 ? tab.width : 1280;
  const fallbackHeight = tab.height && tab.height > 0 ? tab.height : 800;

  if (
    typeof chrome !== 'undefined' &&
    chrome.scripting &&
    typeof chrome.scripting.executeScript === 'function' &&
    typeof tab.id === 'number'
  ) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => ({
          viewportWidthCss: window.innerWidth,
          viewportHeightCss: window.innerHeight,
          dpr: window.devicePixelRatio || 1,
        }),
      });
      const first = results?.[0]?.result as ViewportMetrics | undefined;
      if (
        first &&
        first.viewportWidthCss > 0 &&
        first.viewportHeightCss > 0
      ) {
        return {
          viewportWidthCss: first.viewportWidthCss,
          viewportHeightCss: first.viewportHeightCss,
          dpr: normalizeDpr(first.dpr),
        };
      }
    } catch {
      // Fallback to tab dimensions when script injection is blocked
    }
  }

  return {
    viewportWidthCss: fallbackWidth,
    viewportHeightCss: fallbackHeight,
    dpr: 1,
  };
}

async function resolveActiveTab(
  providedTab?: chrome.tabs.Tab,
): Promise<chrome.tabs.Tab> {
  if (providedTab && providedTab.url) {
    return providedTab;
  }

  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  const activeTab = tabs[0];
  if (!activeTab) {
    throw new Error('Brak aktywnej karty do wykonania zrzutu ekranu.');
  }
  return activeTab;
}

export async function captureVisibleViewport(
  providedTab?: chrome.tabs.Tab,
  rateLimiter: CaptureRateLimiter = defaultCaptureRateLimiter,
  now: Date = new Date(),
): Promise<CaptureSession> {
  const tab = await resolveActiveTab(providedTab);

  if (isRestrictedBrowserUrl(tab.url)) {
    throw new Error(
      'Przeglądarka Chrome ze względów bezpieczeństwa blokuje wykonywanie zrzutów na stronach systemowych i w Chrome Web Store.',
    );
  }

  const sourceUrl = tab.url ?? 'https://strona.local';
  const metrics = await readTabViewportMetrics(tab);

  const dataUrl = await rateLimiter.schedule(async () => {
    return await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png',
    });
  });

  const blob = dataUrlToBlob(dataUrl);
  const id = `cap_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`;

  const session: CaptureSession = {
    id,
    mode: 'viewport',
    sourceUrl,
    sourceDomain: normalizeDomainForFilename(sourceUrl),
    capturedAt: now.toISOString(),
    dpr: metrics.dpr,
    frames: [
      {
        blob,
        scrollYCss: 0,
        viewportWidthCss: metrics.viewportWidthCss,
        viewportHeightCss: metrics.viewportHeightCss,
      },
    ],
    totalWidthCss: metrics.viewportWidthCss,
    totalHeightCss: metrics.viewportHeightCss,
  };

  await saveCaptureSession(session);

  const editorPath = `editor.html?captureId=${encodeURIComponent(session.id)}&mode=viewport`;
  const editorUrl =
    typeof chrome !== 'undefined' &&
    chrome.runtime &&
    typeof chrome.runtime.getURL === 'function'
      ? chrome.runtime.getURL(editorPath)
      : editorPath;

  await chrome.tabs.create({ url: editorUrl });

  return session;
}

export async function handleCaptureTrigger(
  mode: CaptureMode,
  tab?: chrome.tabs.Tab,
  rateLimiter: CaptureRateLimiter = defaultCaptureRateLimiter,
): Promise<RuntimeCaptureResponse> {
  try {
    // In M02, 'viewport' is implemented end-to-end; M03 adds selection, image, and fullpage DOM cropping/scrolling
    const session = await captureVisibleViewport(tab, rateLimiter);
    return {
      ok: true,
      captureId: session.id,
      mode,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Nie udało się wykonać zrzutu ekranu.';
    return {
      ok: false,
      error: message,
    };
  }
}

export function isRuntimeCaptureRequest(
  msg: unknown,
): msg is RuntimeCaptureRequest {
  if (!msg || typeof msg !== 'object') {
    return false;
  }
  const candidate = msg as Partial<RuntimeCaptureRequest>;
  return (
    candidate.type === 'SNAPMARK_TRIGGER_CAPTURE' &&
    typeof candidate.mode === 'string'
  );
}

export async function initializeBackgroundService(): Promise<void> {
  registerContextMenus();
  await cleanupStaleCaptures().catch(() => 0);
}
