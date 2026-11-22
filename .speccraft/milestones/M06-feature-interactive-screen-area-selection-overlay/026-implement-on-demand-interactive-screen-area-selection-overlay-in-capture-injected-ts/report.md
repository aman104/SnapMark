# Task Report: 026 - Implement on-demand interactive screen area selection overlay in capture-injected.ts

- **Milestone**: M06 - Feature: Interactive screen area selection overlay (Zaznacz fragment ekranu)
- **Task**: `026` - Implement on-demand interactive screen area selection overlay in capture-injected.ts
- **Status**: Completed (`[~]` ready for review)
- **Branch**: `task/026-implement-on-demand-interactive-screen-area-selection-overlay-in-capture-injected-ts`

## Summary of Changes

1. **Interactive Screen Area Selection Overlay (`src/content/capture-injected.ts`)**:
   - Implemented self-contained `selectAreaOverlayInDom(): Promise<AreaSelectionMeasurementResult>` for injection via `chrome.scripting.executeScript`.
   - Renders `[data-snapmark-area-overlay]` (`position: fixed; inset: 0; z-index: 2147483647; cursor: crosshair`), top guidance pill (`[data-snapmark-area-hint]`), selection box (`[data-snapmark-area-box]` with `#FF3B30` border and surrounding dim `box-shadow`), and live dimensions badge (`[data-snapmark-area-dimensions]` showing `W × H px`).
   - Normalizes drag coordinates in any direction, clamps to viewport bounds, supports `Escape` cancellation and `< 8×8 px` accidental click rejection, and removes the overlay completely from the DOM before resolving.
2. **Unit Tests (`tests/unit/content-area-overlay.test.ts`)**:
   - Verified drag coordinate normalization, live dimension badge updates, `Escape` cancellation, `< 8×8 px` click handling, and guaranteed DOM cleanup (3/3 tests passing).

## Verification

- `npm run typecheck`: 0 errors
- `npx vitest run tests/unit/content-area-overlay.test.ts`: 3/3 tests passed
