import { describe, expect, it } from 'vitest';
import { initEditor } from '../../src/editor/index';
import type { PenAnnotation, StepAnnotation } from '../../src/shared/types';

describe('Task 037: Numbered Step Badges (1, 2, 3...) and Freehand Pen Drawing (FR-12, FR-13)', () => {
  it('places auto-incrementing numbered step circles (1, 2, 3) in active background color, supports moving, recoloring, and Ctrl+Z undo', () => {
    const container = document.createElement('div');
    const controller = initEditor(container, { initialSearch: '?mode=viewport' });
    const initialCount = controller.getState().annotations.length;

    // Activate Step tool via button or key "4"
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '4' }));
    expect(controller.getState().activeTool).toBe('step');
    expect(
      container.querySelector('#tool-step')?.classList.contains('is-active'),
    ).toBe(true);

    controller.setColor('#007AFF');

    // Place step 1 at (80, 90)
    container
      .querySelector<HTMLCanvasElement>('#editor-canvas')!
      .dispatchEvent(
        new MouseEvent('mousedown', { clientX: 80, clientY: 90, button: 0 }),
      );
    // First click on empty canvas deselects step 1 without adding step 2
    container
      .querySelector<HTMLCanvasElement>('#editor-canvas')!
      .dispatchEvent(
        new MouseEvent('mousedown', { clientX: 150, clientY: 100, button: 0 }),
      );
    expect(controller.getState().selectedAnnotationId).toBeNull();
    // Next click places step 2 at (200, 120)
    container
      .querySelector<HTMLCanvasElement>('#editor-canvas')!
      .dispatchEvent(
        new MouseEvent('mousedown', { clientX: 200, clientY: 120, button: 0 }),
      );
    // Deselect step 2, then place step 3 at (320, 160)
    container
      .querySelector<HTMLCanvasElement>('#editor-canvas')!
      .dispatchEvent(
        new MouseEvent('mousedown', { clientX: 260, clientY: 140, button: 0 }),
      );
    container
      .querySelector<HTMLCanvasElement>('#editor-canvas')!
      .dispatchEvent(
        new MouseEvent('mousedown', { clientX: 320, clientY: 160, button: 0 }),
      );

    const steps = controller
      .getState()
      .annotations.filter((a): a is StepAnnotation => a.type === 'step');
    expect(steps).toHaveLength(3);
    expect(steps.map((s) => s.stepNumber)).toEqual([1, 2, 3]);
    expect(steps[0]?.color).toBe('#007AFF');

    // Drag step 3 from (320, 160) to (370, 210)
    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    canvas.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 320, clientY: 160, button: 0 }),
    );
    canvas.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 370, clientY: 210 }),
    );
    canvas.dispatchEvent(
      new MouseEvent('mouseup', { clientX: 370, clientY: 210 }),
    );

    const movedStep3 = controller
      .getState()
      .annotations.find((a): a is StepAnnotation => a.type === 'step' && a.stepNumber === 3)!;
    expect(movedStep3.x).toBe(370);
    expect(movedStep3.y).toBe(210);

    // Recolor selected step 3 to yellow #FFCC00
    controller.setColor('#FFCC00');
    const recolored = controller
      .getState()
      .annotations.find((a): a is StepAnnotation => a.type === 'step' && a.stepNumber === 3)!;
    expect(recolored.color).toBe('#FFCC00');

    // Undo restores color, then position, then removes step 3
    controller.undo();
    controller.undo();
    controller.undo();
    expect(controller.getState().annotations).toHaveLength(initialCount + 2);
  });

  it('draws a freehand Pen stroke with default thick 8px width, supports dragging, recoloring, thickness change, and Ctrl+Z undo', () => {
    const container = document.createElement('div');
    const controller = initEditor(container, { initialSearch: '?mode=viewport' });
    const initialCount = controller.getState().annotations.length;

    // Activate Pen tool via key "5"
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '5' }));
    expect(controller.getState().activeTool).toBe('pen');
    expect(container.querySelector('#stroke-width-picker')).not.toBeNull();

    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    canvas.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 40, clientY: 420, button: 0 }),
    );
    canvas.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 70, clientY: 435 }),
    );
    canvas.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 110, clientY: 425 }),
    );
    canvas.dispatchEvent(
      new MouseEvent('mouseup', { clientX: 110, clientY: 425 }),
    );

    const pens = controller
      .getState()
      .annotations.filter((a): a is PenAnnotation => a.type === 'pen');
    expect(pens).toHaveLength(1);
    expect(pens[0]?.strokeWidth).toBe(8);
    expect(pens[0]?.color).toBe('#FF3B30');
    expect(pens[0]?.points.length).toBeGreaterThanOrEqual(3);

    // Change thickness to 4px and color to #34C759
    controller.setStrokeWidth(4);
    controller.setColor('#34C759');
    const updatedPen = controller
      .getState()
      .annotations.find((a): a is PenAnnotation => a.type === 'pen')!;
    expect(updatedPen.strokeWidth).toBe(4);
    expect(updatedPen.color).toBe('#34C759');

    // Undo color, undo thickness, undo pen creation
    controller.undo();
    controller.undo();
    controller.undo();
    expect(controller.getState().annotations).toHaveLength(initialCount);
  });
});
