## Round 1 — changes requested — 2026-11-22

**Checks run:** `npm run typecheck`, `npm test` (95 passed), `npm run build` — passed.

| # | Severity | Where | Problem | Expected fix |
|---|---|---|---|---|
| 1 | blocking | `src/background/capture-orchestrator.ts:302` | A changed active tab can be captured with the original page URL and crop. | Verify the source tab is active inside each capture attempt and test tab switching. |

## Round 2 — approved — 2026-11-22

**Checks run:** `npm run typecheck`, `npm test` (96 passed), `npm run build` — passed. No blocking findings.
