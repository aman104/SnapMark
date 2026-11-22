# Implementation Plan: 020 - Implement interactive Arrow and 2-in-1 Line or Highlighter drawing and endpoint handle dragging on canvas

- **Milestone**: M04 - Complete features: Vector annotation editor, undo history and export
- **Task**: `020` - Implement interactive Arrow and 2-in-1 Line or Highlighter drawing and endpoint handle dragging on canvas
- **Spec References**:
  - `.speccraft/docs/02-General-PRD.md` (§4.5 Narzędzie 1: Wektorowa Strzałka, Narzędzie 2: Podkreślenie i zakreślacz 2-w-1)
  - `.speccraft/docs/04-Interface-spec.md` (§5.2 Vector Annotation Editor & §6.2 Interaction Flows)

## Goal & Scope

Upgrade `src/editor/canvas-stage.ts` and `src/editor/index.ts` so the user can interactively draw new vector **Arrows** and **2-in-1 Underlines / Highlighters** by dragging on `#editor-canvas`, select any existing annotation, drag its `(x1, y1)` or `(x2, y2)` endpoint handles to adjust direction/length after drawing, or drag the body of any selected annotation to reposition it — with `Shift` horizontal axis locking (`y2 = y1`) and automatic undo history snapshots.

## Files to Modify / Create

1. **Modify `src/editor/canvas-stage.ts`**:
   - Re-export `hitTestAnnotationBody` as `hitTestAnnotations` and use `src/editor/vector-engine.ts` for hit-testing.
   - Ensure endpoint handles (`drawEndpointHandle`) are rendered on `(x1, y1)` and `(x2, y2)` whenever `isSelected` is true (and omitted when `selectedId === null`).
2. **Modify `src/editor/index.ts`**:
   - Integrate `UndoHistoryStack`, `hitTestEndpointHandle`, `hitTestAnnotationBody`, `applyShiftHorizontalLock`, `updateAnnotationEndpoint`, and `moveAnnotationByDelta`.
   - Bind `mousedown`, `mousemove`, and `mouseup` listeners on `#editor-canvas` (and `window` for drag completion):
     - **Endpoint Handle Drag**: If `state.selectedAnnotationId` is an `arrow` or `line` and `hitTestEndpointHandle` hits `'start'` or `'end'`, push an undo snapshot on first movement and update the dragged endpoint live on `mousemove` (respecting `event.shiftKey`).
     - **Existing Object Selection & Body Drag**: If `hitTestAnnotationBody` hits an existing annotation at `mousedown` (and either it's already selected or clicked within hit threshold), select it, sync toolbar controls, and if dragged (`hypot(dx, dy) >= 2`), push an undo snapshot once and translate the item via `moveAnnotationByDelta`.
     - **New Arrow / Line Drawing**: Otherwise, when `state.activeTool === 'arrow'` or `'line'`, start drawing a new annotation from `(startX, startY)`. On first movement (`hypot(dx, dy) >= 3`), push an undo snapshot, insert the new `ArrowAnnotation` or `LineAnnotation` (with `subtype: state.lineSubtype`, `alpha: HIGHLIGHTER_ALPHA` for highlighter or `1.0` for underline, `strokeWidth: HIGHLIGHTER_STROKE_WIDTH_CSS` for highlighter or `state.strokeWidth` for underline), select it, and update `(x2, y2)` live (locking `y2 = y1` when `event.shiftKey` is held or when `state.activeTool === 'line'` and `event.shiftKey` is true).
3. **Create `tests/unit/editor-drawing.test.ts`**:
   - Test drawing a new Arrow (`#FF3B30`) via mouse drag (`mousedown` -> `mousemove` -> `mouseup`), verifying its coordinates and selection state.
   - Test dragging the arrowhead endpoint handle `(x2, y2)` and start handle `(x1, y1)` after drawing to redirect the arrow, and undoing the handle drag with `Ctrl+Z`.
   - Test drawing a 2-in-1 Line / Highlighter with `shiftKey: true` enforcing horizontal lock (`y2 === y1`) and `alpha === 0.35` for highlighter mode.
   - Test dragging an existing annotation's body to move it across the canvas and undoing via `Ctrl+Z`.

## Acceptance Criteria & Verification

- `npm run typecheck && npm test` passes with all tests in `tests/unit/editor-drawing.test.ts` green.
