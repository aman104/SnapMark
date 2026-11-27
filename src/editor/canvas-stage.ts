import { multiplyRectByDpr, normalizeDpr } from '../shared/dpi';
import { renderMockScreenshotBackdrop } from '../shared/mock-captures';
import type {
  AnnotationItem,
  ArrowAnnotation,
  CaptureSession,
  LineAnnotation,
  MockCaptureMetadata,
  PenAnnotation,
  StepAnnotation,
  TextAnnotation,
} from '../shared/types';
import { getArrowheadDimensions, hitTestAnnotationBody } from './vector-engine';

export interface FramePlacementPlan {
  frameIndex: number;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

/**
 * Computes physical pixel source (sx, sy, sw, sh) and destination (dx, dy, dw, dh) rectangles
 * for cropping Selection / Image captures (multiplying cropRectCss by devicePixelRatio)
 * or seamlessly stitching multi-frame Full-Page Scroll captures onto the composite canvas.
 */
export function buildSessionCompositePlacements(
  session: CaptureSession,
): FramePlacementPlan[] {
  const dpr = normalizeDpr(session.dpr);
  if (session.frames.length === 0) {
    return [];
  }

  // Selection or Image element capture: crop the single frame using cropRectCss * dpr
  if (
    (session.mode === 'selection' || session.mode === 'image') &&
    session.cropRectCss
  ) {
    const physicalCrop = multiplyRectByDpr(session.cropRectCss, dpr);
    return [
      {
        frameIndex: 0,
        sx: physicalCrop.x,
        sy: physicalCrop.y,
        sw: physicalCrop.width,
        sh: physicalCrop.height,
        dx: 0,
        dy: 0,
        dw: physicalCrop.width,
        dh: physicalCrop.height,
      },
    ];
  }

  // Single-frame Viewport capture
  if (session.frames.length === 1) {
    const first = session.frames[0];
    if (!first) return [];
    const pw = Math.max(1, Math.round(first.viewportWidthCss * dpr));
    const ph = Math.max(1, Math.round(first.viewportHeightCss * dpr));
    return [
      {
        frameIndex: 0,
        sx: 0,
        sy: 0,
        sw: pw,
        sh: ph,
        dx: 0,
        dy: 0,
        dw: pw,
        dh: ph,
      },
    ];
  }

  // Multi-frame Full-Page Scroll capture: stitch frames without seam duplication on partial final steps
  const placements: FramePlacementPlan[] = [];
  let coveredBottomCss = 0;

  for (let i = 0; i < session.frames.length; i += 1) {
    const frame = session.frames[i];
    if (!frame) continue;

    const frameTopCss = frame.scrollYCss;
    const frameBottomCss = frameTopCss + frame.viewportHeightCss;
    const pw = Math.max(1, Math.round(frame.viewportWidthCss * dpr));

    if (i === 0 || frameTopCss >= coveredBottomCss) {
      const ph = Math.max(1, Math.round(frame.viewportHeightCss * dpr));
      const dy = Math.round(frameTopCss * dpr);
      placements.push({
        frameIndex: i,
        sx: 0,
        sy: 0,
        sw: pw,
        sh: ph,
        dx: 0,
        dy,
        dw: pw,
        dh: ph,
      });
      coveredBottomCss = Math.max(coveredBottomCss, frameBottomCss);
    } else if (frameBottomCss > coveredBottomCss) {
      // Partial scroll step (e.g. final frame): slice only the newly exposed bottom region
      const overlapCss = coveredBottomCss - frameTopCss;
      const newSliceHeightCss = frame.viewportHeightCss - overlapCss;
      const sy = Math.round(overlapCss * dpr);
      const sh = Math.max(1, Math.round(newSliceHeightCss * dpr));
      const dy = Math.round(coveredBottomCss * dpr);
      placements.push({
        frameIndex: i,
        sx: 0,
        sy,
        sw: pw,
        sh,
        dx: 0,
        dy,
        dw: pw,
        dh: sh,
      });
      coveredBottomCss = frameBottomCss;
    }
  }

  return placements;
}

function createFallback2DContext(): CanvasRenderingContext2D {
  const noop = (): void => {};
  const fallback = {
    save: noop,
    restore: noop,
    scale: noop,
    clearRect: noop,
    fillRect: noop,
    strokeRect: noop,
    drawImage: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    fill: noop,
    stroke: noop,
    fillText: noop,
    strokeText: noop,
    setLineDash: noop,
    measureText: (text: string) => ({ width: text.length * 10 }),
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    lineCap: 'round',
    lineJoin: 'round',
    globalAlpha: 1,
    font: '16px sans-serif',
    textBaseline: 'top',
  };
  return fallback as unknown as CanvasRenderingContext2D;
}

export function get2DContext(
  canvas: HTMLCanvasElement,
): CanvasRenderingContext2D {
  if (
    typeof navigator !== 'undefined' &&
    /jsdom/i.test(navigator.userAgent ?? '')
  ) {
    return createFallback2DContext();
  }
  try {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      return ctx;
    }
  } catch {
    // Fallback when 2D context is unavailable
  }
  return createFallback2DContext();
}

function drawEndpointHandle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#3B82F6';
  ctx.stroke();
  ctx.restore();
}

export function drawArrowAnnotation(
  ctx: CanvasRenderingContext2D,
  item: ArrowAnnotation,
  isSelected: boolean,
): void {
  const { x1, y1, x2, y2, color, strokeWidth } = item;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const length = Math.hypot(x2 - x1, y2 - y1);
  const { length: headLength, halfWidth } = getArrowheadDimensions(length, strokeWidth);
  const baseX = x2 - headLength * Math.cos(angle);
  const baseY = y2 - headLength * Math.sin(angle);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Main shaft
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(baseX, baseY);
  ctx.stroke();

  // Proportional filled arrowhead
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(baseX - halfWidth * Math.sin(angle), baseY + halfWidth * Math.cos(angle));
  ctx.lineTo(baseX + halfWidth * Math.sin(angle), baseY - halfWidth * Math.cos(angle));
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  if (isSelected) {
    drawEndpointHandle(ctx, x1, y1);
    drawEndpointHandle(ctx, x2, y2);
  }
}

function drawLineAnnotation(
  ctx: CanvasRenderingContext2D,
  item: LineAnnotation,
  isSelected: boolean,
): void {
  ctx.save();
  ctx.strokeStyle = item.color;
  ctx.lineWidth = item.strokeWidth;
  ctx.globalAlpha = item.subtype === 'highlighter' ? item.alpha : 1.0;
  ctx.lineCap = item.subtype === 'highlighter' ? 'butt' : 'round';

  ctx.beginPath();
  ctx.moveTo(item.x1, item.y1);
  ctx.lineTo(item.x2, item.y2);
  ctx.stroke();
  ctx.restore();

  if (isSelected) {
    drawEndpointHandle(ctx, item.x1, item.y1);
    drawEndpointHandle(ctx, item.x2, item.y2);
  }
}

function drawTextAnnotation(
  ctx: CanvasRenderingContext2D,
  item: TextAnnotation,
  isSelected: boolean,
): void {
  ctx.save();
  ctx.font = `600 ${item.fontSize}px -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif`;
  ctx.textBaseline = 'top';

  const metrics = ctx.measureText(item.text);
  const textWidth = Math.max(40, metrics.width);
  const textHeight = item.fontSize * 1.25;
  const padX = 10;
  const padY = 6;

  if (item.styleMode === 'background') {
    const isLightColor = item.color === '#FFFFFF' || item.color === '#FFCC00';
    ctx.fillStyle = isLightColor
      ? 'rgba(28, 28, 30, 0.92)'
      : 'rgba(24, 26, 33, 0.92)';
    ctx.fillRect(
      item.x - padX,
      item.y - padY,
      textWidth + padX * 2,
      textHeight + padY * 2,
    );
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(
      item.x - padX,
      item.y - padY,
      textWidth + padX * 2,
      textHeight + padY * 2,
    );
  } else if (item.styleMode === 'outline') {
    const outlineColor = item.color === '#FFFFFF' ? '#1C1C1E' : '#FFFFFF';
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.strokeText(item.text, item.x, item.y);
  }

  ctx.fillStyle = item.color;
  ctx.fillText(item.text, item.x, item.y);

  if (isSelected) {
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(
      item.x - padX - 3,
      item.y - padY - 3,
      textWidth + (padX + 3) * 2,
      textHeight + (padY + 3) * 2,
    );
  }

  ctx.restore();
}

export function drawStepAnnotation(
  ctx: CanvasRenderingContext2D,
  item: StepAnnotation,
  isSelected: boolean,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
  ctx.fillStyle = item.color;
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = item.color === '#FFFFFF' ? '#1C1C1E' : '#FFFFFF';
  ctx.stroke();

  const isLightFill = item.color === '#FFFFFF' || item.color === '#FFCC00';
  ctx.fillStyle = isLightFill ? '#1C1C1E' : '#FFFFFF';
  ctx.font = `700 ${Math.round(item.radius * 1.05)}px -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(item.stepNumber), item.x, item.y + 0.5);

  if (isSelected) {
    ctx.beginPath();
    ctx.arc(item.x, item.y, item.radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawPenAnnotation(
  ctx: CanvasRenderingContext2D,
  item: PenAnnotation,
  isSelected: boolean,
): void {
  if (item.points.length === 0) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = item.color;
  ctx.fillStyle = item.color;
  ctx.lineWidth = item.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const first = item.points[0]!;
  if (item.points.length === 1) {
    ctx.beginPath();
    ctx.arc(first.x, first.y, item.strokeWidth / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < item.points.length; i += 1) {
      const pt = item.points[i]!;
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
  }

  if (isSelected) {
    let minX = first.x;
    let maxX = first.x;
    let minY = first.y;
    let maxY = first.y;
    for (const pt of item.points) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }
    const pad = Math.max(6, item.strokeWidth / 2 + 4);
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(
      minX - pad,
      minY - pad,
      Math.max(12, maxX - minX + pad * 2),
      Math.max(12, maxY - minY + pad * 2),
    );
  }

  ctx.restore();
}

export function hitTestAnnotations(
  annotations: AnnotationItem[],
  cssX: number,
  cssY: number,
): AnnotationItem | null {
  return hitTestAnnotationBody(annotations, cssX, cssY);
}

export async function decodeBlobToDrawable(
  blob: Blob,
  fallbackPhysicalWidth = 1280,
  fallbackPhysicalHeight = 800,
): Promise<{
  drawable: CanvasImageSource | null;
  physicalWidth: number;
  physicalHeight: number;
}> {
  if (
    typeof navigator !== 'undefined' &&
    /jsdom/i.test(navigator.userAgent ?? '')
  ) {
    return {
      drawable: null,
      physicalWidth: fallbackPhysicalWidth,
      physicalHeight: fallbackPhysicalHeight,
    };
  }

  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob);
      return {
        drawable: bitmap,
        physicalWidth: bitmap.width || fallbackPhysicalWidth,
        physicalHeight: bitmap.height || fallbackPhysicalHeight,
      };
    } catch {
      // Fallback to HTMLImageElement decoding
    }
  }

  if (
    typeof URL !== 'undefined' &&
    typeof URL.createObjectURL === 'function' &&
    typeof Image !== 'undefined'
  ) {
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () =>
          reject(new Error('Failed to decode Blob into HTMLImageElement'));
        element.src = objectUrl;
      });
      return {
        drawable: img,
        physicalWidth: img.naturalWidth || fallbackPhysicalWidth,
        physicalHeight: img.naturalHeight || fallbackPhysicalHeight,
      };
    } catch {
      return {
        drawable: null,
        physicalWidth: fallbackPhysicalWidth,
        physicalHeight: fallbackPhysicalHeight,
      };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  return {
    drawable: null,
    physicalWidth: fallbackPhysicalWidth,
    physicalHeight: fallbackPhysicalHeight,
  };
}

export interface PlacedFrameDrawable {
  drawable: CanvasImageSource | null;
  placement: FramePlacementPlan;
}

/**
 * Computes a fit-to-width display scale (`<= 1`) so wide screenshots fit inside
 * `.editor-stage` without horizontal scrollbars while keeping full physical DPI backing store.
 */
export function computeFitToWidthScale(
  cssWidth: number,
  availableWidth: number,
): number {
  if (
    !Number.isFinite(cssWidth) ||
    cssWidth <= 0 ||
    !Number.isFinite(availableWidth) ||
    availableWidth <= 0
  ) {
    return 1;
  }
  return Math.min(1, availableWidth / cssWidth);
}

export function renderCanvasStage(
  canvas: HTMLCanvasElement,
  metadata: MockCaptureMetadata,
  annotations: AnnotationItem[],
  selectedId: string | null,
  baseImage: CanvasImageSource | null = null,
  placedFrames: PlacedFrameDrawable[] = [],
  displayScale = 1,
): void {
  const physicalWidth = Math.round(metadata.cssWidth * metadata.dpr);
  const physicalHeight = Math.round(metadata.cssHeight * metadata.dpr);
  const safeScale =
    Number.isFinite(displayScale) && displayScale > 0 ? displayScale : 1;

  canvas.width = physicalWidth;
  canvas.height = physicalHeight;
  canvas.style.width = `${Math.round(metadata.cssWidth * safeScale)}px`;
  canvas.style.height = `${Math.round(metadata.cssHeight * safeScale)}px`;
  canvas.style.borderRadius = '0px';

  const ctx = get2DContext(canvas);
  ctx.clearRect(0, 0, physicalWidth, physicalHeight);

  const hasValidPlacedDrawables = placedFrames.some(
    (pf) => pf.drawable !== null,
  );

  if (hasValidPlacedDrawables) {
    for (const pf of placedFrames) {
      if (!pf.drawable) continue;
      const p = pf.placement;
      ctx.drawImage(
        pf.drawable,
        p.sx,
        p.sy,
        p.sw,
        p.sh,
        p.dx,
        p.dy,
        p.dw,
        p.dh,
      );
    }
  } else if (baseImage) {
    ctx.drawImage(baseImage, 0, 0, physicalWidth, physicalHeight);
  } else {
    // Base screenshot bitmap fallback (prototype / JSDOM test environments)
    renderMockScreenshotBackdrop(
      ctx,
      metadata.cssWidth,
      metadata.cssHeight,
      metadata.dpr,
      metadata.mode,
      metadata.highlightApplied,
    );
  }

  // Vector overlay pass scaled by devicePixelRatio
  ctx.save();
  ctx.scale(metadata.dpr, metadata.dpr);

  for (const item of annotations) {
    const isSelected = item.id === selectedId;
    if (item.type === 'arrow') {
      drawArrowAnnotation(ctx, item, isSelected);
    } else if (item.type === 'line') {
      drawLineAnnotation(ctx, item, isSelected);
    } else if (item.type === 'text') {
      drawTextAnnotation(ctx, item, isSelected);
    } else if (item.type === 'step') {
      drawStepAnnotation(ctx, item, isSelected);
    } else if (item.type === 'pen') {
      drawPenAnnotation(ctx, item, isSelected);
    }
  }

  ctx.restore();
}
