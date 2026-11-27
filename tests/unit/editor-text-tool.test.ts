import { describe, expect, it, vi } from 'vitest';
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

  it('keeps the canvas mounted through two clicks so an existing text can be edited', () => {
    const container = document.createElement('div');
    const controller = initEditor(container, { initialSearch: '?mode=viewport' });
    const text = controller.getState().annotations.find((item) => item.type === 'text') as TextAnnotation;
    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    const event = { clientX: text.x + 10, clientY: text.y + 10, button: 0, bubbles: true };
    for (let detail = 1; detail <= 2; detail++) {
      canvas.dispatchEvent(new MouseEvent('mousedown', { ...event, detail }));
      canvas.dispatchEvent(new MouseEvent('mouseup', { ...event, detail }));
      canvas.dispatchEvent(new MouseEvent('click', { ...event, detail }));
      expect(container.querySelector('#editor-canvas')).toBe(canvas);
    }
    canvas.dispatchEvent(new MouseEvent('dblclick', { ...event, detail: 2 }));
    expect(container.querySelector<HTMLTextAreaElement>('#active-text-input')?.value).toBe(text.text);
  });

  it('commits text without removing a toolbar button before its click and refreshes history afterward', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let downloads = 0;
    const controller = initEditor(container, { initialSearch: '?mode=viewport', onDownloadPng: () => { downloads++; } });
    controller.setTool('text');
    container.querySelector<HTMLCanvasElement>('#editor-canvas')!.dispatchEvent(new MouseEvent('mousedown', { clientX: 120, clientY: 85, button: 0, cancelable: true }));
    const input = container.querySelector<HTMLTextAreaElement>('#active-text-input')!;
    input.value = 'Tekst przed pobraniem';
    input.dispatchEvent(new Event('input'));
    const button = container.querySelector<HTMLButtonElement>('#btn-download-png')!;
    const historyBefore = controller.getState().historyStack.length;
    button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    button.focus();
    expect(container.querySelector('#btn-download-png')).toBe(button);
    button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }));
    button.click();
    expect(downloads).toBe(1);
    expect(controller.getState().annotations.some((item) => item.type === 'text' && item.text === 'Tekst przed pobraniem')).toBe(true);
    await vi.waitFor(() => expect(controller.getState().historyStack.length).toBe(historyBefore + 1));
    expect(container.querySelector<HTMLButtonElement>('#btn-undo')?.disabled).toBe(false);
    expect(document.activeElement?.id).toBe('btn-download-png');
    container.remove();
  });

  it('does not replace a held toolbar button when selection refresh is pending', () => {
    vi.useFakeTimers();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const controller = initEditor(container, { initialSearch: '?mode=viewport' });
    const text = controller.getState().annotations.find((item) => item.type === 'text') as TextAnnotation;
    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: text.x + 10, clientY: text.y + 10, button: 0, bubbles: true }));
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: text.x + 10, clientY: text.y + 10, button: 0, bubbles: true }));
    const button = container.querySelector<HTMLButtonElement>('#tool-arrow')!;
    button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    vi.advanceTimersByTime(700);
    expect(container.querySelector('#tool-arrow')).toBe(button);
    button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }));
    button.click();
    expect(controller.getState().activeTool).toBe('arrow');
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    container.remove();
  });

  it('keeps the selection refresh after right-click or a double-click outside text', () => {
    vi.useFakeTimers();
    const container = document.createElement('div');
    const controller = initEditor(container, { initialSearch: '?mode=viewport' });
    const text = controller.getState().annotations.find((item) => item.type === 'text') as TextAnnotation;
    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: text.x + 10, clientY: text.y + 10, button: 0 }));
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: text.x + 10, clientY: text.y + 10, button: 0 }));
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10, button: 2 }));
    canvas.dispatchEvent(new MouseEvent('dblclick', { clientX: 10, clientY: 10, button: 0 }));
    vi.advanceTimersByTime(600);
    expect(container.querySelector('#tool-text')?.classList.contains('is-active')).toBe(true);
    vi.useRealTimers();
  });

  it('preserves a focused toolbar action when selecting text updates the toolbar', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const controller = initEditor(container, { initialSearch: '?mode=viewport' });
    const text = controller.getState().annotations.find((item) => item.type === 'text') as TextAnnotation;
    container.querySelector<HTMLButtonElement>('#btn-download-png')!.focus();
    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: text.x + 10, clientY: text.y + 10, button: 0 }));
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: text.x + 10, clientY: text.y + 10, button: 0 }));
    expect(container.querySelector('#editor-canvas')).toBe(canvas);
    expect(document.activeElement?.id).toBe('btn-download-png');
    expect(container.querySelector('#tool-text')?.classList.contains('is-active')).toBe(true);
    container.remove();
  });

  it('updates toolbar state and retains keyboard focus when Tab leaves the text input', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const controller = initEditor(container, { initialSearch: '?mode=viewport' });
    controller.setTool('text');
    container.querySelector<HTMLCanvasElement>('#editor-canvas')!.dispatchEvent(new MouseEvent('mousedown', { clientX: 120, clientY: 85, button: 0, cancelable: true }));
    const input = container.querySelector<HTMLTextAreaElement>('#active-text-input')!;
    input.value = 'Tekst z klawiatury';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const historyBefore = controller.getState().historyStack.length;
    container.querySelector<HTMLButtonElement>('#btn-download-png')!.focus();
    await Promise.resolve();
    expect(controller.getState().historyStack.length).toBe(historyBefore + 1);
    expect(container.querySelector<HTMLButtonElement>('#btn-undo')?.disabled).toBe(false);
    expect(document.activeElement?.id).toBe('btn-download-png');
    expect(controller.getState().annotations.some((item) => item.type === 'text' && item.text === 'Tekst z klawiatury')).toBe(true);
    container.remove();
  });

  it.each([
    ['tool', '#tool-arrow'],
    ['color', '[data-color="#34C759"]'],
  ])('retains focus on a %s control after committing text and activating it', (_kind, selector) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const controller = initEditor(container, { initialSearch: '?mode=viewport' });
    controller.setTool('text');
    container.querySelector<HTMLCanvasElement>('#editor-canvas')!.dispatchEvent(new MouseEvent('mousedown', { clientX: 120, clientY: 85, button: 0, cancelable: true }));
    const input = container.querySelector<HTMLTextAreaElement>('#active-text-input')!;
    input.value = 'Adnotacja';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const button = container.querySelector<HTMLButtonElement>(selector)!;
    button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    button.focus();
    button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }));
    button.click();
    expect(document.activeElement).toBe(container.querySelector(selector));
    expect(controller.getState().annotations.some((item) => item.type === 'text' && item.text === 'Adnotacja')).toBe(true);
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

    // Click empty area to deselect committed text, then click again to spawn another text draft and cancel with Escape
    const canvas2 =
      container.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    canvas2.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 50, clientY: 50, button: 0 }),
    );
    expect(controller.getState().selectedAnnotationId).toBeNull();
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
