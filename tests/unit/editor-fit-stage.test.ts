import { describe, expect, it, vi } from 'vitest';
import { computeFitToWidthScale } from '../../src/editor/canvas-stage';
import { initEditor } from '../../src/editor/index';
import type { ArrowAnnotation } from '../../src/shared/types';

describe('Task 036: Fit-to-width editor stage without horizontal scroll (FR-10)', () => {
  it('computes fit-to-width displayScale <= 1 when screenshot is wider than available stage width', () => {
    expect(computeFitToWidthScale(1440, 1000)).toBeCloseTo(1000 / 1440, 4);
    expect(computeFitToWidthScale(680, 1000)).toBe(1);
    expect(computeFitToWidthScale(1440, 0)).toBe(1);
  });

  it('scales canvas CSS display width to fit stage while preserving full physical Retina dimensions and pointer mapping', () => {
    const container = document.createElement('div');
    const controller = initEditor(container, { initialSearch: '?mode=viewport' });
    // viewport mock is 960x580 CSS @2x -> 1920x1160 physical
    const stage = container.querySelector<HTMLElement>('#editor-stage')!;
    Object.defineProperty(stage, 'clientWidth', {
      value: 504, // 504 - 24 = 480px available -> 0.5x scale of 960px
      configurable: true,
    });

    window.dispatchEvent(new Event('resize'));

    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    expect(canvas.width).toBe(1920);
    expect(canvas.height).toBe(1160);
    expect(canvas.style.width).toBe('480px');
    expect(canvas.style.height).toBe('290px');

    // Mock getBoundingClientRect() matching the 0.5x scaled display box (480x290)
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 12,
      top: 68,
      width: 480,
      height: 290,
      right: 492,
      bottom: 358,
      x: 12,
      y: 68,
      toJSON: () => ({}),
    });

    const beforeCount = controller.getState().annotations.length;
    // Draw at display coordinates (12 + 50, 68 + 40) -> logical (100, 80) to (12 + 150, 68 + 90) -> logical (300, 180)
    canvas.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 62, clientY: 108, button: 0 }),
    );
    canvas.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 162, clientY: 158 }),
    );
    canvas.dispatchEvent(
      new MouseEvent('mouseup', { clientX: 162, clientY: 158 }),
    );

    const after = controller.getState().annotations;
    expect(after).toHaveLength(beforeCount + 1);
    const arrow = after[after.length - 1] as ArrowAnnotation;
    expect(arrow.x1).toBeCloseTo(100, 1);
    expect(arrow.y1).toBeCloseTo(80, 1);
    expect(arrow.x2).toBeCloseTo(300, 1);
    expect(arrow.y2).toBeCloseTo(180, 1);
  });
});
