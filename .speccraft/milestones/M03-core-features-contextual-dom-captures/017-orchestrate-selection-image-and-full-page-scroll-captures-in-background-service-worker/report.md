# Task 017 report: Orchestrate Selection, Image and Full-Page Scroll captures in Background Service Worker

## Changes
- `src/shared/types.ts`: added `CancelScrollCaptureRequest`, `ScrollCaptureProgressMessage`, and optional `srcUrl` on `RuntimeCaptureRequest`.
- `src/background/capture-orchestrator.ts`: implemented `captureTextSelection` (with `selectionPaddingPx`, optional yellow highlight, and `finally` cleanup), `captureImageElement` (passing `srcUrl` to `measureTargetImageInDom` and saving `cropRectCss`), `captureFullPageScroll` (`>= 550 ms` rate-limited multi-frame loop, hiding `fixed`/`sticky` headers after Frame #1, badge & progress message updates, `MAX_CANVAS_HEIGHT` cap, cancellation, and `finally` DOM restoration), and `cancelActiveScrollCapture`.
- `src/background/index.ts`: connected `info.srcUrl` for image context menu clicks and `SNAPMARK_CANCEL_SCROLL_CAPTURE` runtime messages.
- `tests/unit/background-contextual-captures.test.ts`: added unit tests verifying Selection, Image, Full-Page Scroll, error handling, and cancellation.

## Verification
- `npm run typecheck` — passed.
- `npm test` — 18 test files passed (66 tests total).
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
- Task 018 connects `src/editor/canvas-stage.ts` and `src/editor/index.ts` to physical DPI cropping (`cropRectCss * dpr`) and multi-frame scroll stitching (`scrollYCss * dpr`).
