import type { CssRect } from '../shared/types';

export interface MeasureSelectionOptions {
  paddingPx?: number;
  applyHighlight?: boolean;
}

export interface SelectionMeasurementResult {
  hasSelection: boolean;
  selectedText: string;
  cropRectCss: CssRect | null;
  viewportWidthCss: number;
  viewportHeightCss: number;
  dpr: number;
  highlightApplied: boolean;
}

/**
 * Self-contained DOM helper executed inside the active tab via chrome.scripting.executeScript
 * for Tryb 1: Zrzut zaznaczonego fragmentu tekstu (02-General-PRD.md §4.1).
 */
export function measureSelectionInDom(
  options: MeasureSelectionOptions = {},
): SelectionMeasurementResult {
  const paddingPx =
    typeof options.paddingPx === 'number' &&
    Number.isFinite(options.paddingPx) &&
    options.paddingPx >= 0
      ? options.paddingPx
      : 20;
  const applyHighlight = Boolean(options.applyHighlight);

  const viewportWidthCss = Math.max(1, window.innerWidth || 1280);
  const viewportHeightCss = Math.max(1, window.innerHeight || 800);
  const dpr =
    typeof window.devicePixelRatio === 'number' &&
    Number.isFinite(window.devicePixelRatio) &&
    window.devicePixelRatio > 0
      ? window.devicePixelRatio
      : 1;

  const selection =
    typeof window.getSelection === 'function' ? window.getSelection() : null;
  const selectedText = selection?.toString().trim() ?? '';

  if (!selection || selection.rangeCount === 0 || selectedText.length === 0) {
    return {
      hasSelection: false,
      selectedText: '',
      cropRectCss: null,
      viewportWidthCss,
      viewportHeightCss,
      dpr,
      highlightApplied: false,
    };
  }

  const range = selection.getRangeAt(0);
  let rect = range.getBoundingClientRect();

  // If selection is partially outside the current viewport, center its container element
  if (rect.top < 0 || rect.bottom > viewportHeightCss) {
    const containerNode = range.commonAncestorContainer;
    const containerEl =
      containerNode.nodeType === Node.ELEMENT_NODE
        ? (containerNode as Element)
        : containerNode.parentElement;
    if (containerEl && typeof containerEl.scrollIntoView === 'function') {
      try {
        containerEl.scrollIntoView({
          block: 'center',
          inline: 'nearest',
          behavior: 'instant' as ScrollBehavior,
        });
        rect = range.getBoundingClientRect();
      } catch {
        // Ignore if scrollIntoView options are unsupported
      }
    }
  }

  const rawWidth = rect.width > 0 ? rect.width : 120;
  const rawHeight = rect.height > 0 ? rect.height : 28;
  const rawX = rect.left;
  const rawY = rect.top;

  // Add automatic 20px safety margin and clamp to viewport boundaries
  const left = Math.max(0, Math.min(viewportWidthCss - 1, rawX - paddingPx));
  const top = Math.max(0, Math.min(viewportHeightCss - 1, rawY - paddingPx));
  const right = Math.max(
    left + 1,
    Math.min(viewportWidthCss, rawX + rawWidth + paddingPx),
  );
  const bottom = Math.max(
    top + 1,
    Math.min(viewportHeightCss, rawY + rawHeight + paddingPx),
  );

  const cropRectCss: CssRect = {
    x: Math.round(left),
    y: Math.round(top),
    width: Math.round(right - left),
    height: Math.round(bottom - top),
  };

  let highlightApplied = false;
  if (applyHighlight && typeof document !== 'undefined' && document.body) {
    // Clean up any leftover highlight nodes first
    document
      .querySelectorAll(
        '[data-snapmark-highlight], [data-snapmark-selection-style]',
      )
      .forEach((node) => node.remove());

    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-snapmark-selection-style', 'true');
    styleEl.textContent =
      '::selection { background: transparent !important; color: inherit !important; }';
    (document.head ?? document.body).appendChild(styleEl);

    const clientRects =
      typeof range.getClientRects === 'function'
        ? Array.from(range.getClientRects())
        : [];
    const rectsToDraw =
      clientRects.length > 0
        ? clientRects
        : [{ left: rawX, top: rawY, width: rawWidth, height: rawHeight }];

    for (const r of rectsToDraw) {
      if (r.width <= 0 || r.height <= 0) continue;
      const overlay = document.createElement('div');
      overlay.setAttribute('data-snapmark-highlight', 'true');
      overlay.style.position = 'fixed';
      overlay.style.left = `${Math.round(r.left)}px`;
      overlay.style.top = `${Math.round(r.top)}px`;
      overlay.style.width = `${Math.round(r.width)}px`;
      overlay.style.height = `${Math.round(r.height)}px`;
      overlay.style.backgroundColor = 'rgba(255, 235, 59, 0.45)';
      overlay.style.borderRadius = '2px';
      overlay.style.pointerEvents = 'none';
      overlay.style.zIndex = '2147483646';
      document.body.appendChild(overlay);
      highlightApplied = true;
    }
  }

  return {
    hasSelection: true,
    selectedText,
    cropRectCss,
    viewportWidthCss,
    viewportHeightCss,
    dpr,
    highlightApplied,
  };
}

/**
 * Self-contained DOM cleanup function removing temporary yellow selection highlights.
 */
export function cleanupSelectionHighlightInDom(): number {
  if (typeof document === 'undefined') {
    return 0;
  }
  const nodes = document.querySelectorAll(
    '[data-snapmark-highlight], [data-snapmark-selection-style]',
  );
  const count = nodes.length;
  nodes.forEach((node) => node.remove());
  return count;
}

export interface ImageMeasurementResult {
  found: boolean;
  cropRectCss: CssRect | null;
  viewportWidthCss: number;
  viewportHeightCss: number;
  dpr: number;
  matchedSrc: string | null;
}

/**
 * Self-contained DOM helper executed inside the active tab via chrome.scripting.executeScript
 * for Tryb 2: Zrzut wybranego obrazka <img> (02-General-PRD.md §4.2).
 * Measures getBoundingClientRect() of the target <img> directly so it can be cropped from
 * captureVisibleTab without network fetch (bypassing CORS, AVIF/WebP, and right-click blocks).
 */
export function measureTargetImageInDom(
  targetSrcUrl?: string,
): ImageMeasurementResult {
  const viewportWidthCss = Math.max(1, window.innerWidth || 1280);
  const viewportHeightCss = Math.max(1, window.innerHeight || 800);
  const dpr =
    typeof window.devicePixelRatio === 'number' &&
    Number.isFinite(window.devicePixelRatio) &&
    window.devicePixelRatio > 0
      ? window.devicePixelRatio
      : 1;

  if (typeof document === 'undefined') {
    return {
      found: false,
      cropRectCss: null,
      viewportWidthCss,
      viewportHeightCss,
      dpr,
      matchedSrc: null,
    };
  }

  const allImages = Array.from(document.querySelectorAll('img'));
  if (allImages.length === 0) {
    return {
      found: false,
      cropRectCss: null,
      viewportWidthCss,
      viewportHeightCss,
      dpr,
      matchedSrc: null,
    };
  }

  const normalizedTarget = (targetSrcUrl ?? '').trim();

  function scoreCandidate(img: HTMLImageElement): number {
    const rect = img.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return -1;
    }

    let score = 0;
    const currentSrc = (img.currentSrc || '').trim();
    const srcProp = (img.src || '').trim();
    const srcAttr = (img.getAttribute('src') || '').trim();

    if (normalizedTarget.length > 0) {
      if (
        currentSrc === normalizedTarget ||
        srcProp === normalizedTarget ||
        srcAttr === normalizedTarget
      ) {
        score += 1000;
      } else if (
        (currentSrc && normalizedTarget.endsWith(currentSrc)) ||
        (srcAttr && normalizedTarget.endsWith(srcAttr))
      ) {
        score += 600;
      } else {
        // When a specific srcUrl was requested and does not match, penalize heavily
        return -1;
      }
    }

    // Prefer images currently visible inside the viewport
    const inVerticalView =
      rect.bottom > 0 && rect.top < viewportHeightCss;
    const inHorizontalView =
      rect.right > 0 && rect.left < viewportWidthCss;
    if (inVerticalView && inHorizontalView) {
      score += 300;
    }

    try {
      if (typeof img.matches === 'function' && img.matches(':hover')) {
        score += 200;
      }
    } catch {
      // Ignore if :hover selector is unsupported
    }

    if (document.activeElement === img) {
      score += 150;
    }

    // Break ties by visible area
    score += Math.min(100, (rect.width * rect.height) / 5000);
    return score;
  }

  let bestImg: HTMLImageElement | null = null;
  let bestScore = -1;

  for (const img of allImages) {
    const score = scoreCandidate(img);
    if (score > bestScore) {
      bestScore = score;
      bestImg = img;
    }
  }

  // Fallback: if targetSrcUrl did not match (e.g., blob/rewritten URL), pick best visible image
  if (!bestImg && normalizedTarget.length > 0) {
    for (const img of allImages) {
      const rect = img.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        bestImg = img;
        break;
      }
    }
  }

  if (!bestImg) {
    return {
      found: false,
      cropRectCss: null,
      viewportWidthCss,
      viewportHeightCss,
      dpr,
      matchedSrc: null,
    };
  }

  let rect = bestImg.getBoundingClientRect();

  // If image is partially clipped by viewport edge and fits in viewport, scroll it into view
  if (
    (rect.top < 0 ||
      rect.left < 0 ||
      rect.bottom > viewportHeightCss ||
      rect.right > viewportWidthCss) &&
    typeof bestImg.scrollIntoView === 'function'
  ) {
    try {
      bestImg.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: 'instant' as ScrollBehavior,
      });
      rect = bestImg.getBoundingClientRect();
    } catch {
      // Ignore scrollIntoView errors
    }
  }

  const left = Math.max(0, Math.min(viewportWidthCss - 1, rect.left));
  const top = Math.max(0, Math.min(viewportHeightCss - 1, rect.top));
  const right = Math.max(
    left + 1,
    Math.min(viewportWidthCss, rect.left + rect.width),
  );
  const bottom = Math.max(
    top + 1,
    Math.min(viewportHeightCss, rect.top + rect.height),
  );

  return {
    found: true,
    cropRectCss: {
      x: Math.round(left),
      y: Math.round(top),
      width: Math.round(right - left),
      height: Math.round(bottom - top),
    },
    viewportWidthCss,
    viewportHeightCss,
    dpr,
    matchedSrc:
      bestImg.currentSrc || bestImg.src || bestImg.getAttribute('src') || null,
  };
}

export interface FullPageScrollPlan {
  originalScrollX: number;
  originalScrollY: number;
  totalWidthCss: number;
  totalHeightCss: number;
  viewportWidthCss: number;
  viewportHeightCss: number;
  dpr: number;
  frameOffsetsY: number[];
  exceededMaxHeight: boolean;
}

/**
 * Pure helper computing vertical scrollY offsets for multi-frame full-page scroll capture,
 * respecting the browser's maximum safe physical canvas height (default 16384 px).
 */
export function computeFullPageFrameOffsets(
  totalHeightCss: number,
  viewportHeightCss: number,
  dpr: number,
  maxPhysicalHeight = 16384,
): {
  frameOffsetsY: number[];
  cappedHeightCss: number;
  exceededMaxHeight: boolean;
} {
  const safeVpH = Math.max(1, Math.round(viewportHeightCss));
  const safeDpr =
    typeof dpr === 'number' && Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  const maxAllowedCssHeight = Math.max(
    safeVpH,
    Math.floor(maxPhysicalHeight / safeDpr),
  );

  const rawTotalH = Math.max(safeVpH, Math.round(totalHeightCss));
  const exceededMaxHeight = rawTotalH > maxAllowedCssHeight;
  const cappedHeightCss = exceededMaxHeight ? maxAllowedCssHeight : rawTotalH;

  if (cappedHeightCss <= safeVpH) {
    return {
      frameOffsetsY: [0],
      cappedHeightCss: safeVpH,
      exceededMaxHeight,
    };
  }

  const offsets: number[] = [];
  let nextY = 0;
  const maxScrollY = cappedHeightCss - safeVpH;

  while (nextY < maxScrollY) {
    offsets.push(nextY);
    nextY += safeVpH;
  }

  if (offsets[offsets.length - 1] !== maxScrollY) {
    offsets.push(maxScrollY);
  }

  return {
    frameOffsetsY: offsets,
    cappedHeightCss,
    exceededMaxHeight,
  };
}

/**
 * Self-contained DOM helper executed inside the active tab before Frame #1 of a Full-Page Scroll Capture.
 * Saves original scroll position, hides scrollbars, and scrolls to (0, 0) while leaving fixed/sticky
 * headers visible for Frame #1.
 */
export function prepareFullPageScrollInDom(
  maxPhysicalHeight = 16384,
): FullPageScrollPlan {
  const viewportWidthCss = Math.max(1, window.innerWidth || 1280);
  const viewportHeightCss = Math.max(1, window.innerHeight || 800);
  const dpr =
    typeof window.devicePixelRatio === 'number' &&
    Number.isFinite(window.devicePixelRatio) &&
    window.devicePixelRatio > 0
      ? window.devicePixelRatio
      : 1;

  const originalScrollX = Math.round(window.scrollX || window.pageXOffset || 0);
  const originalScrollY = Math.round(window.scrollY || window.pageYOffset || 0);

  const docEl = document.documentElement;
  const body = document.body;

  if (docEl) {
    docEl.setAttribute('data-snapmark-orig-scroll-x', String(originalScrollX));
    docEl.setAttribute('data-snapmark-orig-scroll-y', String(originalScrollY));
  }

  // Inject temporary style disabling scrollbars and smooth scroll transitions
  document
    .querySelectorAll('[data-snapmark-scroll-style]')
    .forEach((node) => node.remove());

  const styleEl = document.createElement('style');
  styleEl.setAttribute('data-snapmark-scroll-style', 'true');
  styleEl.textContent = `
    html, body {
      scroll-behavior: auto !important;
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }
    html::-webkit-scrollbar, body::-webkit-scrollbar {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
    }
  `;
  (document.head ?? docEl ?? body)?.appendChild(styleEl);

  const rawTotalHeight = Math.max(
    viewportHeightCss,
    docEl?.scrollHeight ?? 0,
    docEl?.offsetHeight ?? 0,
    body?.scrollHeight ?? 0,
    body?.offsetHeight ?? 0,
  );

  // Compute vertical frame plan directly (inlined so executeScript requires no external closure)
  const safeVpH = Math.max(1, Math.round(viewportHeightCss));
  const maxAllowedCssHeight = Math.max(
    safeVpH,
    Math.floor(maxPhysicalHeight / dpr),
  );
  const rawTotalH = Math.max(safeVpH, Math.round(rawTotalHeight));
  const exceededMaxHeight = rawTotalH > maxAllowedCssHeight;
  const cappedHeightCss = exceededMaxHeight ? maxAllowedCssHeight : rawTotalH;

  const frameOffsetsY: number[] = [];
  if (cappedHeightCss <= safeVpH) {
    frameOffsetsY.push(0);
  } else {
    let nextY = 0;
    const maxScrollY = cappedHeightCss - safeVpH;
    while (nextY < maxScrollY) {
      frameOffsetsY.push(nextY);
      nextY += safeVpH;
    }
    if (frameOffsetsY[frameOffsetsY.length - 1] !== maxScrollY) {
      frameOffsetsY.push(maxScrollY);
    }
  }

  // Scroll to top (0, 0) for Frame #1
  if (typeof window.scrollTo === 'function') {
    window.scrollTo(0, 0);
  }

  return {
    originalScrollX,
    originalScrollY,
    totalWidthCss: viewportWidthCss,
    totalHeightCss: cappedHeightCss,
    viewportWidthCss,
    viewportHeightCss,
    dpr,
    frameOffsetsY,
    exceededMaxHeight,
  };
}

/**
 * Self-contained DOM helper executed after Frame #1 of a Full-Page Scroll Capture.
 * Detects all visible elements with computed position 'fixed' or 'sticky' and hides them
 * with visibility: hidden !important so they do not duplicate on Frames #2..N.
 */
export function hideFixedAndStickyElementsInDom(): number {
  if (typeof document === 'undefined' || !document.body) {
    return 0;
  }

  const allElements = Array.from(
    document.body.querySelectorAll<HTMLElement>('*'),
  );
  let hiddenCount = 0;

  for (const el of allElements) {
    if (el.hasAttribute('data-snapmark-hidden-fixed')) {
      continue;
    }

    const computed = window.getComputedStyle(el);
    const pos = computed.position;
    if (pos !== 'fixed' && pos !== 'sticky') {
      continue;
    }

    if (
      computed.display === 'none' ||
      computed.visibility === 'hidden' ||
      computed.opacity === '0'
    ) {
      continue;
    }

    const origVal = el.style.getPropertyValue('visibility');
    const origPriority = el.style.getPropertyPriority('visibility');

    el.setAttribute('data-snapmark-hidden-fixed', 'true');
    el.setAttribute('data-snapmark-orig-visibility', origVal);
    el.setAttribute('data-snapmark-orig-visibility-priority', origPriority);
    el.style.setProperty('visibility', 'hidden', 'important');
    hiddenCount += 1;
  }

  return hiddenCount;
}

/**
 * Self-contained DOM helper stepping the page scroll position to targetScrollY.
 */
export function stepFullPageScrollInDom(targetScrollY: number): {
  actualScrollY: number;
  viewportWidthCss: number;
  viewportHeightCss: number;
} {
  if (typeof window.scrollTo === 'function') {
    window.scrollTo(0, targetScrollY);
  }

  const actualScrollY = Math.round(
    window.scrollY ||
      window.pageYOffset ||
      document.documentElement?.scrollTop ||
      0,
  );

  return {
    actualScrollY,
    viewportWidthCss: Math.max(1, window.innerWidth || 1280),
    viewportHeightCss: Math.max(1, window.innerHeight || 800),
  };
}

/** Wait for scroll position and paint before a frame is captured. */
export async function settleFullPageScrollInDom(_targetScrollY?: number): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    let frame = 0;
    const timer = setTimeout(() => {
      cancelAnimationFrame(frame);
      reject(new Error('Przekroczono czas oczekiwania na odświeżenie strony.'));
    }, 1500);
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  });
  return Math.round(window.scrollY || window.pageYOffset || document.documentElement?.scrollTop || 0);
}

/**
 * Self-contained DOM cleanup function guaranteed to run in a finally block after Full-Page Scroll Capture.
 * Restores all hidden fixed/sticky elements, removes scrollbar suppression styles, and restores original scrollX/scrollY.
 */
export function restoreFullPageScrollInDom(
  originalScrollX?: number,
  originalScrollY?: number,
): void {
  if (typeof document === 'undefined') {
    return;
  }

  const hiddenElements = document.querySelectorAll<HTMLElement>(
    '[data-snapmark-hidden-fixed]',
  );

  hiddenElements.forEach((el) => {
    const origVal = el.getAttribute('data-snapmark-orig-visibility') ?? '';
    const origPriority =
      el.getAttribute('data-snapmark-orig-visibility-priority') ?? '';

    if (origVal) {
      el.style.setProperty('visibility', origVal, origPriority);
    } else {
      el.style.removeProperty('visibility');
    }

    el.removeAttribute('data-snapmark-hidden-fixed');
    el.removeAttribute('data-snapmark-orig-visibility');
    el.removeAttribute('data-snapmark-orig-visibility-priority');
  });

  const docEl = document.documentElement;
  const fallbackX = Number(
    docEl?.getAttribute('data-snapmark-orig-scroll-x') ?? 0,
  );
  const fallbackY = Number(
    docEl?.getAttribute('data-snapmark-orig-scroll-y') ?? 0,
  );

  docEl?.removeAttribute('data-snapmark-orig-scroll-x');
  docEl?.removeAttribute('data-snapmark-orig-scroll-y');

  const restoreX =
    typeof originalScrollX === 'number' && Number.isFinite(originalScrollX)
      ? originalScrollX
      : Number.isFinite(fallbackX)
        ? fallbackX
        : 0;
  const restoreY =
    typeof originalScrollY === 'number' && Number.isFinite(originalScrollY)
      ? originalScrollY
      : Number.isFinite(fallbackY)
        ? fallbackY
        : 0;

  if (typeof window.scrollTo === 'function') {
    window.scrollTo(restoreX, restoreY);
  }
  document
    .querySelectorAll('[data-snapmark-scroll-style]')
    .forEach((node) => node.remove());
}

export interface AreaSelectionMeasurementResult {
  cancelled: boolean;
  cropRectCss: CssRect | null;
  viewportWidthCss: number;
  viewportHeightCss: number;
  dpr: number;
}

/**
 * Self-contained interactive screen area selection overlay injected via `chrome.scripting.executeScript`.
 * Displays a full-viewport crosshair overlay (`[data-snapmark-area-overlay]`) allowing the user to drag
 * any rectangular region on the webpage (`mousedown` -> `mousemove` -> `mouseup`) or cancel via `Escape`.
 * Guaranteed to remove the overlay from DOM and wait for a browser paint frame before resolving.
 */
export function selectAreaOverlayInDom(): Promise<AreaSelectionMeasurementResult> {
  return new Promise((resolve) => {
    const rawDpr =
      typeof window !== 'undefined' ? window.devicePixelRatio : 1;
    const dpr =
      typeof rawDpr === 'number' && Number.isFinite(rawDpr) && rawDpr > 0
        ? rawDpr
        : 1;
    const viewportWidthCss = Math.max(
      1,
      (typeof window !== 'undefined' ? window.innerWidth : 0) ||
        (typeof document !== 'undefined' && document.documentElement
          ? document.documentElement.clientWidth
          : 0) ||
        1280,
    );
    const viewportHeightCss = Math.max(
      1,
      (typeof window !== 'undefined' ? window.innerHeight : 0) ||
        (typeof document !== 'undefined' && document.documentElement
          ? document.documentElement.clientHeight
          : 0) ||
        800,
    );

    if (
      typeof window === 'undefined' ||
      typeof document === 'undefined' ||
      !document.body
    ) {
      resolve({
        cancelled: true,
        cropRectCss: null,
        viewportWidthCss,
        viewportHeightCss,
        dpr,
      });
      return;
    }

    // Remove any pre-existing area overlay
    document
      .querySelectorAll('[data-snapmark-area-overlay]')
      .forEach((node) => node.remove());

    const clampX = (x: number): number =>
      Math.max(0, Math.min(viewportWidthCss, x));
    const clampY = (y: number): number =>
      Math.max(0, Math.min(viewportHeightCss, y));

    const overlay = document.createElement('div');
    overlay.setAttribute('data-snapmark-area-overlay', 'true');
    overlay.style.cssText = [
      'position: fixed !important',
      'inset: 0 !important',
      'top: 0 !important',
      'left: 0 !important',
      'width: 100vw !important',
      'height: 100vh !important',
      'z-index: 2147483647 !important',
      'cursor: crosshair !important',
      'user-select: none !important',
      '-webkit-user-select: none !important',
      'background: rgba(15, 17, 21, 0.35) !important',
      'margin: 0 !important',
      'padding: 0 !important',
      'box-sizing: border-box !important',
    ].join('; ');

    const hintPill = document.createElement('div');
    hintPill.setAttribute('data-snapmark-area-hint', 'true');
    hintPill.textContent =
      'Przeciągnij myszą, aby zaznaczyć fragment ekranu • Esc anuluje';
    hintPill.style.cssText = [
      'position: fixed !important',
      'top: 16px !important',
      'left: 50% !important',
      'transform: translateX(-50%) !important',
      'padding: 8px 14px !important',
      'background: rgba(15, 17, 21, 0.92) !important',
      'color: #F3F4F6 !important',
      'border: 1px solid rgba(255, 255, 255, 0.16) !important',
      'border-radius: 9999px !important',
      'font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif !important',
      'font-size: 12px !important',
      'font-weight: 600 !important',
      'line-height: 1.3 !important',
      'box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45) !important',
      'pointer-events: none !important',
      'white-space: nowrap !important',
    ].join('; ');

    const selectionBox = document.createElement('div');
    selectionBox.setAttribute('data-snapmark-area-box', 'true');
    selectionBox.style.cssText = [
      'display: none !important',
      'position: fixed !important',
      'border: 2px solid #FF3B30 !important',
      'background: transparent !important',
      'box-shadow: 0 0 0 9999px rgba(15, 17, 21, 0.48) !important',
      'pointer-events: none !important',
      'box-sizing: border-box !important',
    ].join('; ');

    const dimensionsBadge = document.createElement('div');
    dimensionsBadge.setAttribute('data-snapmark-area-dimensions', 'true');
    dimensionsBadge.style.cssText = [
      'position: absolute !important',
      'right: 0 !important',
      'bottom: -26px !important',
      'padding: 2px 8px !important',
      'background: #FF3B30 !important',
      'color: #FFFFFF !important',
      'border-radius: 4px !important',
      'font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important',
      'font-size: 11px !important',
      'font-weight: 600 !important',
      'line-height: 1.4 !important',
      'white-space: nowrap !important',
      'pointer-events: none !important',
    ].join('; ');

    selectionBox.appendChild(dimensionsBadge);
    overlay.appendChild(hintPill);
    overlay.appendChild(selectionBox);

    let isDragging = false;
    let settled = false;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;

    function updateBoxVisual(): void {
      const left = Math.round(Math.min(startX, currentX));
      const top = Math.round(Math.min(startY, currentY));
      const width = Math.round(Math.abs(currentX - startX));
      const height = Math.round(Math.abs(currentY - startY));

      selectionBox.style.setProperty('display', 'block', 'important');
      selectionBox.style.setProperty('left', `${left}px`, 'important');
      selectionBox.style.setProperty('top', `${top}px`, 'important');
      selectionBox.style.setProperty('width', `${width}px`, 'important');
      selectionBox.style.setProperty('height', `${height}px`, 'important');
      dimensionsBadge.textContent = `${width} × ${height} px`;
    }

    function cleanup(): void {
      window.removeEventListener('mousemove', onMouseMove, true);
      window.removeEventListener('mouseup', onMouseUp, true);
      window.removeEventListener('keydown', onKeyDown, true);
      overlay.removeEventListener('mousedown', onMouseDown, true);
      overlay.remove();
      document
        .querySelectorAll('[data-snapmark-area-overlay]')
        .forEach((node) => node.remove());
    }

    function finish(result: AreaSelectionMeasurementResult): void {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(result);
    }

    function onMouseDown(event: MouseEvent): void {
      if (event.button !== 0 || settled) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      isDragging = true;
      startX = clampX(event.clientX);
      startY = clampY(event.clientY);
      currentX = startX;
      currentY = startY;
      overlay.style.setProperty('background', 'transparent', 'important');
      updateBoxVisual();
    }

    function onMouseMove(event: MouseEvent): void {
      if (!isDragging || settled) {
        return;
      }
      event.preventDefault();
      currentX = clampX(event.clientX);
      currentY = clampY(event.clientY);
      updateBoxVisual();
    }

    function onMouseUp(event: MouseEvent): void {
      if (!isDragging || settled) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      isDragging = false;
      currentX = clampX(event.clientX);
      currentY = clampY(event.clientY);

      const x = Math.round(Math.min(startX, currentX));
      const y = Math.round(Math.min(startY, currentY));
      const width = Math.round(Math.abs(currentX - startX));
      const height = Math.round(Math.abs(currentY - startY));

      if (width < 8 || height < 8) {
        finish({
          cancelled: true,
          cropRectCss: null,
          viewportWidthCss,
          viewportHeightCss,
          dpr,
        });
        return;
      }

      settled = true;
      cleanup();

      const payload: AreaSelectionMeasurementResult = {
        cancelled: false,
        cropRectCss: { x, y, width, height },
        viewportWidthCss,
        viewportHeightCss,
        dpr,
      };

      const isJsdom =
        typeof navigator !== 'undefined' &&
        /jsdom/i.test(navigator.userAgent ?? '');

      if (!isJsdom && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => {
          setTimeout(() => resolve(payload), 16);
        });
      } else {
        resolve(payload);
      }
    }

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape' && !settled) {
        event.preventDefault();
        event.stopPropagation();
        finish({
          cancelled: true,
          cropRectCss: null,
          viewportWidthCss,
          viewportHeightCss,
          dpr,
        });
      }
    }

    overlay.addEventListener('mousedown', onMouseDown, true);
    window.addEventListener('mousemove', onMouseMove, true);
    window.addEventListener('mouseup', onMouseUp, true);
    window.addEventListener('keydown', onKeyDown, true);

    document.body.appendChild(overlay);
  });
}
