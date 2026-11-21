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
