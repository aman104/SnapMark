# Implementation Plan: 036 - Fit editor canvas preview to available stage width without horizontal scroll while keeping native Retina export and accurate pointer mapping

- **Milestone**: M08 - Feature: Clean viewport capture, fit-to-width editor, crop, step badges and freehand pen
- **Task**: `036`
- **Spec References**: `02-General-PRD.md` (`FR-10`), `04-Interface-spec.md` (`§9`)

## Changes
1. `src/styles/editor.css`: Reduce `.editor-stage` padding from `var(--space-xxl)` (`32px`) to `12px` and set `overflow-x: hidden; overflow-y: auto;`.
2. `src/editor/canvas-stage.ts`: Add `computeFitToWidthScale(cssWidth: number, availableWidth: number): number` (`Math.min(1, availableWidth / cssWidth)` when `availableWidth > 0`) and accept `displayScale = 1` in `renderCanvasStage()` so `canvas.style.width = ${Math.round(cssWidth * displayScale)}px` and `canvas.style.height = ${Math.round(cssHeight * displayScale)}px` while `canvas.width = cssWidth * dpr` and `canvas.height = cssHeight * dpr` remain at 100% native Retina resolution.
3. `src/editor/index.ts`: Compute `displayScale` from `#editor-stage` client width (`Math.max(1, stage.clientWidth - 24)`), update on `window.resize`, map pointer coordinates in `getCanvasCssPoint()` via `(event.clientX - rect.left) / scaleX`, and scale `#active-text-input` positioning accordingly.
4. Add `tests/unit/editor-fit-stage.test.ts`.
