import { describe, expect, it } from 'vitest';
import { initEditor } from '../../src/editor/index';
import type { TextAnnotation } from '../../src/shared/types';

describe('Interactive In-Canvas Textarea Overlay, Double-Click Editing, Dragging & Readability Modes (Task 021)', () => {
  it('prevents canvas mousedown from stealing focus from the new text input', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const controller = initEditor(container, { initialSearch: '?mode=viewport' });
    controller.setTool('text');
    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    const down = new MouseEvent('mousedown', { clientX: 120, clientY: 85, button: 0, bubbles: true, cancelable: true });
    canvas.dispatchEvent(down);
    const input = container.querySelector<HTMLTextAreaElement>('#active-text-input')!;
    expect(down.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(input);
    input.value = 'Pierwszy znak';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(controller.getState().annotations.some((item) => item.type === 'text' && item.text === 'Pierwszy znak')).toBe(true);
    container.remove();
  });
  it('spawns #active-text-input on canvas click with Text tool, commits on Enter, and cancels on Escape', () => {
    const container = document.createElement('div');
    const controller = initEditor(container, { initialSearch: '?mode=viewport' });

    const initialCount = controller.getState().annotations.length;

    // Switch to Text tool (3) and select Outline mode ("Obrys")
    controller.setTool('text');
    controller.setTextStyleMode('outline');
    controller.setColor('#34C759');

    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    canvas.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 120, clientY: 85, button: 0 }),
    );

    const textarea = container.querySelector<HTMLTextAreaElement>(
      '#active-text-input',
    );
    expect(textarea).not.toBeNull();
    expect(textarea?.getAttribute('data-style-mode')).toBe('outline');
    expect(textarea?.style.left).toBe('120px');
    expect(textarea?.style.top).toBe('85px');

    // Type text and commit via Enter
    textarea!.value = 'Błąd walidacji formularza';
    textarea!.dispatchEvent(new Event('input'));
    textarea!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false }),
    );

    expect(container.querySelector('#active-text-input')).toBeNull();
    const afterCommit = controller.getState().annotations;
    expect(afterCommit).toHaveLength(initialCount + 1);
    const createdText = afterCommit[afterCommit.length - 1] as TextAnnotation;
    expect(createdText.type).toBe('text');
    expect(createdText.text).toBe('Błąd walidacji formularza');
    expect(createdText.x).toBe(120);
    expect(createdText.y).toBe(85);
    expect(createdText.color).toBe('#34C759');
    expect(createdText.styleMode).toBe('outline');

    // Spawn another text draft and cancel with Escape
    const canvas2 =
      container.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    canvas2.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 50, clientY: 50, button: 0 }),
    );
    const textarea2 = container.querySelector<HTMLTextAreaElement>(
      '#active-text-input',
    );
    expect(textarea2).not.toBeNull();
    textarea2!.value = 'Anulowany wpis';
    textarea2!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape' }),
    );

    expect(container.querySelector('#active-text-input')).toBeNull();
    expect(controller.getState().annotations).toHaveLength(initialCount + 1);
  });

  it('edits an existing TextAnnotation on double-click (dblclick), drags it across the canvas, and switches readability modes', () => {
    const container = document.createElement('div');
    const controller = initEditor(container, { initialSearch: '?mode=viewport' });

    const existingText = controller
      .getState()
      .annotations.find((a) => a.type === 'text') as TextAnnotation;
    expect(existingText).toBeDefined();

    // Double-click the existing text annotation at (existingText.x + 10, existingText.y + 10)
    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    canvas.dispatchEvent(
      new MouseEvent('dblclick', {
        clientX: existingText.x + 10,
        clientY: existingText.y + 10,
      }),
    );

    const textarea = container.querySelector<HTMLTextAreaElement>(
      '#active-text-input',
    );
    expect(textarea).not.toBeNull();
    expect(textarea?.value).toBe(existingText.text);

    textarea!.value = 'Zaktualizowany komentarz QA';
    textarea!.dispatchEvent(new Event('input'));
    textarea!.dispatchEvent(new Event('blur'));

    const updatedText = controller
      .getState()
      .annotations.find((a) => a.id === existingText.id) as TextAnnotation;
    expect(updatedText.text).toBe('Zaktualizowany komentarz QA');

    // Switch readability mode from 'background' to 'plain' and then 'outline'
    controller.selectAnnotation(existingText.id);
    controller.setTextStyleMode('plain');
    expect(
      (
        controller
          .getState()
          .annotations.find((a) => a.id === existingText.id) as TextAnnotation
      ).styleMode,
    ).toBe('plain');

    // Drag the text annotation by (+30, +20)
    const canvasAfterEdit =
      container.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    canvasAfterEdit.dispatchEvent(
      new MouseEvent('mousedown', {
        clientX: existingText.x + 10,
        clientY: existingText.y + 10,
        button: 0,
      }),
    );
    canvasAfterEdit.dispatchEvent(
      new MouseEvent('mousemove', {
        clientX: existingText.x + 40,
        clientY: existingText.y + 30,
      }),
    );
    canvasAfterEdit.dispatchEvent(
      new MouseEvent('mouseup', {
        clientX: existingText.x + 40,
        clientY: existingText.y + 30,
      }),
    );

    const draggedText = controller
      .getState()
      .annotations.find((a) => a.id === existingText.id) as TextAnnotation;
    expect(draggedText.x).toBe(existingText.x + 30);
    expect(draggedText.y).toBe(existingText.y + 20);

    // Undo restores previous position
    controller.undo();
    const afterUndoMove = controller
      .getState()
      .annotations.find((a) => a.id === existingText.id) as TextAnnotation;
    expect(afterUndoMove.x).toBe(existingText.x);
    expect(afterUndoMove.y).toBe(existingText.y);
  });
});
