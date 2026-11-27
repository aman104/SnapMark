import { describe, expect, it } from 'vitest';
import { createFlattenedExportCanvas } from '../../src/editor/exporter';
import { initEditor } from '../../src/editor/index';
import type { ArrowAnnotation } from '../../src/shared/types';

describe('Task 038: Interactive Crop Tool with Annotation Shifting, HiDPI Export & Ctrl+Z Undo (FR-11)', () => {
  it('crops the screenshot, shifts existing annotations by (-cropX, -cropY), exports cropped HiDPI dimensions, and restores everything on Ctrl+Z', () => {
    const container = document.createElement('div');
    const controller = initEditor(container, { initialSearch: '?mode=viewport' });
    // viewport mock is 960x580 @2x
    const origArrow = { ...(controller.getState().annotations[0] as ArrowAnnotation) };

    // Activate Crop tool via key "c"
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' }));
    expect(controller.getState().activeTool).toBe('crop');
    expect(container.querySelector('#btn-apply-crop')?.hasAttribute('disabled')).toBe(true);

    // Drag crop rectangle (100, 80) -> (500, 380) => 400x300 CSS px
    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    canvas.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 100, clientY: 80, button: 0 }),
    );
    canvas.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 500, clientY: 380 }),
    );
    canvas.dispatchEvent(
      new MouseEvent('mouseup', { clientX: 500, clientY: 380 }),
    );

    expect(controller.getState().cropDraftRect).toEqual({
      x: 100,
      y: 80,
      width: 400,
      height: 300,
    });
    expect(container.querySelector('#btn-apply-crop')?.hasAttribute('disabled')).toBe(false);

    // Apply crop via button click
    container.querySelector<HTMLButtonElement>('#btn-apply-crop')?.click();

    const afterCrop = controller.getState();
    expect(afterCrop.activeTool).toBe('arrow');
    expect(afterCrop.metadata.cssWidth).toBe(400);
    expect(afterCrop.metadata.cssHeight).toBe(300);
    expect(afterCrop.cropOffsetCss).toEqual({ x: 100, y: 80 });

    // Existing arrow coordinates shifted by (-100, -80)
    const shiftedArrow = afterCrop.annotations[0] as ArrowAnnotation;
    expect(shiftedArrow.x1).toBe(origArrow.x1 - 100);
    expect(shiftedArrow.y1).toBe(origArrow.y1 - 80);

    // Flattened export canvas has cropped Retina @2x physical dimensions (800x600)
    const exportCanvas = createFlattenedExportCanvas(
      afterCrop.metadata,
      afterCrop.annotations,
      null,
      [],
      afterCrop.cropOffsetCss,
    );
    expect(exportCanvas.width).toBe(800);
    expect(exportCanvas.height).toBe(600);

    // Ctrl+Z undoes the crop and restores original 960x580 dimensions & annotation coordinates
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }),
    );
    const afterUndo = controller.getState();
    expect(afterUndo.metadata.cssWidth).toBe(960);
    expect(afterUndo.metadata.cssHeight).toBe(580);
    expect(afterUndo.cropOffsetCss).toEqual({ x: 0, y: 0 });
    expect((afterUndo.annotations[0] as ArrowAnnotation).x1).toBe(origArrow.x1);
    expect((afterUndo.annotations[0] as ArrowAnnotation).y1).toBe(origArrow.y1);
  });

  it('cancels crop mode cleanly when Escape is pressed without altering dimensions', () => {
    const container = document.createElement('div');
    const controller = initEditor(container, { initialSearch: '?mode=viewport' });

    controller.setTool('crop');
    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    canvas.dispatchEvent(
      new MouseEvent('mousedown', { clientX: 50, clientY: 50, button: 0 }),
    );
    canvas.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 250, clientY: 200 }),
    );
    canvas.dispatchEvent(
      new MouseEvent('mouseup', { clientX: 250, clientY: 200 }),
    );

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(controller.getState().activeTool).toBe('arrow');
    expect(controller.getState().cropDraftRect).toBeNull();
    expect(controller.getState().metadata.cssWidth).toBe(960);
    expect(controller.getState().metadata.cssHeight).toBe(580);
  });

  it('Task 043: renders floating Apply/Cancel buttons at bottom-right of crop box and allows dragging the crop area to reposition it', () => {
    const container = document.createElement('div');
    const controller = initEditor(container, { initialSearch: '?mode=viewport' });

    controller.setTool('crop');
    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas')!;

    // Draw a 200x150 crop box at (50, 60) -> (250, 210)
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 50, clientY: 60, button: 0 }));
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 250, clientY: 210 }));
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: 250, clientY: 210 }));

    // Floating Apply and Cancel buttons are visible in #crop-actions-overlay
    const floatingBar = container.querySelector<HTMLElement>('#crop-floating-actions');
    expect(floatingBar).not.toBeNull();
    expect(container.querySelector('#btn-floating-apply-crop')).not.toBeNull();
    expect(container.querySelector('#btn-floating-cancel-crop')).not.toBeNull();

    // Hover inside crop box -> cursor becomes 'grab'
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, clientY: 130 }));
    expect(canvas.style.cursor).toBe('grab');

    // Drag inside crop box by (+40, +30) -> moves crop rect to (90, 90) preserving 200x150 size
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 150, clientY: 130, button: 0 }));
    expect(canvas.style.cursor).toBe('grabbing');
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 190, clientY: 160 }));
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: 190, clientY: 160 }));

    expect(controller.getState().cropDraftRect).toEqual({
      x: 90,
      y: 90,
      width: 200,
      height: 150,
    });

    // Clicking floating Apply applies the moved crop region
    container.querySelector<HTMLButtonElement>('#btn-floating-apply-crop')?.click();
    expect(controller.getState().metadata.cssWidth).toBe(200);
    expect(controller.getState().metadata.cssHeight).toBe(150);
    expect(controller.getState().cropOffsetCss).toEqual({ x: 90, y: 90 });
    expect(container.querySelector('#crop-floating-actions')).toBeNull();

    // Enter crop again, draw a box, and cancel via floating Cancel button
    controller.setTool('crop');
    const canvas2 = container.querySelector<HTMLCanvasElement>('#editor-canvas')!;
    canvas2.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10, button: 0 }));
    canvas2.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 90 }));
    canvas2.dispatchEvent(new MouseEvent('mouseup', { clientX: 100, clientY: 90 }));
    expect(container.querySelector('#btn-floating-cancel-crop')).not.toBeNull();
    container.querySelector<HTMLButtonElement>('#btn-floating-cancel-crop')?.click();
    expect(controller.getState().activeTool).not.toBe('crop');
    expect(container.querySelector('#crop-floating-actions')).toBeNull();
  });
});
