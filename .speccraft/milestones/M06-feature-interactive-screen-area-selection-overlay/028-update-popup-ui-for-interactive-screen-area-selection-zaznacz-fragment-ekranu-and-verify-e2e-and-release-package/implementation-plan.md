# Implementation Plan: 028 - Update popup UI for interactive screen area selection ("Zaznacz fragment ekranu") and verify E2E and release package

- **Milestone**: M06 - Feature: Interactive screen area selection overlay (Zaznacz fragment ekranu)
- **Task**: `028` - Update popup UI for interactive screen area selection ("Zaznacz fragment ekranu") and verify E2E and release package
- **Spec References**:
  - `.speccraft/docs/07-feature-plan-interactive-area-selection.md`
  - `.speccraft/docs/04-Interface-spec.md` (§5.1)

## Goal & Scope

Update `src/popup/index.ts` so the third capture card (`#btn-capture-selection`) is labeled **„Zaznacz fragment ekranu”** (*„Włącz celownik i zaznacz kawałek strony”*) and is clickable on all normal web pages (closing the popup immediately so the user can drag the crosshair selection box on the page), while still supporting the `?state=no-selection` prototype URL state for visual testing. Update unit tests, E2E tests, and `README.md`.

## Files to Modify

1. **Modify `src/popup/index.ts`**:
   - Change Card #3 title to **„Zaznacz fragment ekranu”** with crosshair crop icon and subtitle *„Włącz celownik i zaznacz kawałek strony”* (when `?state=no-selection` is explicitly passed via URL query string for prototype preview, preserve the `is-disabled` preview class, while in live tab hydration keep `currentState = 'default'` on all normal web pages so the button is always enabled!).
   - In `selectionBtn` click handler: when `hasLiveRuntimeMessaging()` is true, send `{ type: 'SNAPMARK_TRIGGER_CAPTURE', mode: 'selection' }` and call `closePopupWindow()` immediately so the popup closes right away and the user can drag on the page!
2. **Modify `tests/unit/popup.test.ts`, `tests/e2e/extension.spec.ts`, and `README.md`**:
   - Update popup tests and E2E tests to verify **„Zaznacz fragment ekranu”** and the interactive area selection flow.
   - Update `README.md` to describe interactive screen area selection (`Zaznacz fragment ekranu` / `Alt+Shift+S`) alongside PPM text selection capture.

## Acceptance Criteria & Verification

- `npm run typecheck && npm test && npm run build && npm run test:e2e && npm run package` passes with 0 errors.
