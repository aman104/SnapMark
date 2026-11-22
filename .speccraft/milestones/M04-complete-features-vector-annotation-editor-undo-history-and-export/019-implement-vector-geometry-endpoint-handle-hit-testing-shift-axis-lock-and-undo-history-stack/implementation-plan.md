# Implementation Plan: 019 - Implement vector geometry, endpoint handle hit-testing, Shift axis lock and undo history stack

- **Milestone**: M04 - Complete features: Vector annotation editor, undo history and export
- **Task**: `019` - Implement vector geometry, endpoint handle hit-testing, Shift axis lock and undo history stack
- **Spec References**:
  - `.speccraft/docs/02-General-PRD.md` (§4.5 Minimalistyczny Edytor Adnotacji — Warstwa Wektorowa, §6.3 Model danych edytora)
  - `.speccraft/docs/04-Interface-spec.md` (§5.2 Vector Annotation Editor)
  - `.speccraft/docs/05-Tech-Stack.md` (§8 Target Directory Structure — `src/editor/vector-engine.ts`, `src/editor/history.ts`)

## Goal & Scope

Create the pure vector math, hit-testing, coordinate transformation, and undo history modules (`src/editor/vector-engine.ts` and `src/editor/history.ts`) that power interactive drawing, endpoint handle dragging (`(x1, y1)` and `(x2, y2)`), `Shift` horizontal axis locking (`y2 = y1`), and multi-step `Ctrl+Z` undo.

## Files to Create / Modify

1. **Create `src/editor/vector-engine.ts`**:
   - `export type EndpointHandleRole = 'start' | 'end';`
   - `export interface Point2D { x: number; y: number; }`
   - `export function applyShiftHorizontalLock(start: Point2D, current: Point2D, shiftKey: boolean): Point2D`:
     - When `shiftKey` is `true`, returns `{ x: current.x, y: start.y }` (`y2 = y1`); otherwise returns `{ x: current.x, y: current.y }`.
   - `export function hitTestEndpointHandle(item: AnnotationItem | null | undefined, cssX: number, cssY: number, handleRadiusCss = 10): EndpointHandleRole | null`:
     - For `arrow` or `line` items, checks distance from `(cssX, cssY)` to `(item.x2, item.y2)` (`'end'` arrowhead/tip prioritized first) and `(item.x1, item.y1)` (`'start'`). Returns `'end'`, `'start'`, or `null`.
   - `export function hitTestAnnotationBody(annotations: AnnotationItem[], cssX: number, cssY: number): AnnotationItem | null`:
     - Iterates from top-most (`annotations.length - 1`) to bottom-most (`0`), testing point-to-segment distance for `arrow`/`line` and bounding box for `text`.
   - `export function updateAnnotationEndpoint(item: ArrowAnnotation | LineAnnotation, handle: EndpointHandleRole, target: Point2D, shiftKey = false): ArrowAnnotation | LineAnnotation`:
     - Returns a cloned item with updated `(x1, y1)` or `(x2, y2)`, applying horizontal lock relative to the opposite endpoint when `shiftKey` is true.
   - `export function moveAnnotationByDelta(item: AnnotationItem, dx: number, dy: number): AnnotationItem`:
     - Translates `(x1, y1, x2, y2)` for `arrow`/`line` or `(x, y)` for `text` by `(dx, dy)`.
2. **Create `src/editor/history.ts`**:
   - `export function cloneAnnotationList(items: AnnotationItem[]): AnnotationItem[]`
   - `export class UndoHistoryStack`:
     - `pushSnapshot(currentItems: AnnotationItem[]): void`
     - `undo(): AnnotationItem[] | null`
     - `canUndo(): boolean`
     - `size(): number`
     - `getSnapshots(): AnnotationItem[][]`
     - `reset(initialSnapshots?: AnnotationItem[][]): void`
3. **Create `tests/unit/vector-engine.test.ts`**:
   - Unit tests verifying `applyShiftHorizontalLock`, `hitTestEndpointHandle` (`start` and `end`), `hitTestAnnotationBody`, `updateAnnotationEndpoint` (with and without `Shift`), `moveAnnotationByDelta`, and `UndoHistoryStack`.

## Acceptance Criteria & Verification

- `npm run typecheck && npm test` passes with all tests in `tests/unit/vector-engine.test.ts` green.
