# Task Report: 036 - Fit editor canvas preview to stage width without horizontal scroll

- **Milestone**: M08
- **Task**: `036`
- **Status**: Completed (`[~]` ready for review)

## Summary of Changes
1. Reduced `.editor-stage` padding to `12px` with `overflow-x: hidden; overflow-y: auto;` in `src/styles/editor.css`.
2. Added `computeFitToWidthScale()` and `displayScale` support to `renderCanvasStage()` in `src/editor/canvas-stage.ts`, keeping `canvas.width`/`canvas.height` at full physical Retina DPI while scaling CSS preview dimensions to fit the stage width with zero horizontal scrollbar.
3. Updated `getCanvasCssPoint()`, `#text-overlay-layer` scaling, and `window.resize` handling in `src/editor/index.ts`.
4. Added `tests/unit/editor-fit-stage.test.ts`.
