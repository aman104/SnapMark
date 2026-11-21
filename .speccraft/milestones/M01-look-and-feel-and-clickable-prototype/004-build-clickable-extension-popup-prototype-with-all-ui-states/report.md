# Task 004 report: Build clickable extension popup prototype with all UI states

## Changes
- `src/styles/popup.css`: implemented the `320px` popup layout, header with `Lokalny • MV3` privacy pill, capture mode card list, image PPM hint strip, settings footer, full-page scroll progress bar panel, and restricted page danger banner.
- `src/popup/index.ts`: implemented `renderPopup` controller supporting all 4 UI states (`default`, `no-selection`, `progress`, `restricted`), toggle switch for `highlightSelectionBeforeCapture`, full-page scroll progress transition with `Escape` / button cancellation, and navigation to `editor.html?mode=<mode>`.
- `tests/unit/popup.test.ts`: added unit tests verifying all 4 states, selection card disabled guard, yellow highlight toggle, scroll progress view, and navigation callbacks.

## Verification
- `npm run typecheck` — passed.
- `npm test` — 4 test files passed (16 tests total).
- `npm run build` — passed.
- TC-01 … TC-06: met.

## Deviations from the plan
- none

## Spec impact
- none

## Review fixes
- none

## Assumptions
- none

## Notes for next tasks
- Clicking cards in `popup.html` navigates to `editor.html?mode=viewport`, `editor.html?mode=selection&highlight=0|1`, or `editor.html?mode=fullpage`.
