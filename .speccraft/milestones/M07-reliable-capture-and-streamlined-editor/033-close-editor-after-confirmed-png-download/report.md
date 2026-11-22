# Task 033 report: Close editor after confirmed PNG download

## Changes
- Use `chrome.downloads` with the requested `downloads` permission, monitor the specific download ID and keep its object URL alive until completion or interruption. Subscribe before starting and query state after receiving the ID to cover fast completion.
- Close the editor only after a completed download; show errors and preserve annotations on failure or interruption. Keep automatic names and clipboard paste.
- Update manifest permission tests, simulated E2E tests and README.

## Verification
- `npm run typecheck`, `npm test` (125 passed), `npm run build`, `npm run test:e2e` (4 simulated tests), `npm run package` passed.
- In isolated Chrome for Testing, a temporary copy of the extension ran the real editor download flow and `chrome.downloads`; the completed callback fired and a valid 1920×1160 PNG was written to a temporary directory. The close action was substituted by a callback, so actual tab removal remains for task 034.
- Tests cover matching IDs, unrelated events, early completion, interruption, startup errors and resource cleanup.

## Deviations from the plan
- Background service-worker changes were unnecessary: download monitoring runs in the editor tab. Updated existing manifest permission tests beyond the planned file list.

## Spec impact
- `02-General-PRD.md` §6.2 and `05-Tech-Stack.md` permission lists need to include `downloads` at milestone acceptance, required to observe download state; no host permission was added.

## Assumptions
- None.

## Notes for next tasks
- Task 034 should verify actual tab removal on completed download and real interrupted/cancelled downloads.

## Review fixes
- Keep the editor open with a retry message if metadata, annotations or a text draft changed during download.
- Update download feedback in place, preserving the active textarea, focus and selection; added regression tests. Repeated real Chrome success-path download after the fixes.
- Round 2: recheck content and active text draft immediately after current-tab lookup and before closing; added delayed-lookup regression. Repeated real Chrome success-path test.
