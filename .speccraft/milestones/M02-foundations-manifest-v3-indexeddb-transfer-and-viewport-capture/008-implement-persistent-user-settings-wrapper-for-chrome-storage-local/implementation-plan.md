# Task 008: Implement persistent user settings wrapper for chrome.storage.local

## 1. Summary
- **Task:** 008 - Implement persistent user settings wrapper for chrome.storage.local - Create src/shared/settings.ts providing typed loadUserSettings, saveUserSettings and updateUserSettings functions backed by chrome.storage.local (with an automatic in-memory/localStorage fallback when running outside the extension context in dev or tests) for all preferences defined in 02-General-PRD.md section 8 (highlightSelectionBeforeCapture, selectionPaddingPx, activeTool, activeColor, strokeWidth, textStyleMode). Validate and sanitize stored values against DEFAULT_USER_SETTINGS so corrupted or partial keys never crash the UI. The task is done when tests/unit/settings.test.ts verifies saving, partial updating, default fallback and persistence across calls.
- **Milestone:** M02 - Foundations: Manifest V3, IndexedDB transfer and Viewport capture (type: foundation)
- **Type:** `data`, `infra`
- **Depends on:** 003
- **Parallel:** `safe` — touches only `src/shared/settings.ts` and `tests/unit/settings.test.ts`
- **Sources:** `02-General-PRD.md §8 "User Settings & Configuration"`, `05-Tech-Stack.md §3 "Storage (User Preferences)"`

## 2. Goal
Provide a resilient, strictly typed wrapper around `chrome.storage.local` (`src/shared/settings.ts`) that loads, validates, and updates all 6 user preferences (`highlightSelectionBeforeCapture`, `selectionPaddingPx`, `activeTool`, `activeColor`, `strokeWidth`, `textStyleMode`) with automatic fallback to `DEFAULT_USER_SETTINGS` and seamless operation in both Chrome Extension and local Vite dev / Vitest environments.

## 3. Scope
**In scope:**
- `src/shared/settings.ts`:
  - `SETTINGS_STORAGE_KEY = 'snapmark_user_settings'`
  - `sanitizeUserSettings(raw: Partial<Record<keyof UserSettings, unknown>> | null | undefined): UserSettings` validating each field against allowed values (`ANNOTATION_COLORS`, `STROKE_WIDTHS`, `'arrow' | 'line' | 'text'`, `'background' | 'outline' | 'plain'`, finite padding `0..100`) and falling back to `DEFAULT_USER_SETTINGS`
  - `loadUserSettings(): Promise<UserSettings>` reading from `chrome.storage.local.get(SETTINGS_STORAGE_KEY)` when `chrome?.storage?.local` is available, or `localStorage` / in-memory store otherwise
  - `saveUserSettings(settings: UserSettings): Promise<UserSettings>` writing sanitized settings
  - `updateUserSettings(patch: Partial<UserSettings>): Promise<UserSettings>` merging `patch` with current settings, saving, and returning the updated `UserSettings`
  - `resetUserSettings(): Promise<UserSettings>` resetting to `DEFAULT_USER_SETTINGS`
- Unit tests in `tests/unit/settings.test.ts` testing both a mocked `chrome.storage.local` implementation and the fallback storage, including corrupted data sanitization.

**Out of scope:**
- Wiring `loadUserSettings` / `updateUserSettings` into `popup.ts` and `editor.ts` — tasks 012 and 013

## 4. Current state and prerequisites
- `UserSettings` and `DEFAULT_USER_SETTINGS` exist in `src/shared/types.ts` and `src/shared/constants.ts`.

## 5. Implementation steps
1. Create `src/shared/settings.ts` with `sanitizeUserSettings`, `loadUserSettings`, `saveUserSettings`, `updateUserSettings`, and `resetUserSettings`.
2. Support `chrome.storage.local` (Promise API) when `typeof chrome !== 'undefined' && chrome.storage?.local` is present, with a clean fallback to `localStorage` / in-memory Map for standalone dev and unit tests.
3. Create `tests/unit/settings.test.ts` testing default loading, partial updates (`updateUserSettings({ highlightSelectionBeforeCapture: true })`), persistence across calls, `chrome.storage.local` mock integration, and sanitization of invalid/corrupted values.

## 6. Files

| Path | Action (create / modify) | Purpose |
|---|---|---|
| `src/shared/settings.ts` | create | Typed `chrome.storage.local` settings persistence and validation wrapper |
| `tests/unit/settings.test.ts` | create | Unit tests for loading, updating, sanitizing, and persisting user settings |

## 7. Contracts and data (if applicable)
- `loadUserSettings(): Promise<UserSettings>`
- `saveUserSettings(settings: UserSettings): Promise<UserSettings>`
- `updateUserSettings(patch: Partial<UserSettings>): Promise<UserSettings>`
- `sanitizeUserSettings(raw: unknown): UserSettings`

## 8. UI details (if applicable)
Not applicable (storage service layer).

## 9. Acceptance criteria
- [ ] TC-01: `loadUserSettings()` returns `DEFAULT_USER_SETTINGS` when storage is empty.
- [ ] TC-02: `updateUserSettings({ highlightSelectionBeforeCapture: true, activeColor: '#FFCC00' })` persists the change in `chrome.storage.local` (and fallback storage) and preserves all other fields.
- [ ] TC-03: `sanitizeUserSettings` rejects invalid colors, negative padding, or unknown tool names and falls back to the corresponding field in `DEFAULT_USER_SETTINGS`.
- [ ] TC-04: `npm run typecheck && npm test` pass with exit code `0`.

## 10. Tests to add or update
- `tests/unit/settings.test.ts`: Tests default settings, partial updates, corrupted value sanitization, and `chrome.storage.local` API integration.

## 11. Verification
- Run from repository root:
  `npm run typecheck && npm test`

## 12. Risks and notes
- Ensure `chrome.storage.local.get` and `chrome.storage.local.set` work whether the environment provides Promise-returning methods (MV3 standard) or callback-style mocks.
