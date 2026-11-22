import {
  type AreaSelectionMeasurementResult,
  cleanupSelectionHighlightInDom,
  type FullPageScrollPlan,
  hideFixedAndStickyElementsInDom,
  type ImageMeasurementResult,
  measureSelectionInDom,
  measureTargetImageInDom,
  prepareFullPageScrollInDom,
  restoreFullPageScrollInDom,
  settleFullPageScrollInDom,
  selectAreaOverlayInDom,
  type SelectionMeasurementResult,
  stepFullPageScrollInDom,
} from '../content/capture-injected';
import { MAX_CANVAS_HEIGHT } from '../shared/constants';
import { cleanupStaleCaptures, saveCaptureSession } from '../shared/db';
import { normalizeDpr } from '../shared/dpi';
import { normalizeDomainForFilename } from '../shared/filename';
import { loadUserSettings } from '../shared/settings';
import type {
  CancelScrollCaptureRequest,
  CaptureFrame,
  CaptureMode,
  CaptureSession,
  RuntimeCaptureRequest,
  RuntimeCaptureResponse,
  ScrollCaptureProgressMessage,
} from '../shared/types';
import { isRestrictedBrowserUrl } from '../shared/url-guard';
import { CaptureRateLimiter } from './rate-limiter';

export const CONTEXT_MENU_IDS = {
  SELECTION: 'capture-selection',
  IMAGE: 'capture-image',
  VIEWPORT: 'capture-viewport',
} as const;

export const defaultCaptureRateLimiter = new CaptureRateLimiter();

let activeScrollCaptureCancelled = false;

export function cancelActiveScrollCapture(): void {
  activeScrollCaptureCancelled = true;
}

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

function assertTabUrlAllowed(tab: chrome.tabs.Tab): string {
  if (isRestrictedBrowserUrl(tab.url)) {
    throw new Error(
      'Przeglądarka Chrome ze względów bezpieczeństwa blokuje wykonywanie zrzutów na stronach systemowych i w Chrome Web Store.',
    );
  }
  return tab.url ?? 'https://strona.local';
}

async function openEditorForSession(session: CaptureSession): Promise<void> {
  const editorPath = `editor.html?captureId=${encodeURIComponent(session.id)}&mode=${session.mode}`;
  const editorUrl =
    typeof chrome !== 'undefined' &&
    chrome.runtime &&
    typeof chrome.runtime.getURL === 'function'
      ? chrome.runtime.getURL(editorPath)
      : editorPath;

  await chrome.tabs.create({ url: editorUrl });
}

function updateExtensionBadge(text: string): void {
  if (typeof chrome === 'undefined' || !chrome.action) {
    return;
  }
  try {
    if (text && typeof chrome.action.setBadgeBackgroundColor === 'function') {
      void chrome.action.setBadgeBackgroundColor({ color: '#FF3B30' });
    }
    if (typeof chrome.action.setBadgeText === 'function') {
      void chrome.action.setBadgeText({ text });
    }
  } catch {
    // Ignore badge errors in headless/test contexts
  }
}

function broadcastScrollProgress(
  currentFrame: number,
  totalFrames: number,
  statusText: string,
): void {
  if (
    typeof chrome === 'undefined' ||
    !chrome.runtime ||
    typeof chrome.runtime.sendMessage !== 'function'
  ) {
    return;
  }
  const msg: ScrollCaptureProgressMessage = {
    type: 'SNAPMARK_SCROLL_PROGRESS',
    currentFrame,
    totalFrames,
    statusText,
  };
  try {
    void Promise.resolve(chrome.runtime.sendMessage(msg)).catch(() => {});
  } catch {
    // Ignore when no popup receiver is open
  }
}

/**
 * Tryb 3: Zrzut widocznego ekranu (Visible Viewport Capture — 02-General-PRD.md §4.3)
 */
export async function captureVisibleViewport(
  providedTab?: chrome.tabs.Tab,
  rateLimiter: CaptureRateLimiter = defaultCaptureRateLimiter,
  now: Date = new Date(),
): Promise<CaptureSession> {
  const tab = await resolveActiveTab(providedTab);
  const sourceUrl = assertTabUrlAllowed(tab);
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
  await openEditorForSession(session);

  return session;
}

/**
 * Tryb 1A: Interaktywne zaznaczenie fragmentu ekranu myszą
 * (Interactive Screen Area Selection — 07-feature-plan-interactive-area-selection.md & 02-General-PRD.md §4.1)
 */
export async function captureInteractiveArea(
  providedTab?: chrome.tabs.Tab,
  rateLimiter: CaptureRateLimiter = defaultCaptureRateLimiter,
  now: Date = new Date(),
): Promise<CaptureSession | null> {
  const tab = await resolveActiveTab(providedTab);
  const sourceUrl = assertTabUrlAllowed(tab);

  if (typeof tab.id !== 'number') {
    throw new Error('Brak identyfikatora aktywnej karty.');
  }

  const execResults = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: selectAreaOverlayInDom,
  });

  const measurement = execResults?.[0]?.result as
    | AreaSelectionMeasurementResult
    | undefined;

  if (!measurement || measurement.cancelled || !measurement.cropRectCss) {
    return null;
  }

  const dataUrl = await rateLimiter.schedule(async () => {
    const [activeTab] = await chrome.tabs.query({ active: true, windowId: tab.windowId });
    if (activeTab?.id !== tab.id) {
      throw new Error('Aktywna karta zmieniła się podczas zaznaczania obszaru.');
    }
    return await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png',
    });
  });

  const blob = dataUrlToBlob(dataUrl);
  const dpr = normalizeDpr(measurement.dpr);
  const id = `cap_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`;

  const session: CaptureSession = {
    id,
    mode: 'selection',
    sourceUrl,
    sourceDomain: normalizeDomainForFilename(sourceUrl),
    capturedAt: now.toISOString(),
    dpr,
    cropRectCss: measurement.cropRectCss,
    frames: [
      {
        blob,
        scrollYCss: 0,
        viewportWidthCss: measurement.viewportWidthCss,
        viewportHeightCss: measurement.viewportHeightCss,
      },
    ],
    totalWidthCss: measurement.cropRectCss.width,
    totalHeightCss: measurement.cropRectCss.height,
  };

  await saveCaptureSession(session);
  await openEditorForSession(session);

  return session;
}

/**
 * Tryb 1B: Zrzut zaznaczonego fragmentu tekstu z menu kontekstowego PPM (Selection Capture — 02-General-PRD.md §4.1)
 */
export async function captureTextSelection(
  providedTab?: chrome.tabs.Tab,
  rateLimiter: CaptureRateLimiter = defaultCaptureRateLimiter,
  now: Date = new Date(),
): Promise<CaptureSession> {
  const tab = await resolveActiveTab(providedTab);
  const sourceUrl = assertTabUrlAllowed(tab);

  if (typeof tab.id !== 'number') {
    throw new Error('Brak identyfikatora aktywnej karty.');
  }

  const settings = await loadUserSettings();
  let highlightWasApplied = false;

  try {
    const execResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: measureSelectionInDom,
      args: [
        {
          paddingPx: settings.selectionPaddingPx,
          applyHighlight: settings.highlightSelectionBeforeCapture,
        },
      ],
    });

    const measurement = execResults?.[0]?.result as
      | SelectionMeasurementResult
      | undefined;

    if (!measurement || !measurement.hasSelection || !measurement.cropRectCss) {
      updateExtensionBadge('!');
      throw new Error('Najpierw zaznacz fragment tekstu na stronie.');
    }

    highlightWasApplied = measurement.highlightApplied;

    const dataUrl = await rateLimiter.schedule(async () => {
      return await chrome.tabs.captureVisibleTab(tab.windowId, {
        format: 'png',
      });
    });

    const blob = dataUrlToBlob(dataUrl);
    const id = `cap_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`;

    const session: CaptureSession = {
      id,
      mode: 'selection',
      sourceUrl,
      sourceDomain: normalizeDomainForFilename(sourceUrl),
      capturedAt: now.toISOString(),
      dpr: normalizeDpr(measurement.dpr),
      cropRectCss: measurement.cropRectCss,
      frames: [
        {
          blob,
          scrollYCss: 0,
          viewportWidthCss: measurement.viewportWidthCss,
          viewportHeightCss: measurement.viewportHeightCss,
        },
      ],
      totalWidthCss: measurement.cropRectCss.width,
      totalHeightCss: measurement.cropRectCss.height,
    };

    await saveCaptureSession(session);
    await openEditorForSession(session);

    return session;
  } finally {
    if (highlightWasApplied && typeof tab.id === 'number') {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: cleanupSelectionHighlightInDom,
        });
      } catch {
        // Ignore cleanup errors if tab closed
      }
    }
  }
}

/**
 * Tryb 2: Zrzut wybranego obrazka <img> (Image Element Capture — 02-General-PRD.md §4.2)
 */
export async function captureImageElement(
  srcUrl?: string,
  providedTab?: chrome.tabs.Tab,
  rateLimiter: CaptureRateLimiter = defaultCaptureRateLimiter,
  now: Date = new Date(),
): Promise<CaptureSession> {
  const tab = await resolveActiveTab(providedTab);
  const sourceUrl = assertTabUrlAllowed(tab);

  if (typeof tab.id !== 'number') {
    throw new Error('Brak identyfikatora aktywnej karty.');
  }

  const execResults = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: measureTargetImageInDom,
    args: [srcUrl ?? ''],
  });

  const measurement = execResults?.[0]?.result as
    | ImageMeasurementResult
    | undefined;

  if (!measurement || !measurement.found || !measurement.cropRectCss) {
    throw new Error('Nie znaleziono wybranego obrazka na stronie.');
  }

  const dataUrl = await rateLimiter.schedule(async () => {
    return await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png',
    });
  });

  const blob = dataUrlToBlob(dataUrl);
  const id = `cap_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`;

  const session: CaptureSession = {
    id,
    mode: 'image',
    sourceUrl,
    sourceDomain: normalizeDomainForFilename(sourceUrl),
    capturedAt: now.toISOString(),
    dpr: normalizeDpr(measurement.dpr),
    cropRectCss: measurement.cropRectCss,
    frames: [
      {
        blob,
        scrollYCss: 0,
        viewportWidthCss: measurement.viewportWidthCss,
        viewportHeightCss: measurement.viewportHeightCss,
      },
    ],
    totalWidthCss: measurement.cropRectCss.width,
    totalHeightCss: measurement.cropRectCss.height,
  };

  await saveCaptureSession(session);
  await openEditorForSession(session);

  return session;
}

/**
 * Tryb 4: Zrzut całej strony ze scrollem (Full-Page Scroll Capture — 02-General-PRD.md §4.4)
 */
export async function captureFullPageScroll(
  providedTab?: chrome.tabs.Tab,
  rateLimiter: CaptureRateLimiter = defaultCaptureRateLimiter,
  now: Date = new Date(),
): Promise<CaptureSession> {
  const tab = await resolveActiveTab(providedTab);
  const sourceUrl = assertTabUrlAllowed(tab);

  if (typeof tab.id !== 'number') {
    throw new Error('Brak identyfikatora aktywnej karty.');
  }

  activeScrollCaptureCancelled = false;
  let originalScrollX = 0;
  let originalScrollY = 0;

  try {
    const planResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: prepareFullPageScrollInDom,
      args: [MAX_CANVAS_HEIGHT],
    });

    const plan = planResults?.[0]?.result as FullPageScrollPlan | undefined;
    if (!plan || plan.frameOffsetsY.length === 0) {
      throw new Error('Nie udało się przygotować przewijania strony.');
    }

    originalScrollX = plan.originalScrollX;
    originalScrollY = plan.originalScrollY;

    const totalFrames = plan.frameOffsetsY.length;
    const frames: CaptureFrame[] = [];
    let fixedHeadersHidden = false;
    let lastActualScrollY = -1;

    for (let i = 0; i < totalFrames; i += 1) {
      if (activeScrollCaptureCancelled) {
        throw new Error('Przechwytywanie całej strony zostało anulowane.');
      }

      const targetY = plan.frameOffsetsY[i] ?? 0;
      const frameNum = i + 1;

      updateExtensionBadge(`${frameNum}/${totalFrames}`);
      broadcastScrollProgress(
        frameNum,
        totalFrames,
        i === 0
          ? `Klatka ${frameNum} z ${totalFrames} • Przechwytywanie góry strony...`
          : `Klatka ${frameNum} z ${totalFrames} • Ukrywanie pływających nagłówków (fixed/sticky)...`,
      );

      let actualScrollY = 0;

      if (i > 0) {
        if (!fixedHeadersHidden) {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: hideFixedAndStickyElementsInDom,
          });
          fixedHeadersHidden = true;
        }

        const stepResults = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: stepFullPageScrollInDom,
          args: [targetY],
        });
        const stepInfo = stepResults?.[0]?.result as
          | { actualScrollY: number }
          | undefined;
        actualScrollY =
          typeof stepInfo?.actualScrollY === 'number'
            ? stepInfo.actualScrollY
            : targetY;

        // If the page failed to advance scroll (e.g., locked internal SPA container), stop early to avoid duplicate frames
        if (actualScrollY === lastActualScrollY) {
          break;
        }
      }

      const settledResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: settleFullPageScrollInDom,
        args: [targetY],
      });
      const settledY = settledResults?.[0]?.result;
      if (typeof settledY !== 'number' || Math.abs(settledY - targetY) > 1) {
        throw new Error('Nie udało się potwierdzić pozycji przewijania strony.');
      }
      actualScrollY = settledY;
      lastActualScrollY = actualScrollY;

      const dataUrl = await rateLimiter.schedule(async () => {
        if (activeScrollCaptureCancelled) {
          throw new Error('Przechwytywanie całej strony zostało anulowane.');
        }
        return await chrome.tabs.captureVisibleTab(tab.windowId, {
          format: 'png',
        });
      });

      frames.push({
        blob: dataUrlToBlob(dataUrl),
        scrollYCss: actualScrollY,
        viewportWidthCss: plan.viewportWidthCss,
        viewportHeightCss: plan.viewportHeightCss,
      });
    }

    if (activeScrollCaptureCancelled || frames.length === 0) {
      throw new Error('Przechwytywanie całej strony zostało anulowane.');
    }

    const lastFrame = frames[frames.length - 1];
    const effectiveTotalHeightCss = lastFrame
      ? Math.min(
          plan.totalHeightCss,
          lastFrame.scrollYCss + lastFrame.viewportHeightCss,
        )
      : plan.viewportHeightCss;

    const id = `cap_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`;

    const session: CaptureSession = {
      id,
      mode: 'fullpage',
      sourceUrl,
      sourceDomain: normalizeDomainForFilename(sourceUrl),
      capturedAt: now.toISOString(),
      dpr: normalizeDpr(plan.dpr),
      frames,
      totalWidthCss: plan.viewportWidthCss,
      totalHeightCss: effectiveTotalHeightCss,
      exceededMaxHeight: plan.exceededMaxHeight,
    };

    await saveCaptureSession(session);
    await openEditorForSession(session);

    return session;
  } finally {
    updateExtensionBadge('');
    if (typeof tab.id === 'number') {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: restoreFullPageScrollInDom,
          args: [originalScrollX, originalScrollY],
        });
      } catch {
        // Ignore cleanup errors if tab closed
      }
    }
  }
}

export async function handleCaptureTrigger(
  mode: CaptureMode,
  tab?: chrome.tabs.Tab,
  rateLimiter: CaptureRateLimiter = defaultCaptureRateLimiter,
  options: { srcUrl?: string; interactiveArea?: boolean } = {},
): Promise<RuntimeCaptureResponse> {
  try {
    let session: CaptureSession;
    if (mode === 'selection') {
      if (options.interactiveArea) {
        const areaSession = await captureInteractiveArea(tab, rateLimiter);
        if (!areaSession) {
          return {
            ok: false,
            error: 'Anulowano zaznaczanie fragmentu ekranu.',
          };
        }
        session = areaSession;
      } else {
        session = await captureTextSelection(tab, rateLimiter);
      }
    } else if (mode === 'image') {
      session = await captureImageElement(options.srcUrl, tab, rateLimiter);
    } else if (mode === 'fullpage') {
      session = await captureFullPageScroll(tab, rateLimiter);
    } else {
      session = await captureVisibleViewport(tab, rateLimiter);
    }

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

export function isCancelScrollCaptureRequest(
  msg: unknown,
): msg is CancelScrollCaptureRequest {
  if (!msg || typeof msg !== 'object') {
    return false;
  }
  return (
    (msg as Partial<CancelScrollCaptureRequest>).type ===
    'SNAPMARK_CANCEL_SCROLL_CAPTURE'
  );
}

export async function initializeBackgroundService(): Promise<void> {
  registerContextMenus();
  await cleanupStaleCaptures().catch(() => 0);
}
