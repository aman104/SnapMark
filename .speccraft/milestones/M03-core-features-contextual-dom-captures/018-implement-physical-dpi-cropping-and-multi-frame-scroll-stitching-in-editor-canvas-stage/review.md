# Independent Review: Task 018 - Implement physical DPI cropping and multi-frame scroll stitching in editor canvas stage

- **Decision**: APPROVED (`[x]`)
- **Milestone**: M03 - Core features: Contextual DOM captures (Selection, Image, Full-Page Scroll)
- **Reviewed Branch**: `task/018-implement-physical-dpi-cropping-and-multi-frame-scroll-stitching-in-editor-canvas-stage`

## Checklist Verification

1. **Plan & Acceptance Criteria**:
   - `buildSessionCompositePlacements(session)` in `src/editor/canvas-stage.ts` accurately computes physical pixel source (`sx, sy, sw, sh`) and destination (`dx, dy, dw, dh`) coordinates for both `selection`/`image` modes (`multiplyRectByDpr(session.cropRectCss, dpr)`) and multi-frame `fullpage` mode (including partial final scroll step overlap calculation `overlapCss = coveredBottomCss - frameTopCss`).
   - `hydrateFromStorageAndIndexedDb()` in `src/editor/index.ts` decodes all frame `Blob` objects, sets `state.prototypeState = 'max-height-warning'` when `session.exceededMaxHeight` is `true`, and immediately deletes the session from IndexedDB (`consumeCaptureSession`).
   - `src/popup/index.ts` dispatches `SNAPMARK_TRIGGER_CAPTURE` for `fullpage` and `selection` in the live Chrome Extension runtime, updates progress state on `SNAPMARK_SCROLL_PROGRESS`, and sends `SNAPMARK_CANCEL_SCROLL_CAPTURE` on cancel button or `Escape`.
2. **Tests & Build**:
   - `npm run typecheck`: 0 errors.
   - `npm test`: 19 test files, 69 tests passing (including `tests/unit/editor-crop-stitch.test.ts`).
   - `npm run build`: Production bundle in `dist/` builds cleanly.
