# Task 012: Connect popup.html to live Chrome APIs, storage settings and Viewport trigger

## 1. Summary
- **Task:** 012 - Connect popup.html to live Chrome APIs, storage settings and Viewport trigger - Upgrade src/popup/index.ts to query the active browser tab on open (detecting restricted chrome:// and Chrome Web Store URLs via isRestrictedBrowserUrl and checking active text selection via chrome.scripting.executeScript when available), load and persist highlightSelectionBeforeCapture via src/shared/settings.ts, and trigger live Visible Viewport Capture via chrome.runtime.sendMessage to the Background Service Worker while preserving URL query state overrides (?state=...) for dev and test inspection. The task is done when popup unit tests verify live Chrome message dispatch, restricted tab detection and persistent highlight settings.
- **Milestone:** M02 - Foundations: Manifest V3, IndexedDB transfer and Viewport capture (type: foundation)
- **Type:** `ui`, `integration`
- **Depends on:** 004, 007, 008, 011
- **Parallel:** `safe` — touches only `src/popup/index.ts` and `tests/unit/popup.test.ts`
- **Sources:** `02-General-PRD.md §4.3, §6.1, §7, §8`, `04-Interface-spec.md §5.1 & §7.4`

## 2. Goal
Upgrade `src/popup/index.ts` from a purely static prototype into the live Chrome Extension popup controller: it loads and saves `highlightSelectionBeforeCapture` in `chrome.storage.local` (`src/shared/settings.ts`), inspects the active tab URL with `isRestrictedBrowserUrl` (showing `#restricted-banner` automatically on `chrome://` or Chrome Web Store pages), checks whether the active tab has selected text, and dispatches `SNAPMARK_TRIGGER_CAPTURE` (`mode: 'viewport'`) to the Background Service Worker when the user clicks **"Widoczny ekran"**.

## 3. Scope
**In scope:**
- `src/popup/index.ts`:
  - Preserves explicit URL query state overrides (`?state=default|no-selection|progress|restricted`) so all M01 prototype demos and tests continue working
  - On initialization, loads persisted `UserSettings` via `loadUserSettings()` and reflects `highlightSelectionBeforeCapture` in `#toggle-highlight` (`aria-checked`)
  - When `#toggle-highlight` is clicked, persists the updated boolean via `updateUserSettings({ highlightSelectionBeforeCapture })`
  - When running in the Chrome extension environment (without an explicit `?state=` override), queries `chrome.tabs.query({ active: true, currentWindow: true })`:
    - If `isRestrictedBrowserUrl(activeTab.url)` is `true`, automatically switches to `'restricted'` state (`#restricted-banner`)
    - Otherwise optionally checks active text selection via `chrome.scripting.executeScript` and updates `#btn-capture-selection` state (`'default'` vs `'no-selection'`)
  - When `#btn-capture-viewport` is clicked:
    - If `chrome.runtime?.sendMessage` is available (and no custom `onNavigate` test spy was injected), sends `{ type: 'SNAPMARK_TRIGGER_CAPTURE', mode: 'viewport' }` to the Background Service Worker and closes the popup window (`window.close()`) once the editor tab opens
    - Falls back to `navigate('editor.html?mode=viewport')` in standalone Vite dev server mode
- Expanding `tests/unit/popup.test.ts` to test live `chrome.storage.local` persistence of `#toggle-highlight`, automatic restricted-tab detection on `chrome://extensions`, and `chrome.runtime.sendMessage` dispatch for `#btn-capture-viewport`

**Out of scope:**
- Live DOM cropping for selection/fullpage modes — Milestone M03

## 4. Current state and prerequisites
- Tasks 004 (`src/popup/index.ts`), 007 (`url-guard.ts`), 008 (`settings.ts`), and 011 (`background/`) completed.

## 5. Implementation steps
1. Update `src/popup/index.ts` to integrate `loadUserSettings`, `updateUserSettings`, `isRestrictedBrowserUrl`, active tab detection (`chrome.tabs.query`), and `chrome.runtime.sendMessage({ type: 'SNAPMARK_TRIGGER_CAPTURE', mode: 'viewport' })`.
2. Ensure synchronous initial render still occurs immediately so there is zero layout flicker, followed by asynchronous hydration of settings and active tab status.
3. Add unit tests in `tests/unit/popup.test.ts` verifying:
   - `#toggle-highlight` persists `highlightSelectionBeforeCapture` across popup re-renders via `src/shared/settings.ts`;
   - opening the popup when the active Chrome tab URL is `chrome://extensions` automatically renders `#restricted-banner`;
   - clicking `#btn-capture-viewport` in an extension environment dispatches `{ type: 'SNAPMARK_TRIGGER_CAPTURE', mode: 'viewport' }` via `chrome.runtime.sendMessage`.

## 6. Files

| Path | Action (create / modify) | Purpose |
|---|---|---|
| `src/popup/index.ts` | modify | Connect popup UI to `settings.ts`, `url-guard.ts`, `chrome.tabs.query`, and `chrome.runtime.sendMessage` |
| `tests/unit/popup.test.ts` | modify | Add tests for persistent highlight toggle, restricted tab auto-detection, and live Viewport capture message |

## 7. Contracts and data (if applicable)
- Dispatches `RuntimeCaptureRequest`: `{ type: 'SNAPMARK_TRIGGER_CAPTURE', mode: 'viewport' }`.

## 8. UI details (if applicable)
- No visual changes to the approved `03-Design.md` layout; connects live extension state to existing DOM elements.

## 9. Acceptance criteria
- [ ] TC-01: Toggling `#toggle-highlight` persists `highlightSelectionBeforeCapture` via `updateUserSettings()`, and re-mounting `renderPopup` loads the saved setting.
- [ ] TC-02: When `chrome.tabs.query` returns a tab with `url: 'chrome://extensions'`, `renderPopup` automatically switches to the `'restricted'` state and shows `#restricted-banner`.
- [ ] TC-03: Clicking `#btn-capture-viewport` when `chrome.runtime.sendMessage` is available sends `{ type: 'SNAPMARK_TRIGGER_CAPTURE', mode: 'viewport' }`.
- [ ] TC-04: All existing M01 `?state=...` popup tests continue to pass.

## 10. Tests to add or update
- `tests/unit/popup.test.ts`: Adds 3 new tests for persistent settings, automatic restricted tab detection, and `chrome.runtime.sendMessage` viewport trigger.

## 11. Verification
- Run from repository root:
  `npm run typecheck && npm test && npm run build`

## 12. Risks and notes
- When `?state=` is explicitly present in `initialSearch`, honor the query parameter over `chrome.tabs.query` so dev preview URLs (`?state=default`, `?state=progress`, etc.) remain deterministic.
