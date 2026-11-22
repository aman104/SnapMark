import { SELECTION_PADDING_PX } from './constants';
import type { CssRect } from './types';

export function normalizeDpr(dpr: number | undefined | null): number {
  if (typeof dpr !== 'number' || !Number.isFinite(dpr) || dpr <= 0) {
    return 1;
  }
  return dpr;
}

export function clampRectWithPaddingToViewport(
  rect: CssRect,
  viewportWidth: number,
  viewportHeight: number,
  paddingPx: number = SELECTION_PADDING_PX,
): CssRect {
  const safePad =
    typeof paddingPx === 'number' && Number.isFinite(paddingPx) && paddingPx >= 0
      ? paddingPx
      : SELECTION_PADDING_PX;

  const vpW = Math.max(1, viewportWidth);
  const vpH = Math.max(1, viewportHeight);

  const left = Math.max(0, Math.min(vpW - 1, rect.x - safePad));
  const top = Math.max(0, Math.min(vpH - 1, rect.y - safePad));
  const right = Math.max(left + 1, Math.min(vpW, rect.x + rect.width + safePad));
  const bottom = Math.max(
    top + 1,
    Math.min(vpH, rect.y + rect.height + safePad),
  );

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

export function multiplyRectByDpr(rect: CssRect, dpr: number): CssRect {
  const safeDpr = normalizeDpr(dpr);
  return {
    x: Math.round(rect.x * safeDpr),
    y: Math.round(rect.y * safeDpr),
    width: Math.max(1, Math.round(rect.width * safeDpr)),
    height: Math.max(1, Math.round(rect.height * safeDpr)),
  };
}

export function computePhysicalCropRect(
  rect: CssRect,
  viewportWidth: number,
  viewportHeight: number,
  dpr: number,
  paddingPx: number = SELECTION_PADDING_PX,
): CssRect {
  const clampedCssRect = clampRectWithPaddingToViewport(
    rect,
    viewportWidth,
    viewportHeight,
    paddingPx,
  );
  return multiplyRectByDpr(clampedCssRect, dpr);
}
