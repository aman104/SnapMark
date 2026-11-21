# Task 012 report: Connect popup.html to live Chrome APIs, storage settings and Viewport trigger

## Changes
- `src/popup/index.ts`: upgraded `renderPopup` to hydrate `highlightSelectionBeforeCapture` from `loadUserSettings()`, persist toggle changes via `updateUserSettings()`, automatically detect restricted active tabs (`chrome.tabs.query` + `isRestrictedBrowserUrl`) and active text selection (`chrome.scripting.executeScript`), and dispatch `{ type: 'SNAPMARK_TRIGGER_CAPTURE', mode: 'viewport' }` via `chrome.runtime.sendMessage`.
- `tests/unit/popup.test.ts`: added unit tests verifying settings persistence across popup instances, automatic restricted tab detection on `chrome://extensions`, and live `chrome.runtime.sendMessage` viewport capture dispatch.

## Verification
- `npm run typecheck` — passed.
- `npm test` — 13 test files passed (48 tests total).
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
- Task 013 connects `editor.html` to `consumeCaptureSession(captureId)` from `src/shared/db.ts` and `loadUserSettings()` / `updateUserSettings()` from `src/shared/settings.ts`.
