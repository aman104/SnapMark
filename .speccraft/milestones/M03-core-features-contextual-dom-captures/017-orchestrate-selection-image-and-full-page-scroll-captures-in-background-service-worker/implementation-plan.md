# Task 017: Orchestrate Selection, Image and Full-Page Scroll captures in Background Service Worker

## 1. Summary
- **Task:** 017 - Orchestrate Selection, Image and Full-Page Scroll captures in Background Service Worker - Upgrade src/background/capture-orchestrator.ts and src/background/index.ts to execute end-to-end Tryb 1 (Selection Capture), Tryb 2 (Image Capture) and Tryb 4 (Full-Page Scroll Capture) as specified in 02-General-PRD.md sections 4.1, 4.2, 4.4 and 7. For Selection and Image modes, inject the DOM measurement helpers, apply and clean up the optional yellow highlight in a try/finally block, capture the visible tab through CaptureRateLimiter, and store cropRectCss in CaptureSession. For Full-Page Scroll mode, drive the multi-frame scroll loop with >= 550ms rate-limited captureVisibleTab calls, hide fixed/sticky elements after Frame #1, cap physical height at MAX_CANVAS_HEIGHT (setting exceededMaxHeight: true when capped), update chrome.action.setBadgeText('k/N') and broadcast runtime progress messages, support cancellation (`SNAPMARK_CANCEL_SCROLL_CAPTURE`), and always restore page DOM state in a finally block. The task is done when tests/unit/background-contextual-captures.test.ts verifies all 3 modes, rate limiting, fixed/sticky cleanup, badge updates, and cancellation.
- **Milestone:** M03 - Core features: Contextual DOM captures (Selection, Image, Full-Page Scroll) (type: feature)
- **Type:** `job`, `integration`, `data`
- **Depends on:** 011, 014, 015, 016
- **Parallel:** `exclusive` — modifies `src/background/capture-orchestrator.ts`, `src/background/index.ts`, and `src/shared/types.ts`
- **Sources:** `02-General-PRD.md §4.1, §4.2, §4.4, §6.1–6.3, §7`, `04-Interface-spec.md §3 & §7.3`

## 2. Goal
Upgrade the Background Service Worker (`src/background/capture-orchestrator.ts` and `src/background/index.ts`) to orchestrate all 4 capture modes end-to-end: **Selection Capture** (with `selectionPaddingPx = 20`, optional yellow highlight, and guaranteed `finally` cleanup), **Image Capture** (`contexts: ['image']` passing `info.srcUrl` to `measureTargetImageInDom`), **Viewport Capture**, and **Full-Page Scroll Capture** (multi-frame loop throttled `>= 550 ms` via `CaptureRateLimiter`, hiding `fixed`/`sticky` elements after Frame #1, updating badge & progress messages, handling cancellation, and restoring DOM state in `finally`).

## 3. Scope
**In scope:**
- `src/shared/types.ts`:
  - `ScrollCaptureProgressMessage`: `{ type: 'SNAPMARK_SCROLL_PROGRESS'; currentFrame: number; totalFrames: number; statusText: string }`
  - `CancelScrollCaptureRequest`: `{ type: 'SNAPMARK_CANCEL_SCROLL_CAPTURE' }`
- `src/background/capture-orchestrator.ts`:
  - `captureTextSelection(providedTab?: chrome.tabs.Tab, rateLimiter?: CaptureRateLimiter, now?: Date): Promise<CaptureSession>`:
    - Loads user settings (`highlightSelectionBeforeCapture`, `selectionPaddingPx`) via `loadUserSettings()`
    - Runs `measureSelectionInDom` on the active tab via `chrome.scripting.executeScript`
    - Throws a clear Polish error (`"Najpierw zaznacz fragment tekstu na stronie."`) if `hasSelection === false`
    - In a `try / finally` block: captures the visible tab via `rateLimiter`, and always invokes `cleanupSelectionHighlightInDom` in `finally` if highlight was applied
    - Saves `CaptureSession` with `mode: 'selection'`, `cropRectCss`, `totalWidthCss: cropRectCss.width`, `totalHeightCss: cropRectCss.height` to IndexedDB and opens `editor.html?captureId=<id>&mode=selection`
  - `captureImageElement(srcUrl?: string, providedTab?: chrome.tabs.Tab, rateLimiter?: CaptureRateLimiter, now?: Date): Promise<CaptureSession>`:
    - Runs `measureTargetImageInDom(srcUrl)` on the active tab
    - Captures the visible tab via `rateLimiter`, saves `CaptureSession` with `mode: 'image'`, `cropRectCss`, `totalWidthCss: cropRectCss.width`, `totalHeightCss: cropRectCss.height` to IndexedDB, and opens `editor.html?captureId=<id>&mode=image`
  - `captureFullPageScroll(providedTab?: chrome.tabs.Tab, rateLimiter?: CaptureRateLimiter, now?: Date): Promise<CaptureSession>`:
    - Resets cancellation flag (`cancelActiveScrollCapture()` sets it to `true`)
    - Runs `prepareFullPageScrollInDom(MAX_CANVAS_HEIGHT)` on the active tab
    - Loops through `plan.frameOffsetsY`:
      - Updates extension badge (`chrome.action.setBadgeText({ text: `${i + 1}/${total}` })`, `setBadgeBackgroundColor({ color: '#FF3B30' })`) and broadcasts `SNAPMARK_SCROLL_PROGRESS`
      - For Frame `i > 0`: calls `hideFixedAndStickyElementsInDom()` (once before Frame #2) and `stepFullPageScrollInDom(offsetY)`
      - If `actualScrollY` fails to advance on Frame `i > 0` (internal SPA scroll container edge case from `05-Tech-Stack.md §7.3`), stops adding duplicate frames
      - Captures frame via `rateLimiter.schedule(() => chrome.tabs.captureVisibleTab(...))` (enforcing `>= 550 ms` between frames)
    - In `finally`: always calls `restoreFullPageScrollInDom` on the tab and clears the extension badge (`text: ''`)
    - If cancelled mid-loop, aborts without opening `editor.html`
    - Otherwise saves multi-frame `CaptureSession` (`mode: 'fullpage'`, `frames`, `totalWidthCss`, `totalHeightCss`, `exceededMaxHeight`) to IndexedDB and opens `editor.html?captureId=<id>&mode=fullpage`
- `src/background/index.ts`:
  - Passes `info.srcUrl` when `info.menuItemId === CONTEXT_MENU_IDS.IMAGE`
  - Handles `SNAPMARK_CANCEL_SCROLL_CAPTURE` messages
- Unit tests in `tests/unit/background-contextual-captures.test.ts`

**Out of scope:**
- Canvas physical cropping and multi-frame stitching inside `editor.html` — task 018

## 4. Current state and prerequisites
- Tasks 011 (`src/background/`), 014, 015, and 016 (`src/content/capture-injected.ts`) completed.

## 5. Implementation steps
1. Add `ScrollCaptureProgressMessage` and `CancelScrollCaptureRequest` to `src/shared/types.ts`.
2. Implement `captureTextSelection`, `captureImageElement`, `captureFullPageScroll`, and `cancelActiveScrollCapture` in `src/background/capture-orchestrator.ts`.
3. Update `handleCaptureTrigger(mode, tab, rateLimiter, options?: { srcUrl?: string })` and `src/background/index.ts` to route `'selection'`, `'image'`, `'viewport'`, and `'fullpage'` plus `SNAPMARK_CANCEL_SCROLL_CAPTURE`.
4. Create `tests/unit/background-contextual-captures.test.ts` verifying:
   - Selection capture with 20px padding, yellow highlight injection, and guaranteed `finally` cleanup even if `captureVisibleTab` throws;
   - Selection capture when nothing is selected returning `{ ok: false, error: 'Najpierw zaznacz fragment tekstu na stronie.' }`;
   - Image element capture passing `info.srcUrl` and storing `cropRectCss` in IndexedDB without `fetch`;
   - Full-page scroll capture capturing 3 frames with `>= 550 ms` spacing, hiding `fixed`/`sticky` headers after Frame #1, updating badge `1/3` -> `2/3` -> `3/3` -> `''`, and restoring DOM scroll position in `finally`;
   - Cancelling an in-progress full-page scroll capture via `cancelActiveScrollCapture()` restoring the page DOM without opening `editor.html`.

## 6. Files

| Path | Action (create / modify) | Purpose |
|---|---|---|
| `src/shared/types.ts` | modify | Add scroll progress and cancel message types |
| `src/background/capture-orchestrator.ts` | modify | Implement `captureTextSelection`, `captureImageElement`, `captureFullPageScroll`, and `cancelActiveScrollCapture` |
| `src/background/index.ts` | modify | Pass `info.srcUrl` for image context menu and handle scroll cancellation messages |
| `tests/unit/background-contextual-captures.test.ts` | create | Unit tests for Selection, Image, and Full-Page Scroll orchestration |

## 7. Contracts and data (if applicable)
- `captureTextSelection(tab?, rateLimiter?, now?): Promise<CaptureSession>`
- `captureImageElement(srcUrl?, tab?, rateLimiter?, now?): Promise<CaptureSession>`
- `captureFullPageScroll(tab?, rateLimiter?, now?): Promise<CaptureSession>`
- `cancelActiveScrollCapture(): void`

## 8. UI details (if applicable)
- Extension action badge displays `${currentFrame}/${totalFrames}` in Signal Red `#FF3B30` during full-page scroll capture and clears to `''` in `finally`.

## 9. Acceptance criteria
- [ ] TC-01: `captureTextSelection` measures the DOM selection, applies optional yellow highlight, stores `cropRectCss` in `CaptureSession`, and always runs highlight cleanup in `finally`.
- [ ] TC-02: `captureImageElement` resolves the clicked `<img>` via `srcUrl`, stores its `cropRectCss` in `CaptureSession`, and opens `editor.html?captureId=<id>&mode=image`.
- [ ] TC-03: `captureFullPageScroll` captures Frame #1 at `(0, 0)`, hides `fixed`/`sticky` elements before Frame #2, throttles each frame through `CaptureRateLimiter`, updates the extension badge, and restores DOM state in `finally`.
- [ ] TC-04: Calling `cancelActiveScrollCapture()` aborts the scroll loop, restores the webpage DOM, and does not open `editor.html`.
- [ ] TC-05: `npm run typecheck && npm test && npm run build` pass.

## 10. Tests to add or update
- `tests/unit/background-contextual-captures.test.ts`: Comprehensive tests for Selection, Image, Full-Page Scroll, error recovery, and cancellation.

## 11. Verification
- Run from repository root:
  `npm run typecheck && npm test && npm run build`

## 12. Risks and notes
- Always wrap DOM-mutating steps (`applyHighlight` and `prepareFullPageScrollInDom` / `hideFixedAndStickyElementsInDom`) in `try / finally` blocks inside the orchestrator so the target webpage is guaranteed to be restored even on errors or user cancellation.
