# Implementation Plan: 027 - Orchestrate interactive area selection capture in Background Service Worker for popup and Alt+Shift+S

- **Milestone**: M06 - Feature: Interactive screen area selection overlay (Zaznacz fragment ekranu)
- **Task**: `027` - Orchestrate interactive area selection capture in Background Service Worker for popup and Alt+Shift+S
- **Spec References**:
  - `.speccraft/docs/07-feature-plan-interactive-area-selection.md`
  - `.speccraft/docs/02-General-PRD.md` (§4.1)

## Goal & Scope

Add `captureInteractiveArea()` to `src/background/capture-orchestrator.ts` and route popup `SNAPMARK_TRIGGER_CAPTURE` (`mode: 'selection'`) and keyboard shortcut `Alt+Shift+S` (`command: 'capture-selection'`) to launch the interactive screen area selection overlay on the active tab, while keeping the right-click context menu item (`menuItemId === 'capture-selection'` on `contexts: ['selection']`) routed to `captureTextSelection`.

## Files to Modify / Create

1. **Modify `src/background/capture-orchestrator.ts`**:
   - Import `selectAreaOverlayInDom` and `type AreaSelectionMeasurementResult` from `../content/capture-injected`.
   - Implement `export async function captureInteractiveArea(providedTab?: chrome.tabs.Tab, rateLimiter: CaptureRateLimiter = defaultCaptureRateLimiter, now: Date = new Date()): Promise<CaptureSession | null>`:
     - Resolves active tab and verifies URL is allowed (`assertTabUrlAllowed`).
     - Calls `chrome.scripting.executeScript({ target: { tabId: tab.id }, func: selectAreaOverlayInDom })`.
     - If `!result || result.cancelled || !result.cropRectCss`, returns `null` without calling `captureVisibleTab` or opening `editor.html`.
     - Otherwise captures the visible tab via `rateLimiter.schedule(...)`, saves the `CaptureSession` (`mode: 'selection'`, `cropRectCss: result.cropRectCss`, `totalWidthCss: result.cropRectCss.width`, `totalHeightCss: result.cropRectCss.height`, `dpr: normalizeDpr(result.dpr)`) to IndexedDB (`saveCaptureSession`), opens `editor.html?captureId=${session.id}`, and returns `session`.
2. **Modify `src/background/index.ts`**:
   - In `executeCaptureByMode`: for `mode === 'selection'`, call `captureInteractiveArea(tab)` (if cancelled / `null`, return `{ ok: false, error: 'Anulowano zaznaczanie obszaru.' }` without error badge).
   - In `handleContextMenuClick`: for `info.menuItemId === 'capture-selection'`, call `captureTextSelection(tab)` so right-clicking selected text on a webpage continues to capture the text selection with +20 px padding and optional yellow highlight.
3. **Create `tests/unit/background-area-capture.test.ts`**:
   - Test `captureInteractiveArea` saving the dragged `cropRectCss` in IndexedDB and opening `editor.html?captureId=<id>`.
   - Test `captureInteractiveArea` returning `null` and not calling `captureVisibleTab` or `chrome.tabs.create` when the user cancels with `Escape`.
   - Test `handleContextMenuClick` (`menuItemId: 'capture-selection'`) still invoking `measureSelectionInDom` for PPM text selection capture.

## Acceptance Criteria & Verification

- `npm run typecheck && npx vitest run tests/unit/background-area-capture.test.ts` passes with 0 errors.
