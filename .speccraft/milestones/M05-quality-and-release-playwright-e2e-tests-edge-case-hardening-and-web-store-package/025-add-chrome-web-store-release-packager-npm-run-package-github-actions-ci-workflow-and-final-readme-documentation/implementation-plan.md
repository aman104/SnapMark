# Implementation Plan: 025 - Add Chrome Web Store release packager (npm run package), GitHub Actions CI workflow and final README documentation

- **Milestone**: M05 - Quality and release: Playwright E2E tests, edge-case hardening and Web Store package
- **Task**: `025` - Add Chrome Web Store release packager (npm run package), GitHub Actions CI workflow and final README documentation
- **Spec References**:
  - `.speccraft/docs/05-Tech-Stack.md` (§4 Build, Bundling & Packaging & CI/CD)
  - `.speccraft/milestones.md` (M05 Demo & Exit Criteria)

## Goal & Scope

Create the Chrome Web Store `.zip` release packaging script (`scripts/package-extension.mjs`, `npm run package`), the GitHub Actions CI pipeline (`.github/workflows/ci.yml`), release package unit tests (`tests/unit/release-package.test.ts`), and finalize `README.md`.

## Files to Create / Modify

1. **Create `scripts/package-extension.mjs` and update `package.json`**:
   - Add `"package": "npm run build && node scripts/package-extension.mjs"` in `package.json`.
   - `scripts/package-extension.mjs` validates that `dist/manifest.json`, `dist/background.js`, `dist/popup.html`, `dist/editor.html`, and `dist/icons/icon-{16,32,48,128}.png` exist, then creates `snapmark-extension.zip` in the repository root (using system `zip -r` with a pure Node.js ZIP builder fallback so it works on any OS/CI container without external dependencies).
2. **Create `.github/workflows/ci.yml`**:
   - GitHub Actions workflow on `push` and `pull_request` (Node.js 20) running `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`, and `npm run package`.
3. **Update `.gitignore` and `README.md`**:
   - Add `snapmark-extension.zip` to `.gitignore` so running `npm run package` leaves `git status` clean while generating `snapmark-extension.zip` on disk for the operator.
   - Update `README.md` with the complete v1 guide (all 5 milestones completed, E2E test command `npm run test:e2e`, Chrome Web Store packaging command `npm run package`, keyboard shortcuts table, and architecture overview).
4. **Create `tests/unit/release-package.test.ts`**:
   - Test that `scripts/package-extension.mjs` validates `dist/` and produces a valid ZIP archive (`snapmark-extension.zip` starting with PK magic bytes `0x50 0x4b 0x03 0x04` and containing `manifest.json`, `background.js`, `popup.html`, `editor.html`).

## Acceptance Criteria & Verification

- `npm run typecheck && npm test && npm run build && npm run test:e2e && npm run package` exits with code `0` and produces `snapmark-extension.zip`.
