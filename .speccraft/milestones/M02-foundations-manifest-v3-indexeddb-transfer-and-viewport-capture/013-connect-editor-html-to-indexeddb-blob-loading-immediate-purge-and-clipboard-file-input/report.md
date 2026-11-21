# Task 013 report: Connect editor.html to IndexedDB Blob loading, immediate purge and clipboard/file input

## Changes
- `src/editor/canvas-stage.ts`: added `decodeBlobToDrawable` (`createImageBitmap` / `HTMLImageElement` with JSDOM fallback) and updated `renderCanvasStage` to draw a real decoded bitmap `baseImage` onto `#editor-canvas` at physical Retina dimensions.
- `src/editor/index.ts`: connected `?captureId=<id>` to `consumeCaptureSession(captureId)` from `src/shared/db.ts` (reading the `Blob` session and immediately purging the IndexedDB record), formatted the filename via `formatCaptureFilename`, persisted toolbar style changes via `updateUserSettings()`, and implemented live clipboard paste (`paste` event & `navigator.clipboard.read`) and file loading (`#input-open-file`).
- `README.md`: added Chrome `chrome://extensions` unpacked loading and M02 Viewport capture instructions.
- `tests/unit/editor-live-load.test.ts`: added integration tests verifying IndexedDB `Blob` session loading, immediate record purge, expired `captureId` empty-state fallback, and settings persistence.

## Verification
- `npm run typecheck` — passed.
- `npm test` — 14 test files passed (51 tests total).
- `npm run build` — passed.
- TC-01 … TC-04: met.

## Deviations from the plan
- none

## Spec impact
- none

## Review fixes
- none

## Assumptions
- none

## Notes for next tasks
- All 7 tasks of Milestone M02 (`007`–`013`) are complete. Milestone M03 will extend `src/background/capture-orchestrator.ts` and `src/content/capture-injected.ts` with DOM selection cropping, `<img>` cropping, and full-page scroll stitching.
