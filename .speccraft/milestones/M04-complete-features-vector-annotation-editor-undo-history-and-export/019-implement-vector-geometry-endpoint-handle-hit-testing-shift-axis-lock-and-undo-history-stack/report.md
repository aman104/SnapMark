# Task Report: 019 - Implement vector geometry, endpoint handle hit-testing, Shift axis lock and undo history stack

- **Milestone**: M04 - Complete features: Vector annotation editor, undo history and export
- **Task**: `019` - Implement vector geometry, endpoint handle hit-testing, Shift axis lock and undo history stack
- **Status**: Completed (`[~]` ready for review)
- **Branch**: `task/019-implement-vector-geometry-endpoint-handle-hit-testing-shift-axis-lock-and-undo-history-stack`

## Summary of Changes

1. **Vector Engine Geometry & Hit-Testing (`src/editor/vector-engine.ts`)**:
   - Implemented `applyShiftHorizontalLock(start, current, shiftKey)` forcing `y2 = y1` when `shiftKey` is held.
   - Implemented `hitTestEndpointHandle(item, cssX, cssY, handleRadiusCss)` detecting `'end'` `(x2, y2)` and `'start'` `(x1, y1)` draggable endpoint handles within a `10px` CSS radius.
   - Implemented `hitTestAnnotationBody(annotations, cssX, cssY)` and `getTextAnnotationBounds(item)` for top-down hit-testing across arrows, lines/highlighters, and text objects.
   - Implemented `updateAnnotationEndpoint` (with optional `Shift` horizontal lock) and `moveAnnotationByDelta`.
2. **Immutable Undo History Stack (`src/editor/history.ts`)**:
   - Implemented `UndoHistoryStack` (`pushSnapshot`, `undo`, `canUndo`, `size`, `getSnapshots`, `reset`) with deep cloning of annotation snapshots.
3. **Unit Tests (`tests/unit/vector-engine.test.ts`)**:
   - Added 5 unit tests covering `Shift` locking, endpoint handle hit-testing, body hit-testing, endpoint/body transformations, and multi-step `UndoHistoryStack` restoration.

## Verification

- `npm run typecheck`: 0 errors
- `npx vitest run tests/unit/vector-engine.test.ts`: 5/5 tests passed
