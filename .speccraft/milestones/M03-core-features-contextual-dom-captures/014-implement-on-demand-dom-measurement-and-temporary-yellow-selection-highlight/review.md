## Round 1 — approved — 2026-11-21

**Checks run:** `npm run typecheck && npm test && npm run build` — all passed (55/55 tests across 15 files).

| # | Severity | Where | Problem | Expected fix |
|---|---|---|---|---|

**Notes (non-blocking):** `measureSelectionInDom` and `cleanupSelectionHighlightInDom` in `src/content/capture-injected.ts` are self-contained and handle 20px safety margin clamping and temporary yellow highlighting cleanly.
