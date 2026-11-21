# Task 014 report: Implement on-demand DOM measurement and temporary yellow selection highlight

## Changes
- `src/content/capture-injected.ts`: created self-contained `measureSelectionInDom` (reading `window.getSelection().getRangeAt(0)`, scrolling offscreen containers into view, adding the 20px safety margin clamped to viewport bounds, and optionally injecting `[data-snapmark-highlight]` yellow overlays `rgba(255, 235, 59, 0.45)` + `[data-snapmark-selection-style]`) and `cleanupSelectionHighlightInDom`.
- `tests/unit/content-selection.test.ts`: added unit tests for empty selection, 20px safety margin, viewport boundary clamping, yellow highlight injection, and DOM cleanup.

## Verification
- `npm run typecheck` — passed.
- `npm test` — 15 test files passed (55 tests total).
- `npm run build` — passed.
- TC-01 … TC-04: met.

## Deviations from the plan
- none

## Spec impact
- none

## Review fixes
- none

## Assumptions
- none

## Notes for next tasks
- Task 015 extends `src/content/capture-injected.ts` with `measureTargetImageInDom`.
