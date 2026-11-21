# Task 011 report: Build MV3 Background Service Worker, rate limiter and Viewport capture orchestrator

## Changes
- `src/shared/types.ts`: added `RuntimeCaptureRequest` and `RuntimeCaptureResponse` message contracts.
- `src/background/rate-limiter.ts`: implemented `CaptureRateLimiter` enforcing `>= 550 ms` spacing between `captureVisibleTab` calls and up to 3 automatic retries with `600 ms` exponential backoff on quota errors.
- `src/background/capture-orchestrator.ts`: implemented `dataUrlToBlob`, `registerContextMenus` (`capture-selection`, `capture-image`, `capture-viewport`), `captureVisibleViewport` (reading DPR & viewport dimensions, capturing PNG via rate limiter, storing `CaptureSession` `Blob` in `SnapMarkDB.captures`, and opening `editor.html?captureId=<id>`), and `handleCaptureTrigger`.
- `src/background/index.ts`: wired MV3 service worker listeners (`onInstalled`, `onStartup`, `contextMenus.onClicked`, `commands.onCommand`, `runtime.onMessage`).
- `tests/unit/rate-limiter.test.ts` & `tests/unit/background-viewport.test.ts`: added unit tests for rate limiting, retry backoff, context menu setup, and end-to-end Viewport capture.

## Verification
- `npm run typecheck` — passed.
- `npm test` — 13 test files passed (47 tests total).
- `npm run build` — passed, emitting `dist/background.js`.
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
- Task 012 (`src/popup/index.ts`) can now dispatch `{ type: 'SNAPMARK_TRIGGER_CAPTURE', mode: 'viewport' }` via `chrome.runtime.sendMessage`.
