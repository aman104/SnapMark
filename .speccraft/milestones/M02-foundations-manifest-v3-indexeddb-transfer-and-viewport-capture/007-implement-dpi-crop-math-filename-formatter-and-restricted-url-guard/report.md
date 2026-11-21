# Task 007 report: Implement DPI crop math, filename formatter and restricted URL guard

## Changes
- `src/shared/dpi.ts`: implemented `normalizeDpr`, `clampRectWithPaddingToViewport`, `multiplyRectByDpr`, and `computePhysicalCropRect`.
- `src/shared/filename.ts`: implemented `normalizeDomainForFilename` and `formatCaptureFilename` (`<domain>_YYYY-MM-DD_HH-mm.png`).
- `src/shared/url-guard.ts`: implemented `isRestrictedBrowserUrl` detecting internal browser schemes and Chrome Web Store pages.
- `tests/unit/dpi.test.ts`, `tests/unit/filename.test.ts`, `tests/unit/url-guard.test.ts`: added comprehensive unit tests.

## Verification
- `npm run typecheck` — passed.
- `npm test` — 9 test files passed (32 tests total).
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
- Use `isRestrictedBrowserUrl` in `src/background/capture-orchestrator.ts` (Task 011) and `src/popup/index.ts` (Task 012).
- Use `normalizeDomainForFilename` and `formatCaptureFilename` in Tasks 011 and 013.
