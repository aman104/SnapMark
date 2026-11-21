# Task Report: 023 - Harden PRD section 7 edge cases and add automated privacy, permissions and zero-network audit tests

- **Milestone**: M05 - Quality and release: Playwright E2E tests, edge-case hardening and Web Store package
- **Task**: `023` - Harden PRD section 7 edge cases and add automated privacy, permissions and zero-network audit tests
- **Status**: Completed (`[~]` ready for review)
- **Branch**: `task/023-harden-prd-section-7-edge-cases-and-add-automated-privacy-permissions-and-zero-network-audit-tests`

## Summary of Changes

1. **Empty Selection Warning Badge (`src/background/capture-orchestrator.ts`)**:
   - Updated `captureTextSelection()` so when invoked (e.g. via `Alt+Shift+S`) with no text selected on the page, it sets `setActionBadge('!')` before throwing `'Najpierw zaznacz fragment tekstu na stronie.'` without opening an empty `editor.html` tab.
2. **Automated Security, Privacy, Permissions & Edge-Case Audit (`tests/unit/security-privacy-audit.test.ts`)**:
   - Added 5 audit tests verifying:
     1. `public/manifest.json` declares `manifest_version: 3` and only `["activeTab", "contextMenus", "scripting", "storage"]` (zero `<all_urls>`, zero `host_permissions`).
     2. Compiled assets in `dist/` contain zero external network calls, Google Fonts, or analytics/telemetry endpoints.
     3. Empty selection (`Alt+Shift+S`) sets badge `'!'` and does not open an empty editor tab.
     4. Inner scrollable container pages where `window.scrollY` stays at `0` terminate full-page scroll cleanly after Frame #1 without duplicating frames and always run `restoreFullPageScrollInDom` in `finally`.
     5. Temporary IndexedDB `CaptureSession` records are purged immediately upon `editor.html` hydration.

## Verification

- `npm run typecheck`: 0 errors
- `npx vitest run tests/unit/security-privacy-audit.test.ts`: 5/5 tests passed
