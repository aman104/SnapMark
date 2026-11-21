# Implementation Plan: 024 - Implement end-to-end extension verification suite (npm run test:e2e) covering popup, capture transfer, vector editing and export

- **Milestone**: M05 - Quality and release: Playwright E2E tests, edge-case hardening and Web Store package
- **Task**: `024` - Implement end-to-end extension verification suite (npm run test:e2e) covering popup, capture transfer, vector editing and export
- **Spec References**:
  - `.speccraft/docs/05-Tech-Stack.md` (§4 Testing)
  - `.speccraft/milestones.md` (M05 Scope & Exit Criteria)

## Goal & Scope

Create the end-to-end extension verification suite (`tests/e2e/extension.spec.ts`, `playwright.config.ts`, `scripts/run-e2e.mjs`) wired to `npm run test:e2e` in `package.json`, testing the built `./dist` artifacts end-to-end across `popup.html`, IndexedDB `CaptureSession` transfer into `editor.html`, interactive vector annotation drawing/editing/undo, and flattened HiDPI PNG/Clipboard export.

## Files to Create / Modify

1. **Create `playwright.config.ts` and `tests/e2e/extension.spec.ts`**:
   - End-to-end test specifications verifying:
     1. Built `./dist` extension package integrity (`dist/manifest.json`, `dist/background.js`, `dist/popup.html`, `dist/editor.html`, `dist/icons/`).
     2. `popup.html` E2E flow: default ready state, restricted `chrome://` / Web Store state, scroll progress + `Escape` cancel, and persistent yellow highlight switch.
     3. End-to-end capture transfer & vector annotation workflow in `editor.html`: hydrating a multi-frame or Retina `CaptureSession` from IndexedDB (`?captureId=...`), confirming immediate IndexedDB record purge (`0` records left), drawing a red vector **Strzałka** (`#FF3B30`), dragging its arrowhead handle `(x2, y2)`, drawing a `Shift`-locked horizontal **Zakreślacz** (`alpha = 0.35`), adding an **Obrys** **Tekst** annotation via `#active-text-input`, undoing via `Ctrl+Z`, copying to clipboard (`✓ Skopiowano!`), and exporting a flattened PNG named `<domena>_YYYY-MM-DD_HH-mm.png`.
2. **Create `scripts/run-e2e.mjs` and update `package.json`**:
   - Add `"test:e2e": "node scripts/run-e2e.mjs"` in `package.json` which ensures `./dist` is built and runs the E2E verification suite (`tests/e2e/extension.spec.ts` via Vitest/Playwright runner).

## Acceptance Criteria & Verification

- `npm run test:e2e` runs against `./dist` and exits with code `0`.
