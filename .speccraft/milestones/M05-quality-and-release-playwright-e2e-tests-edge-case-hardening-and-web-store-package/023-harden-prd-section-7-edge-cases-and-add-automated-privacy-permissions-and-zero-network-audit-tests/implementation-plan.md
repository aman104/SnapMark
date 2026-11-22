# Implementation Plan: 023 - Harden PRD section 7 edge cases and add automated privacy, permissions and zero-network audit tests

- **Milestone**: M05 - Quality and release: Playwright E2E tests, edge-case hardening and Web Store package
- **Task**: `023` - Harden PRD section 7 edge cases and add automated privacy, permissions and zero-network audit tests
- **Spec References**:
  - `.speccraft/docs/02-General-PRD.md` (§7 Obsługa sytuacji brzegowych, §10 Wymagania niefunkcjonalne, §11 Ryzyka i ich mitygacja)

## Goal & Scope

Verify and harden all edge cases from `02-General-PRD.md §7` and add a dedicated automated audit test suite (`tests/unit/security-privacy-audit.test.ts`) checking Manifest V3 least-privilege permissions, zero external network/telemetry URLs in compiled `dist/` assets, immediate IndexedDB cleanup, and edge-case resilience.

## Files to Modify / Create

1. **Modify `src/background/capture-orchestrator.ts`**:
   - When `captureTextSelection` detects an empty selection (`!measurement.found || !measurement.rectCss`), set a temporary warning badge (`chrome.action.setBadgeText({ text: '!' })`) before returning `{ ok: false, error: 'Zaznacz fragment tekstu na stronie przed użyciem tego trybu.' }` without opening an empty `editor.html` tab.
2. **Create `tests/unit/security-privacy-audit.test.ts`**:
   - Verify `public/manifest.json` has `manifest_version: 3`, exact permissions `["activeTab", "contextMenus", "scripting", "storage"]`, no `host_permissions`, no `<all_urls>`, and no external `content_security_policy` origins.
   - Verify that all built JS/CSS/HTML files in `dist/` contain zero external network calls (`fetch('http...')`, `XMLHttpRequest`, Google Fonts, analytics/telemetry endpoints).
   - Verify all PRD §7 edge cases:
     - `Alt+Shift+S` / `captureTextSelection` with no text selected sets warning badge `'!'`, does not open `editor.html`, and returns the Polish error message.
     - Inner scrollable container page where `window.scrollY` stays at `0` on Frame #2 terminates full-page scroll cleanly after Frame #1 without duplicating frames and restores DOM state.
     - Extremely tall page (`> MAX_CANVAS_HEIGHT = 16384` physical px) caps frames cleanly and sets `exceededMaxHeight: true`.
     - `editor.html` immediately deletes the temporary `CaptureSession` from IndexedDB (`SnapMarkDB.captures` has 0 remaining records).

## Acceptance Criteria & Verification

- `npm run build && npm test` passes with all tests in `tests/unit/security-privacy-audit.test.ts` green.
