## Round 1 — approved — 2026-11-21

**Checks run:** `npm run typecheck && npm test && npm run build` — all passed (66/66 tests across 18 files).

| # | Severity | Where | Problem | Expected fix |
|---|---|---|---|---|

**Notes (non-blocking):** `captureTextSelection`, `captureImageElement`, `captureFullPageScroll`, and `cancelActiveScrollCapture` in `src/background/capture-orchestrator.ts` handle all 4 capture modes with rate limiting and `finally` DOM restoration.
