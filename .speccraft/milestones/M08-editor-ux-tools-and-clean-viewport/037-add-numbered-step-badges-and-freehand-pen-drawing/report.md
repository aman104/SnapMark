# Task Report: 037 - Add numbered step badges (1, 2, 3...) and freehand pen drawing

- **Milestone**: M08
- **Task**: `037`
- **Status**: Completed (`[~]` ready for review)

## Summary of Changes
1. Extended `EditorTool` and `AnnotationItem` in `src/shared/types.ts` and `src/shared/settings.ts` with `StepAnnotation` (`step`, key `4`) and `PenAnnotation` (`pen`, key `5`).
2. Added `getNextStepNumber()`, `step` & `pen` hit-testing, and `moveAnnotationByDelta` support in `src/editor/vector-engine.ts`, plus deep point cloning in `src/editor/history.ts`.
3. Added `drawStepAnnotation` (colored circle + contrasting bold number + border + selection ring) and `drawPenAnnotation` (round-cap freehand path + selection bbox) in `src/editor/canvas-stage.ts`.
4. Added **Kroki (`4`)** and **Pisak (`5`)** buttons and interactive handlers in `src/editor/index.ts`.
5. Added `tests/unit/editor-step-and-pen.test.ts`.
