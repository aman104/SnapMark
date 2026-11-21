# Task 013: Connect editor.html to IndexedDB Blob loading, immediate purge and clipboard/file input

## 1. Summary
- **Task:** 013 - Connect editor.html to IndexedDB Blob loading, immediate purge and clipboard/file input - Upgrade src/editor/canvas-stage.ts and src/editor/index.ts to read ?captureId=<id> on startup using consumeCaptureSession from src/shared/db.ts, decode the real captured PNG Blob onto #editor-canvas at native physical Retina resolution while immediately purging the IndexedDB record, persist toolbar style selections via src/shared/settings.ts, and implement live clipboard image paste (Ctrl+V / #btn-paste-clipboard reading image items from ClipboardEvent or navigator.clipboard.read) and local image file loading (#input-open-file) in the empty state. Update README.md with Chrome unpacked extension loading instructions. The task is done when tests/unit/editor-live-load.test.ts passes and npm run typecheck, npm test and npm run build succeed.
- **Milestone:** M02 - Foundations: Manifest V3, IndexedDB transfer and Viewport capture (type: foundation)
- **Type:** `ui`, `data`, `integration`
- **Depends on:** 006, 007, 008, 009, 011, 012
- **Parallel:** `exclusive` — updates `src/editor/canvas-stage.ts`, `src/editor/index.ts`, `README.md`, and completes all M02 exit criteria
- **Sources:** `02-General-PRD.md §4.3, §6.2, §6.3, §8, §10`, `04-Interface-spec.md §5.2 & §5.3`

## 2. Goal
Complete the end-to-end Milestone M02 pipeline in `editor.html`: when opened with `?captureId=<id>`, the editor consumes the `CaptureSession` from IndexedDB (`consumeCaptureSession`, which immediately deletes the temporary record from `SnapMarkDB`), decodes the captured PNG `Blob` onto `#editor-canvas` at physical Retina resolution (`width = cssWidth * dpr`), displays the real auto-generated filename (`<domain>_YYYY-MM-DD_HH-mm.png`) and dimensions in Cluster 1, persists toolbar tool/color/stroke/style changes to `chrome.storage.local` (`src/shared/settings.ts`), and supports real image loading from clipboard paste (`Ctrl+V`) or file picker (`#input-open-file`).

## 3. Scope
**In scope:**
- `src/editor/canvas-stage.ts`:
  - Support rendering a decoded bitmap/image (`ImageBitmap | HTMLImageElement | HTMLCanvasElement | null`) onto `#editor-canvas` in addition to the mock screenshot fallback when running without a real `Blob`
  - Helper `decodeBlobToDrawable(blob: Blob): Promise<{ drawable: CanvasImageSource | null; width: number; height: number }>` using `createImageBitmap` or `Image` + `URL.createObjectURL` (with safe fallback in JSDOM tests so `Blob` sessions load deterministically in Vitest)
- `src/editor/index.ts`:
  - Check URL search parameters for `captureId`:
    - If `captureId` is present, call `consumeCaptureSession(captureId)` from `src/shared/db.ts`
    - If the session is found: update `state.metadata` (`filename: formatCaptureFilename(session.sourceUrl, new Date(session.capturedAt))`, `cssWidth: session.totalWidthCss`, `cssHeight: session.totalHeightCss`, `dpr: session.dpr`, `mode: session.mode`), decode `session.frames[0].blob`, start with an empty or clean `annotations: []` array for real captures, and render the real image onto `#editor-canvas`
    - If `captureId` is not found in IndexedDB (e.g., user refreshed the tab after the temporary record was already purged for privacy), transition to `state.prototypeState = 'empty'` (`#editor-empty-state`, matching `04-Interface-spec.md §5.3`)
  - Load saved tool preferences (`activeTool`, `activeColor`, `strokeWidth`, `textStyleMode`) from `loadUserSettings()` on startup, and call `updateUserSettings(...)` whenever the user switches tool, color, stroke width, or text style mode
  - Implement live `#input-open-file` `change` listener and `paste` event / `navigator.clipboard.read` handler so users can load an actual PNG/JPG `File` or clipboard image `Blob` onto `#editor-canvas` from the empty state
- Updating `README.md` with step-by-step instructions for loading `dist/` as an unpacked extension in `chrome://extensions` and testing **Tryb 3: Widoczny ekran (Viewport)**
- Unit & integration tests in `tests/unit/editor-live-load.test.ts`

**Out of scope:**
- Cropping selection/image rects and multi-frame scroll stitching — Milestone M03
- Freehand drag creation of vector shapes on the canvas — Milestone M04

## 4. Current state and prerequisites
- Tasks 007–012 completed (`dpi.ts`, `filename.ts`, `url-guard.ts`, `settings.ts`, `db.ts`, `background/`, `popup/`).

## 5. Implementation steps
1. Update `src/editor/canvas-stage.ts` so `renderCanvasStage` accepts an optional `baseImage: CanvasImageSource | null` parameter and draws it via `ctx.drawImage(baseImage, 0, 0, physicalWidth, physicalHeight)` when present, falling back to `renderMockScreenshotBackdrop` when in prototype demo mode.
2. Add `decodeBlobToDrawable(blob: Blob, fallbackPhysicalWidth: number, fallbackPhysicalHeight: number)` in `src/editor/canvas-stage.ts`.
3. Update `src/editor/index.ts`:
   - Hydrate toolbar preferences from `loadUserSettings()` and persist changes via `updateUserSettings()`.
   - When `?captureId=<id>` is present in `initialSearch`, load the session via `consumeCaptureSession(captureId)`:
     - On hit: compute filename via `formatCaptureFilename(session.sourceUrl, new Date(session.capturedAt))`, set dimensions from `session.totalWidthCss`, `session.totalHeightCss`, `session.dpr`, decode `session.frames[0].blob`, and render onto `#editor-canvas`.
     - On miss (already purged): switch to `prototypeState = 'empty'` (`#editor-empty-state`).
   - Wire `#input-open-file` (`change` event reading `files[0]`) and window `paste` event (`clipboardData.items` image `Blob`) to load the image onto the stage.
4. Update `README.md` with Chrome *Load unpacked* (`dist/`) instructions and M02 verification steps.
5. Create `tests/unit/editor-live-load.test.ts` testing:
   - Saving a `CaptureSession` with a `Blob` in `SnapMarkDB`, initializing `initEditor(container, { initialSearch: '?captureId=cap_live_1' })`, verifying Cluster 1 shows the formatted domain filename and dimensions, and confirming `getCaptureSession('cap_live_1')` is now `null` (immediate purge);
   - Opening `initEditor(container, { initialSearch: '?captureId=cap_already_purged' })` transitions gracefully to `#editor-empty-state`;
   - Changing toolbar color/tool persists to `loadUserSettings()`.

## 6. Files

| Path | Action (create / modify) | Purpose |
|---|---|---|
| `src/editor/canvas-stage.ts` | modify | Support rendering real captured `Blob` bitmaps on `#editor-canvas` at physical Retina dimensions |
| `src/editor/index.ts` | modify | Consume `CaptureSession` from IndexedDB by `?captureId=`, persist settings via `settings.ts`, and handle file/clipboard image input |
| `README.md` | modify | Add Chrome `chrome://extensions` unpacked loading and M02 Viewport capture documentation |
| `tests/unit/editor-live-load.test.ts` | create | Integration tests for IndexedDB `Blob` loading, immediate record purge, expired `captureId` fallback, and settings persistence |

## 7. Contracts and data (if applicable)
- URL query parameter: `?captureId=<string>`.
- Consumes `CaptureSession` via `consumeCaptureSession(captureId)` from `src/shared/db.ts`.

## 8. UI details (if applicable)
- When a real capture is loaded via `?captureId=`, Cluster 1 displays the real `<normalized-domain>_YYYY-MM-DD_HH-mm.png` filename and `<totalWidthCss>×<totalHeightCss> • @<dpr>x` dimensions badge.
- If the user reloads `editor.html?captureId=<id>` after the temporary record was already deleted from IndexedDB, the editor displays the `#editor-empty-state` card explaining that temporary captures are purged immediately after loading for privacy.

## 9. Acceptance criteria
- [ ] TC-01: Opening `editor.html?captureId=<id>` loads the `CaptureSession` from `SnapMarkDB.captures`, displays the formatted filename and dimensions in Cluster 1, sizes `#editor-canvas` to `totalWidthCss * dpr` × `totalHeightCss * dpr`, and immediately deletes the record from `SnapMarkDB.captures`.
- [ ] TC-02: Opening `editor.html?captureId=<non-existent-id>` renders `#editor-empty-state` (*"Brak aktywnego zrzutu na płótnie"*).
- [ ] TC-03: Selecting a tool, color, stroke width, or text style mode in `editor.html` persists the preference in `chrome.storage.local` via `src/shared/settings.ts`.
- [ ] TC-04: All M01 prototype tests and new M02 tests pass (`npm run typecheck && npm test && npm run build`).

## 10. Tests to add or update
- `tests/unit/editor-live-load.test.ts`: Tests end-to-end IndexedDB `CaptureSession` consumption + immediate purge, missing `captureId` empty-state fallback, and toolbar settings persistence.

## 11. Verification
- Run from repository root:
  `npm run typecheck && npm test && npm run build`

## 12. Risks and notes
- Preserve synchronous initial rendering when no `captureId` is in the URL so existing M01 unit tests (`editor-toolbar.test.ts` and `editor-stage.test.ts`) continue to pass without modification.
