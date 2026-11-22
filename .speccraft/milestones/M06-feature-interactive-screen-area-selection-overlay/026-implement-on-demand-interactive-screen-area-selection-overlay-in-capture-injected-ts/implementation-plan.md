# Implementation Plan: 026 - Implement on-demand interactive screen area selection overlay in capture-injected.ts

- **Milestone**: M06 - Feature: Interactive screen area selection overlay (Zaznacz fragment ekranu)
- **Task**: `026` - Implement on-demand interactive screen area selection overlay in capture-injected.ts
- **Spec References**:
  - `.speccraft/docs/07-feature-plan-interactive-area-selection.md`
  - `.speccraft/docs/02-General-PRD.md` (§4.1)
  - `.speccraft/docs/04-Interface-spec.md` (§6.4)

## Goal & Scope

Extend `src/content/capture-injected.ts` with a 100% self-contained async function `selectAreaOverlayInDom(): Promise<AreaSelectionMeasurementResult>` that injects an interactive full-viewport crosshair overlay (`[data-snapmark-area-overlay]`) onto the target webpage, lets the user drag a selection rectangle (`mousedown` → `mousemove` → `mouseup`) or cancel with `Escape`, removes the overlay completely from the DOM, waits for a browser paint tick (`requestAnimationFrame` / `setTimeout`), and returns the selected `cropRectCss` and `window.devicePixelRatio`.

## Files to Modify / Create

1. **Modify `src/content/capture-injected.ts`**:
   - Define `export interface AreaSelectionMeasurementResult { cancelled: boolean; cropRectCss: CssRect | null; viewportWidthCss: number; viewportHeightCss: number; dpr: number; }`.
   - Implement `export function selectAreaOverlayInDom(): Promise<AreaSelectionMeasurementResult>`:
     - Removes any existing `[data-snapmark-area-overlay]` element first.
     - Creates the overlay root `<div data-snapmark-area-overlay="true">` (`position: fixed; inset: 0; z-index: 2147483647; cursor: crosshair; user-select: none; background: rgba(15, 17, 21, 0.35);`).
     - Renders a top helper pill (*„Przeciągnij myszą, aby zaznaczyć fragment ekranu • Esc anuluje”*), a selection box `<div data-snapmark-area-box="true">` (`border: 2px solid #FF3B30; box-shadow: 0 0 0 9999px rgba(15, 17, 21, 0.48);`), and a dimensions pill `<div data-snapmark-area-dimensions="true">` (`W × H px`).
     - Handles `mousedown`, `mousemove`, `mouseup`, and `keydown` (`Escape`), normalizing coordinates regardless of drag direction (top-left to bottom-right or bottom-right to top-left) and clamping to `(0..innerWidth, 0..innerHeight)`.
     - Always removes `[data-snapmark-area-overlay]` and event listeners before resolving.
2. **Create `tests/unit/content-area-overlay.test.ts`**:
   - Test dragging a rectangle in any direction (including bottom-right to top-left), verifying live dimension label updates, DOM overlay removal on `mouseup`, and returned `cropRectCss`.
   - Test pressing `Escape` cancels the selection, removes `[data-snapmark-area-overlay]` from DOM, and resolves `{ cancelled: true, cropRectCss: null }`.
   - Test tiny accidental clicks (`< 8x8 px`) resolve as `{ cancelled: true, cropRectCss: null }` and clean up the DOM.

## Acceptance Criteria & Verification

- `npm run typecheck && npx vitest run tests/unit/content-area-overlay.test.ts` passes with 0 errors.
