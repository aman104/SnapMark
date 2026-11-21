import type {
  AnnotationItem,
  ArrowAnnotation,
  LineAnnotation,
  TextAnnotation,
} from '../shared/types';

export type EndpointHandleRole = 'start' | 'end';

export interface Point2D {
  x: number;
  y: number;
}

export const DEFAULT_HANDLE_HIT_RADIUS_CSS = 10;

/**
 * Enforces a horizontal axis lock (`y2 = y1`) when `shiftKey` is held down.
 */
export function applyShiftHorizontalLock(
  start: Point2D,
  current: Point2D,
  shiftKey: boolean,
): Point2D {
  if (shiftKey) {
    return {
      x: current.x,
      y: start.y,
    };
  }
  return {
    x: current.x,
    y: current.y,
  };
}

/**
 * Checks whether a CSS coordinate `(cssX, cssY)` hits either the `'end'` `(x2, y2)`
 * or `'start'` `(x1, y1)` draggable endpoint handle of a selected arrow or line annotation.
 * Prioritizes `'end'` (arrowhead tip) when both handles overlap.
 */
export function hitTestEndpointHandle(
  item: AnnotationItem | null | undefined,
  cssX: number,
  cssY: number,
  handleRadiusCss: number = DEFAULT_HANDLE_HIT_RADIUS_CSS,
): EndpointHandleRole | null {
  if (!item || (item.type !== 'arrow' && item.type !== 'line')) {
    return null;
  }

  const distToEnd = Math.hypot(cssX - item.x2, cssY - item.y2);
  if (distToEnd <= handleRadiusCss) {
    return 'end';
  }

  const distToStart = Math.hypot(cssX - item.x1, cssY - item.y1);
  if (distToStart <= handleRadiusCss) {
    return 'start';
  }

  return null;
}

/**
 * Computes approximate CSS bounding box dimensions for a `TextAnnotation`.
 */
export function getTextAnnotationBounds(item: TextAnnotation): {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
} {
  const lines = item.text.split('\n');
  const longestLineLength = lines.reduce(
    (max, line) => Math.max(max, line.length),
    0,
  );
  const approxWidth =
    Math.max(60, longestLineLength * (item.fontSize * 0.58)) + 24;
  const approxHeight = Math.max(1, lines.length) * (item.fontSize * 1.35) + 16;

  return {
    left: item.x - 12,
    top: item.y - 8,
    right: item.x - 12 + approxWidth,
    bottom: item.y - 8 + approxHeight,
    width: approxWidth,
    height: approxHeight,
  };
}

/**
 * Hit-tests the annotations array from top-most (`length - 1`) to bottom-most (`0`).
 */
export function hitTestAnnotationBody(
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
              Math.min(
                1,
                ((cssX - item.x1) * dx + (cssY - item.y1) * dy) / lenSq,
              ),
            );
      const projX = item.x1 + t * dx;
      const projY = item.y1 + t * dy;
      const dist = Math.hypot(cssX - projX, cssY - projY);
      const threshold = Math.max(10, item.strokeWidth / 2 + 6);
      if (dist <= threshold) {
        return item;
      }
    } else if (item.type === 'text') {
      const bounds = getTextAnnotationBounds(item);
      if (
        cssX >= bounds.left &&
        cssX <= bounds.right &&
        cssY >= bounds.top &&
        cssY <= bounds.bottom
      ) {
        return item;
      }
    }
  }
  return null;
}

/**
 * Updates either the `'start'` `(x1, y1)` or `'end'` `(x2, y2)` endpoint of an arrow or line,
 * optionally locking the moved endpoint horizontally relative to the anchor endpoint when `shiftKey` is true.
 */
export function updateAnnotationEndpoint<
  T extends ArrowAnnotation | LineAnnotation,
>(
  item: T,
  handle: EndpointHandleRole,
  target: Point2D,
  shiftKey = false,
): T {
  if (handle === 'end') {
    const locked = applyShiftHorizontalLock(
      { x: item.x1, y: item.y1 },
      target,
      shiftKey,
    );
    return {
      ...item,
      x2: locked.x,
      y2: locked.y,
    };
  }

  const locked = applyShiftHorizontalLock(
    { x: item.x2, y: item.y2 },
    target,
    shiftKey,
  );
  return {
    ...item,
    x1: locked.x,
    y1: locked.y,
  };
}

/**
 * Translates an annotation by `(dx, dy)` in CSS pixel coordinates.
 */
export function moveAnnotationByDelta<T extends AnnotationItem>(
  item: T,
  dx: number,
  dy: number,
): T {
  if (item.type === 'arrow' || item.type === 'line') {
    return {
      ...item,
      x1: item.x1 + dx,
      y1: item.y1 + dy,
      x2: item.x2 + dx,
      y2: item.y2 + dy,
    };
  }
  return {
    ...item,
    x: item.x + dx,
    y: item.y + dy,
  };
}
