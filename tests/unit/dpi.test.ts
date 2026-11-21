import { describe, expect, it } from 'vitest';
import {
  clampRectWithPaddingToViewport,
  computePhysicalCropRect,
  multiplyRectByDpr,
  normalizeDpr,
} from '../../src/shared/dpi';

describe('Task 007: DPI crop math and viewport boundary clamping', () => {
  it('normalizes invalid or non-positive devicePixelRatio values to 1', () => {
    expect(normalizeDpr(2)).toBe(2);
    expect(normalizeDpr(1.25)).toBe(1.25);
    expect(normalizeDpr(0)).toBe(1);
    expect(normalizeDpr(-2)).toBe(1);
    expect(normalizeDpr(Number.NaN)).toBe(1);
    expect(normalizeDpr(undefined)).toBe(1);
  });

  it('adds 20px safety margin and clamps coordinates to viewport boundaries', () => {
    // Centered rect with plenty of room
    const padded = clampRectWithPaddingToViewport(
      { x: 100, y: 200, width: 300, height: 80 },
      1440,
      900,
      20,
    );
    expect(padded).toEqual({ x: 80, y: 180, width: 340, height: 120 });

    // Near top-left corner (< 20px from edge) and near bottom-right corner
    const edgeClamped = clampRectWithPaddingToViewport(
      { x: 8, y: 12, width: 1430, height: 885 },
      1440,
      900,
      20,
    );
    expect(edgeClamped).toEqual({ x: 0, y: 0, width: 1440, height: 900 });
  });

  it('multiplies CSS rectangles by devicePixelRatio (1x, 1.25x, 1.5x, 2x, 3x)', () => {
    const cssRect = { x: 80, y: 180, width: 340, height: 120 };

    expect(multiplyRectByDpr(cssRect, 1)).toEqual({
      x: 80,
      y: 180,
      width: 340,
      height: 120,
    });
    expect(multiplyRectByDpr(cssRect, 1.25)).toEqual({
      x: 100,
      y: 225,
      width: 425,
      height: 150,
    });
    expect(multiplyRectByDpr(cssRect, 1.5)).toEqual({
      x: 120,
      y: 270,
      width: 510,
      height: 180,
    });
    expect(multiplyRectByDpr(cssRect, 2)).toEqual({
      x: 160,
      y: 360,
      width: 680,
      height: 240,
    });
    expect(multiplyRectByDpr(cssRect, 3)).toEqual({
      x: 240,
      y: 540,
      width: 1020,
      height: 360,
    });
  });

  it('computes combined clamped + DPR physical crop rectangle', () => {
    const physical = computePhysicalCropRect(
      { x: 100, y: 200, width: 300, height: 80 },
      1440,
      900,
      2,
      20,
    );
    expect(physical).toEqual({ x: 160, y: 360, width: 680, height: 240 });
  });
});
