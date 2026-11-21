import { describe, expect, it } from 'vitest';
import { UndoHistoryStack } from '../../src/editor/history';
import {
  applyShiftHorizontalLock,
  hitTestAnnotationBody,
  hitTestEndpointHandle,
  moveAnnotationByDelta,
  updateAnnotationEndpoint,
} from '../../src/editor/vector-engine';
import type {
  AnnotationItem,
  ArrowAnnotation,
  LineAnnotation,
  TextAnnotation,
} from '../../src/shared/types';

describe('Vector Engine Geometry, Hit-Testing, Shift Lock & UndoHistoryStack (Task 019)', () => {
  const sampleArrow: ArrowAnnotation = {
    id: 'arr_1',
    type: 'arrow',
    x1: 100,
    y1: 120,
    x2: 300,
    y2: 220,
    color: '#FF3B30',
    strokeWidth: 4,
  };

  const sampleLine: LineAnnotation = {
    id: 'line_1',
    type: 'line',
    subtype: 'highlighter',
    x1: 150,
    y1: 350,
    x2: 450,
    y2: 350,
    color: '#FFCC00',
    strokeWidth: 24,
    alpha: 0.35,
  };

  const sampleText: TextAnnotation = {
    id: 'txt_1',
    type: 'text',
    x: 200,
    y: 420,
    text: 'Sprawdź kontrast i wyrównanie',
    color: '#FFFFFF',
    fontSize: 20,
    styleMode: 'background',
  };

  it('enforces horizontal axis lock (y2 = y1) when shiftKey is true', () => {
    expect(
      applyShiftHorizontalLock({ x: 100, y: 150 }, { x: 340, y: 195 }, false),
    ).toEqual({ x: 340, y: 195 });

    expect(
      applyShiftHorizontalLock({ x: 100, y: 150 }, { x: 340, y: 195 }, true),
    ).toEqual({ x: 340, y: 150 });
  });

  it('detects start (x1, y1) and end (x2, y2) endpoint handles within radius for arrows and lines', () => {
    expect(hitTestEndpointHandle(sampleArrow, 103, 118)).toBe('start');
    expect(hitTestEndpointHandle(sampleArrow, 296, 224)).toBe('end');
    expect(hitTestEndpointHandle(sampleArrow, 200, 170)).toBeNull();
    expect(hitTestEndpointHandle(sampleText, 200, 420)).toBeNull();
  });

  it('hit-tests arrow shaft, highlighter stroke, and text bounding box in top-down z-order', () => {
    const items: AnnotationItem[] = [sampleArrow, sampleLine, sampleText];

    // Midpoint of sampleArrow (200, 170)
    expect(hitTestAnnotationBody(items, 200, 170)?.id).toBe('arr_1');

    // Midpoint of sampleLine (300, 350)
    expect(hitTestAnnotationBody(items, 300, 355)?.id).toBe('line_1');

    // Inside sampleText bounding box
    expect(hitTestAnnotationBody(items, 230, 430)?.id).toBe('txt_1');

    // Far away point
    expect(hitTestAnnotationBody(items, 20, 20)).toBeNull();
  });

  it('updates arrow or line endpoints with optional Shift horizontal lock and translates items by delta', () => {
    const movedTip = updateAnnotationEndpoint(
      sampleArrow,
      'end',
      { x: 420, y: 260 },
      false,
    );
    expect(movedTip.x2).toBe(420);
    expect(movedTip.y2).toBe(260);
    expect(movedTip.x1).toBe(100);
    expect(movedTip.y1).toBe(120);

    const shiftLockedTip = updateAnnotationEndpoint(
      sampleArrow,
      'end',
      { x: 420, y: 260 },
      true,
    );
    expect(shiftLockedTip.x2).toBe(420);
    expect(shiftLockedTip.y2).toBe(120);

    const movedTail = updateAnnotationEndpoint(
      sampleArrow,
      'start',
      { x: 50, y: 90 },
      true,
    );
    expect(movedTail.x1).toBe(50);
    expect(movedTail.y1).toBe(220);

    const translatedArrow = moveAnnotationByDelta(sampleArrow, 25, -15);
    expect(translatedArrow).toEqual({
      ...sampleArrow,
      x1: 125,
      y1: 105,
      x2: 325,
      y2: 205,
    });

    const translatedText = moveAnnotationByDelta(sampleText, -30, 40);
    expect(translatedText.x).toBe(170);
    expect(translatedText.y).toBe(460);
  });

  it('manages immutable multi-step undo history snapshots in UndoHistoryStack', () => {
    const history = new UndoHistoryStack();
    expect(history.canUndo()).toBe(false);
    expect(history.size()).toBe(0);

    const state0: AnnotationItem[] = [];
    const state1: AnnotationItem[] = [sampleArrow];
    const state2: AnnotationItem[] = [sampleArrow, sampleLine];

    history.pushSnapshot(state0);
    history.pushSnapshot(state1);
    expect(history.canUndo()).toBe(true);
    expect(history.size()).toBe(2);

    // Mutating original array does not corrupt stored snapshot
    state1[0] = { ...sampleArrow, x2: 999 };

    const restored1 = history.undo();
    expect(restored1).toHaveLength(1);
    expect((restored1?.[0] as ArrowAnnotation).x2).toBe(300);

    const restored0 = history.undo();
    expect(restored0).toEqual([]);
    expect(history.canUndo()).toBe(false);
    expect(history.undo()).toBeNull();
    expect(state2).toHaveLength(2);
  });
});
