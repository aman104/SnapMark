# Review — Task 043: Floating Crop Apply/Cancel buttons and draggable crop region

- **Verdict:** Approved
- **Verification:** `npm run typecheck`, `npm test` (32 files / 144 tests), `npm run build`, `npm run test:e2e` (4 Vitest E2E + 8 real Chromium workflows), `npm run package` (`snapmark-extension.zip`, 38 295 bytes) all passed cleanly.
- **Notes:** Floating `Cancel` / `Apply` bar renders at the bottom-right corner of the active crop rectangle, stays within canvas bounds, and moves smoothly when dragging inside the crop region (`grab`/`grabbing` cursor).
