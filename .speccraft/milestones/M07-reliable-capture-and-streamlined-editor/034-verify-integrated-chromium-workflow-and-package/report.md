# Task 034 report: Verify integrated Chromium workflow and package

## Changes
- Added Playwright and a real Chromium extension workflow alongside clearly labeled Vitest/JSDOM integration tests; `npm run test:e2e` always rebuilds before running both.
- Test uses an isolated browser profile, local fixture and temporary extension copy; it adds `<all_urls>` only to that disposable copy because headless programmatic popup opening does not grant activeTab. Production manifest remains unchanged.
- CI installs Playwright Chromium and system dependencies; README documents setup and test boundaries.

## Verification
- `npm run typecheck`, `npm test` (127 passed), `npm run build`, `npm run test:e2e` (4 JSDOM tests and real Chromium workflow), and `npm run package` passed.
- Real Chromium checked full-page first frame at the top, original scroll restoration on success, cancellation and injected API error; arrow/line drawing, text entry and double-click edit; real completed PNG and automatic tab close; viewport, area selection/cancellation, explicit close, text-selection and image capture handlers; synthetic clipboard-image paste.
- The generated archive `snapmark-extension.zip` passed the package script checks.

## Deviations from the plan
- Added `@playwright/test` and lockfile as required by the existing tech stack, plus CI browser installation. Context-menu handlers were invoked through their shared runtime paths; native context-menu selection and keyboard shortcuts were not automated. Clipboard paste and failure conditions were injected; the OS clipboard was untouched. Headless-only temporary host permission differs from production activeTab behavior.

## Spec impact
- None beyond task 033's already recorded `downloads` permission documentation update.

## Assumptions
- None.

## Notes for next tasks
- Operator demo should additionally check native PPM menu and keyboard shortcuts in a normal browser profile.
