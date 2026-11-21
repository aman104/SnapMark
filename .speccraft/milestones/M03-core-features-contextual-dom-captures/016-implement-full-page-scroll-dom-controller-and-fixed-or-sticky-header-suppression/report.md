# Task 016 report: Implement full-page scroll DOM controller and fixed or sticky header suppression

## Changes
- `src/content/capture-injected.ts`: added `computeFullPageFrameOffsets`, `prepareFullPageScrollInDom`, `hideFixedAndStickyElementsInDom`, `stepFullPageScrollInDom`, and `restoreFullPageScrollInDom`.
- `tests/unit/content-scroll.test.ts`: added unit tests verifying multi-frame vertical scroll offsets, `MAX_CANVAS_HEIGHT` (`16384 px`) capping, Frame #1 header preservation, Frame #2+ `fixed`/`sticky` suppression, and full DOM + scroll position restoration.

## Verification
- `npm run typecheck` — passed.
- `npm test` — 17 test files passed (61 tests total).
- `npm run build` — passed.
- TC-01 … TC-05: met.

## Deviations from the plan
- none

## Spec impact
- none

## Review fixes
- none

## Assumptions
- none

## Notes for next tasks
- Task 017 (`src/background/capture-orchestrator.ts`) will orchestrate `measureSelectionInDom`, `cleanupSelectionHighlightInDom`, `measureTargetImageInDom`, `prepareFullPageScrollInDom`, `hideFixedAndStickyElementsInDom`, `stepFullPageScrollInDom`, and `restoreFullPageScrollInDom` across all 4 capture modes.
