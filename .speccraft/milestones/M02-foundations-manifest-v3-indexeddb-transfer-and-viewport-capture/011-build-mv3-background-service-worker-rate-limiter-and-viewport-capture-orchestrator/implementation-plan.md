# Task 011: Build MV3 Background Service Worker, rate limiter and Viewport capture orchestrator

## 1. Summary
- **Task:** 011 - Build MV3 Background Service Worker, rate limiter and Viewport capture orchestrator - Create src/background/rate-limiter.ts, src/background/capture-orchestrator.ts and src/background/index.ts as defined in 02-General-PRD.md sections 4.3, 6.1, 6.2 and 7. Implement CaptureRateLimiter enforcing a minimum 550ms interval between captureVisibleTab calls with up to 3 automatic retries (600ms exponential backoff) on quota errors, register the 3 context menu items (capture-selection, capture-image, capture-viewport) and cleanupStaleCaptures on startup, handle keyboard commands and popup messages, and implement end-to-end Visible Viewport Capture (calling chrome.tabs.captureVisibleTab, converting to a PNG Blob, saving CaptureSession in IndexedDB and opening editor.html?captureId=<id>). The task is done when tests/unit/rate-limiter.test.ts and tests/unit/background-viewport.test.ts pass.
- **Milestone:** M02 - Foundations: Manifest V3, IndexedDB transfer and Viewport capture (type: foundation)
- **Type:** `job`, `integration`, `data`
- **Depends on:** 007, 008, 009, 010
- **Parallel:** `exclusive` — implements `src/background/rate-limiter.ts`, `src/background/capture-orchestrator.ts`, `src/background/index.ts` and updates `src/shared/types.ts` message contracts
- **Sources:** `02-General-PRD.md §4.3 "Tryb 3: Zrzut widocznego ekranu"`, `02-General-PRD.md §6.1–6.3`, `02-General-PRD.md §7 "Edge Cases"`, `05-Tech-Stack.md §4.1`

## 2. Goal
Implement the Manifest V3 Background Service Worker (`src/background/`), the `CaptureRateLimiter` (`>= 550 ms` spacing + retry backoff for `MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND`), context menu registration (`capture-selection`, `capture-image`, `capture-viewport`), startup IndexedDB garbage collection (`cleanupStaleCaptures`), and the complete end-to-end **Tryb 3: Widoczny ekran (Visible Viewport Capture)** pipeline from trigger to opening `editor.html?captureId=<id>`.

## 3. Scope
**In scope:**
- `src/background/rate-limiter.ts`:
  - `CaptureRateLimiter` class with configurable `minIntervalMs` (default `SCROLL_CAPTURE_THROTTLE_MS = 550`), `retryBaseDelayMs` (default `600`), and `maxRetries` (default `3`)
  - Enforces at least `550 ms` between consecutive `schedule(fn)` calls
  - Automatically catches `MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND` / quota errors and retries up to 3 times with backoff (`600 ms`, `1200 ms`, `1800 ms`)
- `src/background/capture-orchestrator.ts`:
  - `dataUrlToBlob(dataUrl: string): Blob` converting `data:image/png;base64,...` returned by `chrome.tabs.captureVisibleTab` into a binary `Blob` (`image/png`) without network `fetch` overhead
  - `registerContextMenus(): void` registering:
    - `id: 'capture-selection'`, `title: 'Zrób screena zaznaczenia'`, `contexts: ['selection']`
    - `id: 'capture-image'`, `title: 'Edytuj i pobierz obrazek'`, `contexts: ['image']`
    - `id: 'capture-viewport'`, `title: 'Zrób zrzut widocznego ekranu'`, `contexts: ['page']`
  - `captureVisibleViewport(tab?: chrome.tabs.Tab): Promise<CaptureSession>`:
    - Queries the active tab if not provided, validates URL with `isRestrictedBrowserUrl(tab.url)`
    - Reads viewport dimensions and `window.devicePixelRatio` from the active tab via `chrome.scripting.executeScript` (with safe fallback to `tab.width` / `tab.height` and `dpr = 1` if scripting is unavailable on a page)
    - Calls `chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' })` through `CaptureRateLimiter`
    - Converts data URL to PNG `Blob`, constructs `CaptureSession` (`id: cap_<timestamp>_<random>`, `mode: 'viewport'`, `sourceUrl`, `sourceDomain: normalizeDomainForFilename(sourceUrl)`, `capturedAt`, `dpr`, `frames: [{ blob, scrollYCss: 0, viewportWidthCss, viewportHeightCss }]`, `totalWidthCss`, `totalHeightCss`)
    - Saves session in IndexedDB via `saveCaptureSession(session)`
    - Opens `editor.html?captureId=${session.id}&mode=viewport` via `chrome.tabs.create`
- `src/background/index.ts`:
  - Wires `chrome.runtime.onInstalled` (`registerContextMenus()`, `cleanupStaleCaptures()`), `chrome.runtime.onStartup` (`cleanupStaleCaptures()`), `chrome.contextMenus.onClicked`, `chrome.commands.onCommand`, and `chrome.runtime.onMessage` (`{ type: 'TRIGGER_CAPTURE', mode: 'viewport' | ... }`)
- Unit tests in `tests/unit/rate-limiter.test.ts` and `tests/unit/background-viewport.test.ts`

**Out of scope:**
- Full DOM cropping for `capture-selection`, `capture-image`, and multi-frame scroll loop for `capture-fullpage` — Milestone M03

## 4. Current state and prerequisites
- Tasks 007 (`dpi.ts`, `filename.ts`, `url-guard.ts`), 008 (`settings.ts`), 009 (`db.ts`), and 010 (`manifest.json`, `vite.config.ts`) completed.

## 5. Implementation steps
1. Add runtime message contracts (`RuntimeCaptureRequest`, `RuntimeCaptureResponse`) to `src/shared/types.ts`.
2. Create `src/background/rate-limiter.ts` implementing `CaptureRateLimiter`.
3. Create `src/background/capture-orchestrator.ts` implementing `dataUrlToBlob`, `registerContextMenus`, `captureVisibleViewport`, and message/command routing.
4. Wire listeners in `src/background/index.ts` guarded by `typeof chrome !== 'undefined'`.
5. Create `tests/unit/rate-limiter.test.ts` verifying `>= 550 ms` throttling between consecutive calls and automatic retry with `600 ms` backoff when `MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND` is thrown.
6. Create `tests/unit/background-viewport.test.ts` verifying context menu registration, `captureVisibleViewport` execution against mocked Chrome APIs, `Blob` storage in `SnapMarkDB`, opening `editor.html?captureId=<id>`, and rejection of restricted `chrome://` URLs.

## 6. Files

| Path | Action (create / modify) | Purpose |
|---|---|---|
| `src/shared/types.ts` | modify | Add extension runtime message types (`RuntimeCaptureRequest`, `RuntimeCaptureResponse`) |
| `src/background/rate-limiter.ts` | create | `>= 550 ms` `captureVisibleTab` scheduler with exponential backoff retry |
| `src/background/capture-orchestrator.ts` | create | Context menu setup, `dataUrlToBlob`, and end-to-end Visible Viewport Capture |
| `src/background/index.ts` | modify | MV3 Service Worker event listeners (`onInstalled`, `onClicked`, `onCommand`, `onMessage`) |
| `tests/unit/rate-limiter.test.ts` | create | Unit tests for rate limiter spacing and quota retry backoff |
| `tests/unit/background-viewport.test.ts` | create | Unit tests for context menus and end-to-end Viewport capture to IndexedDB |

## 7. Contracts and data (if applicable)
- `RuntimeCaptureRequest`: `{ type: 'SNAPMARK_TRIGGER_CAPTURE'; mode: CaptureMode }`
- `RuntimeCaptureResponse`: `{ ok: true; captureId: string } | { ok: false; error: string }`

## 8. UI details (if applicable)
- Context menu titles (`02-General-PRD.md §4.1–4.3`):
  - `capture-selection`: **„Zrób screena zaznaczenia”**
  - `capture-image`: **„Edytuj i pobierz obrazek”**
  - `capture-viewport`: **„Zrób zrzut widocznego ekranu”**

## 9. Acceptance criteria
- [ ] TC-01: `CaptureRateLimiter` enforces `>= 550 ms` delay between consecutive calls and retries up to 3 times with `600 ms` base backoff on rate-limit errors.
- [ ] TC-02: `registerContextMenus()` registers `capture-selection`, `capture-image`, and `capture-viewport` with exact Polish titles and contexts.
- [ ] TC-03: `captureVisibleViewport()` captures the active tab via `chrome.tabs.captureVisibleTab`, converts the PNG DataURL to a `Blob`, stores the `CaptureSession` in `SnapMarkDB.captures`, and opens `editor.html?captureId=<id>&mode=viewport`.
- [ ] TC-04: `captureVisibleViewport()` refuses to capture restricted URLs (`chrome://`, Chrome Web Store) with a clear error message.
- [ ] TC-05: `npm run typecheck && npm test && npm run build` pass.

## 10. Tests to add or update
- `tests/unit/rate-limiter.test.ts`: Tests `>= 550 ms` call spacing and 3-attempt quota backoff retry.
- `tests/unit/background-viewport.test.ts`: Tests context menu registration, `dataUrlToBlob`, end-to-end `captureVisibleViewport` saving to IndexedDB and opening `editor.html`, and restricted URL rejection.

## 11. Verification
- Run from repository root:
  `npm run typecheck && npm test && npm run build`

## 12. Risks and notes
- Always call `chrome.contextMenus.removeAll()` before `chrome.contextMenus.create()` inside `registerContextMenus()` to prevent duplicate-ID warnings when the Service Worker reloads.
