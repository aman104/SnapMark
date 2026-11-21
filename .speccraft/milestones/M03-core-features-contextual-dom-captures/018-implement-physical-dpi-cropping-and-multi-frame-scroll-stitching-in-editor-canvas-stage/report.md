# Task Report: 018 - Implement physical DPI cropping and multi-frame scroll stitching in editor canvas stage

- **Milestone**: M03 - Core features: Contextual DOM captures (Selection, Image, Full-Page Scroll)
- **Task**: `018` - Implement physical DPI cropping and multi-frame scroll stitching in editor canvas stage
- **Status**: Completed (`[~]` ready for review)
- **Branch**: `task/018-implement-physical-dpi-cropping-and-multi-frame-scroll-stitching-in-editor-canvas-stage`

## Summary of Changes

1. **Physical DPI Cropping & Multi-Frame Scroll Stitching (`src/editor/canvas-stage.ts`)**:
   - Implemented `buildSessionCompositePlacements(session: CaptureSession)` which returns `FramePlacementPlan[]` containing physical source (`sx, sy, sw, sh`) and destination (`dx, dy, dw, dh`) coordinates scaled by `devicePixelRatio`.
   - For `selection` and `image` modes with `cropRectCss`, computes `multiplyRectByDpr(session.cropRectCss, dpr)` and maps the cropped region to `(0, 0, physicalCrop.width, physicalCrop.height)`.
   - For multi-frame `fullpage` mode, iterates through captured frames and computes seamless vertical placement offsets, slicing only the newly exposed bottom region (`overlapCss = coveredBottomCss - frameTopCss`) on partial final scroll steps to prevent seam duplication.
   - Updated `renderCanvasStage()` to draw `placedFrames: PlacedFrameDrawable[]` onto `<canvas id="editor-canvas">` before the vector annotation overlay pass.
2. **Editor Multi-Frame Hydration & Max-Height Warning (`src/editor/index.ts`)**:
   - Updated `hydrateFromStorageAndIndexedDb()` to compute `buildSessionCompositePlacements(session)`, decode all frame `Blob` objects in parallel via `decodeBlobToDrawable`, store `state.framePlacements`, and activate `state.prototypeState = 'max-height-warning'` when `session.exceededMaxHeight === true`.
3. **Popup Live Scroll Progress & Contextual Triggers (`src/popup/index.ts`)**:
   - Wired `#btn-capture-fullpage` and `#btn-capture-selection` to dispatch `SNAPMARK_TRIGGER_CAPTURE` runtime messages in the live Chrome Extension runtime while preserving dev/prototype navigation fallback.
   - Wired `#btn-cancel-scroll` and `Escape` during scroll capture to send `SNAPMARK_CANCEL_SCROLL_CAPTURE` to the background service worker.
   - Subscribed to `SNAPMARK_SCROLL_PROGRESS` messages on `chrome.runtime.onMessage` to dynamically update `currentFrame`, `totalFrames`, and `progressStatusText`.
4. **Documentation & Unit Tests (`README.md`, `tests/unit/editor-crop-stitch.test.ts`)**:
   - Updated `README.md` with walkthrough instructions for all 4 contextual capture modes.
   - Added 3 unit tests in `tests/unit/editor-crop-stitch.test.ts` verifying Retina `@2x` cropping, 3-frame stitching with a partial final frame, and full `initEditor` hydration from IndexedDB with immediate record deletion.

## Verification

- `npm run typecheck`: Passed (`tsc --noEmit`, 0 errors)
- `npm test`: Passed (19 test files, 69 tests passing)
- `npm run build`: Passed (Vite production bundle in `dist/`)
