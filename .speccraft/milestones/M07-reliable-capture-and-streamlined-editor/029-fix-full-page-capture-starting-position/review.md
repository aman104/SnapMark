## Round 1 — changes requested — 2026-11-22

**Checks:** typecheck, 99 unit tests, build, E2E and package passed.

| # | Severity | Where | Problem | Expected fix |
|---|---|---|---|---|
| 1 | blocking | `src/content/capture-injected.ts` | Animation frames can be suspended in background tabs, leaving capture and cleanup pending indefinitely. | Bound waiting time and verify cleanup/cancellation when frames are unavailable. |
