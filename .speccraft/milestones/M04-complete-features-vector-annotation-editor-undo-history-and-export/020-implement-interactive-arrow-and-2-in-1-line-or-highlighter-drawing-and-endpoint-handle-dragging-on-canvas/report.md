# Task Report: 020 - Implement interactive Arrow and 2-in-1 Line or Highlighter drawing and endpoint handle dragging on canvas

- **Milestone**: M04 - Complete features: Vector annotation editor, undo history and export
- **Task**: `020` - Implement interactive Arrow and 2-in-1 Line or Highlighter drawing and endpoint handle dragging on canvas
- **Status**: Completed (`[~]` ready for review)
- **Branch**: `task/020-implement-interactive-arrow-and-2-in-1-line-or-highlighter-drawing-and-endpoint-handle-dragging-on-canvas`

## Summary of Changes

1. **Interactive Canvas Drawing & Endpoint Handle Manipulation (`src/editor/index.ts`, `src/editor/canvas-stage.ts`)**:
   - Wired `UndoHistoryStack`, `hitTestEndpointHandle`, `hitTestAnnotationBody`, `applyShiftHorizontalLock`, `updateAnnotationEndpoint`, and `moveAnnotationByDelta` into `initEditor()`.
   - Implemented `handleCanvasMouseDown`, `handleCanvasMouseMove`, and `handleCanvasMouseUp` supporting 3 interaction modes:
     1. **Endpoint Handle Drag (`'start'` / `'end'`)**: Dragging `(x1, y1)` or `(x2, y2)` of a selected arrow or line updates its direction/length in real time (with `Shift` horizontal lock support) and records an undo snapshot on first movement.
     2. **Body Selection & Repositioning**: Clicking and dragging any annotation body translates it across the canvas via `moveAnnotationByDelta` with an undo snapshot.
     3. **Single-Drag Creation (`arrow` & `line`)**: Dragging on empty canvas space creates a new `ArrowAnnotation` or 2-in-1 `LineAnnotation` (`underline` with `alpha: 1.0`, or `highlighter` with `alpha: 0.35` and `strokeWidth: 24`), enforcing `y2 = y1` when `Shift` is held.
2. **Unit Tests (`tests/unit/editor-drawing.test.ts`)**:
   - Added 3 comprehensive tests verifying arrow drawing, post-draw arrowhead handle dragging, `Shift`-locked highlighter drawing, body dragging, and multi-step `Ctrl+Z` undo.

## Verification

- `npm run typecheck`: 0 errors
- `npx vitest run tests/unit/editor-drawing.test.ts`: 3/3 tests passed
