# Task 029 report: Fix full-page capture starting position

## Changes
- Wait for two animation frames and confirm the actual scroll position before capturing each frame. Stop safely for an unscrollable inner container and reject an unconfirmed first frame.
- Restore the original scroll position while smooth scrolling remains disabled; then remove the temporary style.

## Verification
- `npm run typecheck`, `npm test` (99 passed), `npm run build` passed.
- Isolated headless Chrome fixture, using bundled production DOM helpers on a smooth-scroll page: start at 800px, prepared position 0px, restored position 800px. This checks the browser DOM helpers, not the complete extension capture path.
- Unit tests verify ordering, stale immediate measurements, first-frame rejection, and cleanup.

## Deviations from the plan
- Full extension browser flow remains for task 034; the Chrome fixture tests the actual scroll helper independently.

## Spec impact
- None.

## Assumptions
- None.

## Notes for next tasks
- Task 034 must verify the complete extension capture path in Chrome, including cancellation and errors.
