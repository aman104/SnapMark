import { renderMockScreenshotBackdrop } from '../shared/mock-captures';
import type {
  AnnotationItem,
  ArrowAnnotation,
  LineAnnotation,
  MockCaptureMetadata,
  TextAnnotation,
} from '../shared/types';

function createFallback2DContext(): CanvasRenderingContext2D {
  const noop = (): void => {};
  const fallback = {
    save: noop,
    restore: noop,
    scale: noop,
    clearRect: noop,
    fillRect: noop,
    strokeRect: noop,
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

function drawArrowAnnotation(
  ctx: CanvasRenderingContext2D,
  item: ArrowAnnotation,
  isSelected: boolean,
): void {
  const { x1, y1, x2, y2, color, strokeWidth } = item;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLength = Math.max(12, strokeWidth * 3.5);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Main shaft
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Proportional filled arrowhead
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLength * Math.cos(angle - Math.PI / 6),
    y2 - headLength * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    x2 - headLength * Math.cos(angle + Math.PI / 6),
    y2 - headLength * Math.sin(angle + Math.PI / 6),
  );
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

export function hitTestAnnotations(
  annotations: AnnotationItem[],
  cssX: number,
  cssY: number,
): AnnotationItem | null {
  for (let i = annotations.length - 1; i >= 0; i -= 1) {
    const item = annotations[i];
    if (!item) continue;

    if (item.type === 'arrow' || item.type === 'line') {
      const dx = item.x2 - item.x1;
      const dy = item.y2 - item.y1;
      const lenSq = dx * dx + dy * dy;
      const t =
        lenSq === 0
          ? 0
          : Math.max(
              0,
              Math.min(1, ((cssX - item.x1) * dx + (cssY - item.y1) * dy) / lenSq),
            );
      const projX = item.x1 + t * dx;
      const projY = item.y1 + t * dy;
      const dist = Math.hypot(cssX - projX, cssY - projY);
      const threshold = Math.max(10, item.strokeWidth / 2 + 6);
      if (dist <= threshold) {
        return item;
      }
    } else if (item.type === 'text') {
      const approxWidth = Math.max(80, item.text.length * (item.fontSize * 0.55)) + 24;
      const approxHeight = item.fontSize * 1.4 + 16;
      if (
        cssX >= item.x - 12 &&
        cssX <= item.x + approxWidth &&
        cssY >= item.y - 8 &&
        cssY <= item.y + approxHeight
      ) {
        return item;
      }
    }
  }
  return null;
}

export function renderCanvasStage(
  canvas: HTMLCanvasElement,
  metadata: MockCaptureMetadata,
  annotations: AnnotationItem[],
  selectedId: string | null,
): void {
  const physicalWidth = Math.round(metadata.cssWidth * metadata.dpr);
  const physicalHeight = Math.round(metadata.cssHeight * metadata.dpr);

  canvas.width = physicalWidth;
  canvas.height = physicalHeight;
  canvas.style.width = `${metadata.cssWidth}px`;
  canvas.style.height = `${metadata.cssHeight}px`;
  canvas.style.borderRadius = '0px';

  const ctx = get2DContext(canvas);
  ctx.clearRect(0, 0, physicalWidth, physicalHeight);

  // Base screenshot bitmap
  renderMockScreenshotBackdrop(
    ctx,
    metadata.cssWidth,
    metadata.cssHeight,
    metadata.dpr,
    metadata.mode,
    metadata.highlightApplied,
  );

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
    }
  }

  ctx.restore();
}
