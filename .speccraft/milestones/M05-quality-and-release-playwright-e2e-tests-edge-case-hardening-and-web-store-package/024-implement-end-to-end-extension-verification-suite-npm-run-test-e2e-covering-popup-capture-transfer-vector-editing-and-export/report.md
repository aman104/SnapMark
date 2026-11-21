# Task Report: 024 - Implement end-to-end extension verification suite (npm run test:e2e) covering popup, capture transfer, vector editing and export

- **Milestone**: M05 - Quality and release: Playwright E2E tests, edge-case hardening and Web Store package
- **Task**: `024` - Implement end-to-end extension verification suite (npm run test:e2e) covering popup, capture transfer, vector editing and export
- **Status**: Completed (`[~]` ready for review)
- **Branch**: `task/024-implement-end-to-end-extension-verification-suite-npm-run-test-e2e-covering-popup-capture-transfer-vector-editing-and-export`

## Summary of Changes

1. **E2E Configuration & Runner (`playwright.config.ts`, `vitest.e2e.config.ts`, `scripts/run-e2e.mjs`, `package.json`)**:
   - Added `playwright.config.ts` defining the Chromium extension launch flags (`--disable-extensions-except=./dist`, `--load-extension=./dist`), `vitest.e2e.config.ts`, and `scripts/run-e2e.mjs` wired to `"test:e2e"` in `package.json`.
2. **End-to-End Extension Verification Suite (`tests/e2e/extension.spec.ts`)**:
   - **E2E 1**: Verifies the compiled `./dist` package structure (`manifest.json`, `background.js`, `popup.html`, `editor.html`, `icons/icon-16..128.png`) and Manifest V3 permissions.
   - **E2E 2**: Verifies `popup.html` restricted browser URL detection (`chrome://extensions` -> `#restricted-banner`), yellow highlight toggle persistence in `chrome.storage.local`, and full-page scroll progress cancellation via `Escape`.
   - **E2E 3**: Verifies the complete end-to-end pipeline from `captureTextSelection` (+20 px margin, yellow highlight, `@2x` DPR) through `SnapMarkDB.captures` IndexedDB `Blob` transfer into `editor.html?captureId=<id>`, immediate IndexedDB record purge upon canvas load, interactive vector **Strzałka** drawing + arrowhead handle dragging, `Shift`-locked **Zakreślacz** (`alpha = 0.35`), **Obrys** **Tekst** input via `#active-text-input`, `Ctrl+Z` undo, `ClipboardItem` copy (`✓ Skopiowano!`), and flattened PNG download (`docs-snapmark-pl_2026-11-21_HH-mm.png`).

## Verification

- `npm run typecheck`: 0 errors
- `npm run test:e2e`: 3/3 E2E scenarios passed
