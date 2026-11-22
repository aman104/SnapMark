import { describe, expect, it, vi } from 'vitest';
import { initEditor } from '../../src/editor/index';
import { drawArrowAnnotation } from '../../src/editor/canvas-stage';
import type { ArrowAnnotation, LineAnnotation } from '../../src/shared/types';

describe('Interactive Arrow and 2-in-1 Line/Highlighter Canvas Drawing & Handle Dragging (Task 020)', () => {
  it.each([[10, 110], [110, 10], [10, 18]])('draws a connected arrowhead ending at its tip (%s → %s)', (x1, x2) => {
    const ctx = { save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), closePath: vi.fn(), fill: vi.fn() } as unknown as CanvasRenderingContext2D;
    drawArrowAnnotation(ctx, { id: 'arrow', type: 'arrow', x1, y1: 50, x2, y2: 50, color: '#FF3B30', strokeWidth: 4 }, false);
    const moves = vi.mocked(ctx.moveTo).mock.calls;
    const lines = vi.mocked(ctx.lineTo).mock.calls;
    expect(moves[1]).toEqual([x2, 50]);
    expect(lines[1][0]).toBeCloseTo(lines[0][0]);
    expect(lines[2][0]).toBeCloseTo(lines[0][0]);
    expect((lines[1][1] - 50) * (lines[2][1] - 50)).toBeLessThan(0);
    expect(Math.abs(lines[0][0] - x1)).toBeLessThanOrEqual(Math.abs(x2 - x1));
    expect(ctx.fill).toHaveBeenCalledOnce();
  });
  it('deselects an existing arrow on an empty click without adding an annotation, and can select it again', () => {
    const container = document.createElement('div');
    const controller = initEditor(container, { initialSearch: '?mode=viewport' });
    const arrow = controller.getState().annotations[0] as ArrowAnnotation;
    const count = controller.getState().annotations.length;
    let canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10, button: 0 }));
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: 10, clientY: 10, button: 0 }));
    expect(controller.getState().selectedAnnotationId).toBeNull();
    expect(controller.getState().annotations).toHaveLength(count);
    canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: (arrow.x1 + arrow.x2) / 2, clientY: (arrow.y1 + arrow.y2) / 2, button: 0 }));
    expect(controller.getState().selectedAnnotationId).toBe(arrow.id);
  });

  it('deselects a selected line with an empty click and still draws on drag', () => {
    const container = document.createElement('div');
    const controller = initEditor(container, { initialSearch: '?mode=viewport' });
    controller.setTool('line');
    let canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 60, clientY: 500, button: 0 }));
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 350, clientY: 500 }));
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: 350, clientY: 500, button: 0 }));
    expect(controller.getState().selectedAnnotationId).not.toBeNull();
    const count = controller.getState().annotations.length;
    canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10, button: 0 }));
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: 10, clientY: 10, button: 0 }));
    expect(controller.getState().selectedAnnotationId).toBeNull();
    expect(controller.getState().annotations).toHaveLength(count);
  });
  it('draws a new vector Arrow (#FF3B30) via mouse drag and drags its arrowhead endpoint handle (x2, y2) after drawing', () => {
    const container = document.createElement('div');
    const controller = initEditor(container, { initialSearch: '?mode=viewport' });

    const initialCount = controller.getState().annotations.length;
    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas')!;

    // Draw a new arrow in empty space from (50, 80) to (220, 140)
    canvas.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 50, clientY: 80, button: 0 }),
    );
    canvas.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 220, clientY: 140 }),
    );
    canvas.dispatchEvent(
      new MouseEvent('mouseup', { clientX: 220, clientY: 140 }),
    );

    const afterDraw = controller.getState().annotations;
    expect(afterDraw).toHaveLength(initialCount + 1);
    const drawnArrow = afterDraw[afterDraw.length - 1] as ArrowAnnotation;
    expect(drawnArrow.type).toBe('arrow');
    expect(drawnArrow.color).toBe('#FF3B30');
    expect(drawnArrow.strokeWidth).toBe(4);
    expect(drawnArrow.x1).toBe(50);
    expect(drawnArrow.y1).toBe(80);
    expect(drawnArrow.x2).toBe(220);
    expect(drawnArrow.y2).toBe(140);
    expect(controller.getState().selectedAnnotationId).toBe(drawnArrow.id);

    // Grab the arrowhead handle at (220, 140) and drag it to (280, 190)
    const canvasAfterDraw =
      container.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    canvasAfterDraw.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 220, clientY: 140, button: 0 }),
    );
    canvasAfterDraw.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 280, clientY: 190 }),
    );
    canvasAfterDraw.dispatchEvent(
      new MouseEvent('mouseup', { clientX: 280, clientY: 190 }),
    );

    const afterHandleDrag = controller.getState().annotations[
      afterDraw.length - 1
    ] as ArrowAnnotation;
    expect(afterHandleDrag.x1).toBe(50);
    expect(afterHandleDrag.y1).toBe(80);
    expect(afterHandleDrag.x2).toBe(280);
    expect(afterHandleDrag.y2).toBe(190);

    // Undo restores the arrow tip back to (220, 140)
    controller.undo();
    const afterUndoHandle = controller.getState().annotations[
      afterDraw.length - 1
    ] as ArrowAnnotation;
    expect(afterUndoHandle.x2).toBe(220);
    expect(afterUndoHandle.y2).toBe(140);

    // Second undo removes the drawn arrow completely
    controller.undo();
    expect(controller.getState().annotations).toHaveLength(initialCount);
  });

  it('draws a 2-in-1 Highlighter and Underline with Shift horizontal axis lock (y2 = y1)', () => {
    const container = document.createElement('div');
    const controller = initEditor(container, { initialSearch: '?mode=viewport' });

    controller.setTool('line');
    controller.setLineSubtype('highlighter');
    controller.setColor('#FFCC00');

    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    canvas.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 60, clientY: 500, button: 0 }),
    );
    canvas.dispatchEvent(
      new MouseEvent('mousemove', {
        clientX: 380,
        clientY: 535,
        shiftKey: true,
      }),
    );
    canvas.dispatchEvent(
      new MouseEvent('mouseup', {
        clientX: 380,
        clientY: 535,
        shiftKey: true,
      }),
    );

    const items = controller.getState().annotations;
    const highlighter = items[items.length - 1] as LineAnnotation;
    expect(highlighter.type).toBe('line');
    expect(highlighter.subtype).toBe('highlighter');
    expect(highlighter.alpha).toBe(0.35);
    expect(highlighter.strokeWidth).toBe(24);
    expect(highlighter.color).toBe('#FFCC00');
    expect(highlighter.x1).toBe(60);
    expect(highlighter.y1).toBe(500);
    expect(highlighter.x2).toBe(380);
    // Shift horizontal lock enforced y2 === y1 (500) despite clientY=535
    expect(highlighter.y2).toBe(500);
  });

  it('drags the body of an existing annotation to reposition it and supports Ctrl+Z undo', () => {
    const container = document.createElement('div');
    const controller = initEditor(container, { initialSearch: '?mode=viewport' });

    const firstArrow = controller.getState().annotations[0] as ArrowAnnotation;
    const midX = (firstArrow.x1 + firstArrow.x2) / 2;
    const midY = (firstArrow.y1 + firstArrow.y2) / 2;

    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    canvas.dispatchEvent(
      new MouseEvent('mousedown', { clientX: midX, clientY: midY, button: 0 }),
    );
    canvas.dispatchEvent(
      new MouseEvent('mousemove', {
        clientX: midX + 40,
        clientY: midY - 25,
      }),
    );
    canvas.dispatchEvent(
      new MouseEvent('mouseup', {
        clientX: midX + 40,
        clientY: midY - 25,
      }),
    );

    const movedArrow = controller.getState().annotations[0] as ArrowAnnotation;
    expect(movedArrow.x1).toBe(firstArrow.x1 + 40);
    expect(movedArrow.y1).toBe(firstArrow.y1 - 25);
    expect(movedArrow.x2).toBe(firstArrow.x2 + 40);
    expect(movedArrow.y2).toBe(firstArrow.y2 - 25);

    controller.undo();
    const restoredArrow = controller.getState().annotations[0] as ArrowAnnotation;
    expect(restoredArrow.x1).toBe(firstArrow.x1);
    expect(restoredArrow.y1).toBe(firstArrow.y1);
  });
});
