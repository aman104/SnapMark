import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { drawPenAnnotation } from '../../src/editor/canvas-stage';
import { initEditor } from '../../src/editor/index';
import { DEFAULT_LINE_STROKE_WIDTH, DEFAULT_USER_SETTINGS } from '../../src/shared/constants';
import type { LineAnnotation, PenAnnotation, TextAnnotation } from '../../src/shared/types';

describe('Task 040: M08 polish — stable canvas, pen endpoint handles, icon-only toolbar, defaults, clean Undo, English UI', () => {
  it('preserves #editor-canvas DOM node across drawing without rebuilding stage (eliminates zoom jump) and reserves stable scrollbar gutter', () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/editor.css'), 'utf-8');
    expect(css).toContain('scrollbar-gutter: stable');

    const container = document.createElement('div');
    const controller = initEditor(container, { initialSearch: '?mode=viewport' });
    const canvasBefore = container.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    expect(canvasBefore).not.toBeNull();

    // Draw an arrow
    canvasBefore.dispatchEvent(new MouseEvent('mousedown', { clientX: 40, clientY: 40, button: 0 }));
    canvasBefore.dispatchEvent(new MouseEvent('mousemove', { clientX: 180, clientY: 90 }));
    canvasBefore.dispatchEvent(new MouseEvent('mouseup', { clientX: 180, clientY: 90 }));
    expect(container.querySelector('#editor-canvas')).toBe(canvasBefore);

    // Place a step badge
    controller.setTool('step');
    const canvasForStep = container.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    canvasForStep.dispatchEvent(new MouseEvent('mousedown', { clientX: 220, clientY: 120, button: 0 }));
    expect(container.querySelector('#editor-canvas')).toBe(canvasForStep);
  });

  it('draws start and end endpoint handles for a selected PenAnnotation without a dashed bounding box', () => {
    const arcCalls: Array<[number, number, number]> = [];
    const setLineDashCalls: number[][] = [];
    const strokeRectCalls: unknown[] = [];
    const fakeCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      strokeRect: vi.fn((...args: unknown[]) => {
        strokeRectCalls.push(args);
      }),
      arc: vi.fn((x: number, y: number, r: number) => {
        arcCalls.push([x, y, r]);
      }),
      setLineDash: vi.fn((pattern: number[]) => {
        setLineDashCalls.push(pattern);
      }),
    } as unknown as CanvasRenderingContext2D;

    const pen: PenAnnotation = {
      id: 'pen_test',
      type: 'pen',
      points: [
        { x: 20, y: 30 },
        { x: 60, y: 55 },
        { x: 110, y: 95 },
      ],
      color: '#FF3B30',
      strokeWidth: 8,
    };

    drawPenAnnotation(fakeCtx, pen, true);

    // No dashed bounding rectangle
    expect(setLineDashCalls).toHaveLength(0);
    expect(strokeRectCalls).toHaveLength(0);
    // Start (20, 30) and end (110, 95) endpoint handles drawn with arc
    expect(arcCalls.some(([x, y]) => x === 20 && y === 30)).toBe(true);
    expect(arcCalls.some(([x, y]) => x === 110 && y === 95)).toBe(true);
  });

  it('renders icon-only tool buttons with accessible English labels and clean Undo button without Ctrl+Z or count', () => {
    const container = document.createElement('div');
    initEditor(container, { initialSearch: '?mode=viewport' });

    const toolIds = ['#tool-arrow', '#tool-line', '#tool-text', '#tool-step', '#tool-pen', '#tool-crop'];
    for (const id of toolIds) {
      const btn = container.querySelector<HTMLButtonElement>(id);
      expect(btn).not.toBeNull();
      expect(btn?.querySelector('svg')).not.toBeNull();
      expect(btn?.querySelector('span')).toBeNull();
      expect(btn?.querySelector('kbd')).toBeNull();
      expect(btn?.textContent?.trim()).toBe('');
      expect(btn?.getAttribute('aria-label')?.length).toBeGreaterThan(0);
    }

    const undoBtn = container.querySelector<HTMLButtonElement>('#btn-undo');
    expect(undoBtn).not.toBeNull();
    expect(undoBtn?.querySelector('kbd')).toBeNull();
    expect(container.querySelector('#undo-count')).toBeNull();
    expect(undoBtn?.textContent?.trim()).toBe('Undo');
  });

  it('defaults Line tool to Medium (4px) and Text tool to Plain, while Arrow & Pen remain Thick (8px)', () => {
    expect(DEFAULT_LINE_STROKE_WIDTH).toBe(4);
    expect(DEFAULT_USER_SETTINGS.strokeWidth).toBe(8);
    expect(DEFAULT_USER_SETTINGS.textStyleMode).toBe('plain');

    const container = document.createElement('div');
    const controller = initEditor(container, { initialSearch: '?mode=viewport' });
    expect(controller.getState().strokeWidth).toBe(8);
    expect(controller.getState().lineStrokeWidth).toBe(4);
    expect(controller.getState().textStyleMode).toBe('plain');

    // Switch to Line -> Underline and draw
    controller.setTool('line');
    controller.setLineSubtype('underline');
    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 50, clientY: 50, button: 0 }));
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 50 }));
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: 200, clientY: 50 }));

    const lines = controller.getState().annotations.filter((a): a is LineAnnotation => a.type === 'line');
    const newestLine = lines[lines.length - 1];
    expect(newestLine?.subtype).toBe('underline');
    expect(newestLine?.strokeWidth).toBe(4);

    // Switch to Text and commit a new text annotation
    controller.setTool('text');
    const canvas2 = container.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    canvas2.dispatchEvent(new MouseEvent('mousedown', { clientX: 60, clientY: 80, button: 0 }));
    const input = container.querySelector<HTMLTextAreaElement>('#active-text-input')!;
    input.value = 'Plain default';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    const texts = controller.getState().annotations.filter((a): a is TextAnnotation => a.type === 'text');
    const newestText = texts[texts.length - 1];
    expect(newestText?.styleMode).toBe('plain');
  });
});
