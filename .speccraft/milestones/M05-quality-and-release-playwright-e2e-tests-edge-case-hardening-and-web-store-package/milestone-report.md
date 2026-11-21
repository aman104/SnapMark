# Milestone Report: M05 - Quality and release: Playwright E2E tests, edge-case hardening and Web Store package

- **Milestone**: `M05` — Quality and release: Playwright E2E tests, edge-case hardening and Web Store package
- **Phase**: 6–7 — Quality & release
- **Type**: release
- **Status**: `[?]` Ready for operator review
- **Branch**: `milestone/M05-quality-and-release-playwright-e2e-tests-edge-case-hardening-and-web-store-package`

## Summary of Delivered Capabilities

1. **PRD §7 Edge-Case Hardening & §10–11 Privacy / Permissions / Zero-Network Audit (`src/background/capture-orchestrator.ts`, `tests/unit/security-privacy-audit.test.ts`)**:
   - Invoking Selection capture (`Alt+Shift+S`) when no text is selected on the active webpage sets a warning badge (`!`) on the extension icon and returns a clear Polish message without opening an empty `editor.html` tab.
   - Inner-container pages where `window.scrollY` does not advance after Frame #1 terminate the full-page scroll loop cleanly without duplicating frames and always restore the DOM in `finally`.
   - Automated security & privacy audit verifies:
     - `public/manifest.json` and `dist/manifest.json` declare `manifest_version: 3` and only `["activeTab", "contextMenus", "scripting", "storage"]` (zero `<all_urls>`, zero `host_permissions`).
     - Compiled assets in `dist/` contain zero external network calls, CDNs, or analytics/telemetry endpoints.
     - Temporary `CaptureSession` records in IndexedDB (`SnapMarkDB.captures`) are purged immediately upon `editor.html` hydration (`0` remaining records).

2. **End-to-End Extension Verification Suite (`npm run test:e2e`) (`playwright.config.ts`, `vitest.e2e.config.ts`, `scripts/run-e2e.mjs`, `tests/e2e/extension.spec.ts`)**:
   - Verifies the compiled `./dist` extension package (`manifest.json`, `background.js`, `popup.html`, `editor.html`, `icons/icon-16..128.png`).
   - Verifies the `popup.html` flow (restricted `chrome://` detection, yellow highlight switch persistence in `chrome.storage.local`, and scroll progress cancellation via `Escape`).
   - Verifies the complete end-to-end capture -> IndexedDB `Blob` transfer -> `editor.html?captureId=<id>` hydration -> immediate IndexedDB purge -> vector **Strzałka** + handle dragging, `Shift`-locked **Zakreślacz** (`alpha = 0.35`), **Obrys** **Tekst** overlay, `Ctrl+Z` undo, `ClipboardItem` copy (`✓ Skopiowano!`), and flattened PNG download (`<domena>_YYYY-MM-DD_HH-mm.png`).

3. **Chrome Web Store Release Packager (`npm run package`), GitHub Actions CI & Final `README.md` (`scripts/package-extension.mjs`, `.github/workflows/ci.yml`, `README.md`, `tests/unit/release-package.test.ts`)**:
   - `npm run package` builds `./dist`, validates all required Manifest V3 entry points and PNG icons, and generates `snapmark-extension.zip` in the repository root.
   - `.github/workflows/ci.yml` runs `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`, and `npm run package` on Node.js 20.
   - `README.md` documents the complete v1 installation, all 4 capture modes, vector editor tools, keyboard shortcuts table, scripts, and packaging instructions.

## Completed Tasks

- `[x]` **023** — Harden PRD section 7 edge cases and add automated privacy, permissions and zero-network audit tests (`src/background/capture-orchestrator.ts`, `tests/unit/security-privacy-audit.test.ts`)
- `[x]` **024** — Implement end-to-end extension verification suite (`npm run test:e2e`) covering popup, capture transfer, vector editing and export (`playwright.config.ts`, `vitest.e2e.config.ts`, `scripts/run-e2e.mjs`, `tests/e2e/extension.spec.ts`)
- `[x]` **025** — Add Chrome Web Store release packager (`npm run package`), GitHub Actions CI workflow and final README documentation (`scripts/package-extension.mjs`, `.github/workflows/ci.yml`, `README.md`, `tests/unit/release-package.test.ts`)

## Exit Criteria Verification

- [x] Zestaw testów E2E (`npm run test:e2e`) przechodzi w 100% na zbudowanej paczce `./dist` (`tests/e2e/extension.spec.ts` — 3/3 scenariusze E2E na zielono).
- [x] Wszystkie sytuacje brzegowe z `PRD §7` (krawędzie viewportu przy marginesie 20 px, brak zaznaczenia tekstu, `MAX_CANVAS_HEIGHT`, strony `chrome://`, rate-limit backoff `>= 550 ms`) są pokryte testami i działają zgodnie ze specyfikacją (`tests/unit/security-privacy-audit.test.ts`).
- [x] Audyt potwierdza 0 zewnętrznych zapytań sieciowych, 0 zalegających rekordów w IndexedDB po otwarciu edytora oraz wyłącznie 4 uprawnienia w `manifest.json` (`activeTab`, `contextMenus`, `scripting`, `storage`) (`tests/unit/security-privacy-audit.test.ts`).
- [x] Skrypt `npm run package` generuje poprawny plik `snapmark-extension.zip`, a `README.md` opisuje instalację, użytkowanie i architekturę (`tests/unit/release-package.test.ts`).

## Spec Changes

- None — v1 implementation is 100% aligned with `.speccraft/docs/01-Idea.md` through `05-Tech-Stack.md`.
