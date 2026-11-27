# Implementation Plan: 037 - Add numbered step badges (1, 2, 3...) and freehand pen drawing (step & pen tools) with hit-testing, moving, recoloring and undo

- **Milestone**: M08 - Feature: Clean viewport capture, fit-to-width editor, crop, step badges and freehand pen
- **Task**: `037`
- **Spec References**: `02-General-PRD.md` (`FR-12`, `FR-13`), `04-Interface-spec.md` (`§9`)

## Changes
1. `src/shared/types.ts` & `src/shared/settings.ts`: Add `'step' | 'pen' | 'crop'` to `EditorTool`; add `StepAnnotation` (`{ id, type: 'step', x, y, stepNumber, color, radius }`) and `PenAnnotation` (`{ id, type: 'pen', points: Array<{ x: number; y: number }>, color, strokeWidth }`) to `AnnotationItem`.
2. `src/editor/vector-engine.ts`: Add `getNextStepNumber(annotations)`, hit-testing for `step` (circle radius + padding) and `pen` (polyline segment distance), and `moveAnnotationByDelta` support for `step` and `pen`.
3. `src/editor/canvas-stage.ts`: Add `drawStepAnnotation` (filled circle in `item.color`, contrasting white/dark bold number centered inside, crisp border, blue selection ring when selected) and `drawPenAnnotation` (smooth round-cap polyline in `item.color` and `item.strokeWidth`, dashed bounding box when selected).
4. `src/editor/index.ts`: Add toolbar buttons **Kroki (`4`, `#tool-step`)** and **Pisak (`5`, `#tool-pen`)**, keyboard shortcuts `4` and `5`, click-to-place auto-numbered step circles, drag-to-draw freehand pen strokes, and full selection/moving/recoloring/`Ctrl+Z`/`Delete` support.
5. Add `tests/unit/editor-step-and-pen.test.ts`.
