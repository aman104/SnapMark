# Task 018: Implement physical DPI cropping and multi-frame scroll stitching in editor canvas stage

## 1. Summary
- **Task:** 018 - Implement physical DPI cropping and multi-frame scroll stitching in editor canvas stage - Upgrade src/editor/canvas-stage.ts and src/editor/index.ts to crop Selection and Image captures using cropRectCss multiplied by dpr and to stitch multi-frame Full-Page Scroll captures onto a single physical Retina canvas as specified in 02-General-PRD.md sections 4.1, 4.2, 4.4, 6.2 and 7. Compute the exact physical deltaY offset for the final partial scroll frame so the bottom of the page stitches without seam duplication, and automatically display #max-height-banner when CaptureSession.exceededMaxHeight is true. Connect popup.html (#btn-capture-selection and #btn-capture-fullpage) to trigger live background captures, listen to live scroll progress messages, and cancel active scroll captures via #btn-cancel-scroll or Escape. Update README.md with walkthrough instructions for all 4 capture modes. The task is done when tests/unit/editor-crop-stitch.test.ts passes and npm run typecheck, npm test and npm run build succeed.
- **Milestone:** M03 - Core features: Contextual DOM captures (Selection, Image, Full-Page Scroll) (type: feature)
- **Type:** `ui`, `data`, `integration`
- **Depends on:** 013, 017
- **Parallel:** `exclusive` — updates `src/editor/canvas-stage.ts`, `src/editor/index.ts`, `src/popup/index.ts`, `README.md`, and completes all M03 exit criteria
- **Sources:** `02-General-PRD.md §4.1, §4.2, §4.4, §6.2, §7`, `04-Interface-spec.md §3, §5.1, §5.2, §7.3, §7.4, §8`

## 2. Goal
Complete the end-to-end delivery of all 4 capture modes in `editor.html` and `popup.html`:
1. When `editor.html` loads a `CaptureSession` with `cropRectCss` (`selection` or `image` mode), it crops the exact physical pixel rectangle (`cropX = Math.round(cropRectCss.x * dpr)`, `cropY = Math.round(cropRectCss.y * dpr)`, `cropW = Math.round(cropRectCss.width * dpr)`, `cropH = Math.round(cropRectCss.height * dpr)`) onto the base canvas stage.
2. When `editor.html` loads a multi-frame `CaptureSession` (`fullpage` mode), it stitches every frame at its exact physical vertical offset `destY = Math.round(frame.scrollYCss * dpr)` so overlapping final frames align seamlessly without duplicate content, and shows `#max-height-banner` if `session.exceededMaxHeight === true`.
3. `popup.html` dispatches live `SNAPMARK_TRIGGER_CAPTURE` for `selection` and `fullpage` modes, displays real-time `SNAPMARK_SCROLL_PROGRESS` frame updates, and dispatches `SNAPMARK_CANCEL_SCROLL_CAPTURE` on Cancel / `Escape`.

## 3. Scope
**In scope:**
- `src/editor/canvas-stage.ts`:
  - `buildSessionCompositePlacements(session: CaptureSession): FramePlacementPlan[]` computing exact physical source/destination `drawImage` rectangles (`sx, sy, sw, sh, dx, dy, dw, dh`) for:
    - Cropped single-frame captures (`selection` and `image` using `multiplyRectByDpr(session.cropRectCss, session.dpr)`)
    - Full-viewport single-frame captures (`viewport`)
    - Multi-frame stitched scroll captures (`fullpage`, placing each frame at `dy = Math.round(frame.scrollYCss * session.dpr)`, so a partial final frame naturally overwrites or clips without duplicating the overlap region)
  - Rendering `FramePlacementPlan[]` with decoded frame drawables onto `#editor-canvas`
- `src/editor/index.ts`:
  - Decode all frames in `session.frames` and pass their placements to `renderCanvasStage`
- `src/popup/index.ts`:
  - Connect `#btn-capture-selection` and `#btn-capture-fullpage` to `chrome.runtime.sendMessage({ type: 'SNAPMARK_TRIGGER_CAPTURE', mode })` when running in the extension environment
  - Listen to `chrome.runtime.onMessage` for `SNAPMARK_SCROLL_PROGRESS` to update `currentFrame`, `totalFrames`, and `#scroll-progress-text` live
  - Send `{ type: 'SNAPMARK_CANCEL_SCROLL_CAPTURE' }` when `#btn-cancel-scroll` or `Escape` is pressed during scroll capture
- `README.md`:
  - Document walkthrough instructions for all 4 capture modes in Chrome
- Unit tests in `tests/unit/editor-crop-stitch.test.ts`

**Out of scope:**
- Freehand interactive creation/dragging of vector annotations on the canvas — Milestone M04

## 4. Current state and prerequisites
- Tasks 014–017 completed.

## 5. Implementation steps
1. Implement `FramePlacementPlan` and `buildSessionCompositePlacements(session: CaptureSession)` in `src/editor/canvas-stage.ts` and update `renderCanvasStage` to draw placed/cropped frames via 9-argument `ctx.drawImage(drawable, sx, sy, sw, sh, dx, dy, dw, dh)`.
2. Update `src/editor/index.ts` to decode all frames in `session.frames`, compute `buildSessionCompositePlacements(session)`, and render them onto `#editor-canvas`.
3. Update `src/popup/index.ts` so `#btn-capture-selection` and `#btn-capture-fullpage` send `SNAPMARK_TRIGGER_CAPTURE` in extension mode, `#btn-cancel-scroll` / `Escape` sends `SNAPMARK_CANCEL_SCROLL_CAPTURE`, and `SNAPMARK_SCROLL_PROGRESS` messages update the progress bar dynamically.
4. Update `README.md` with instructions for testing all 4 capture modes.
5. Create `tests/unit/editor-crop-stitch.test.ts` testing:
   - Retina `@2x` physical pixel crop placement for `selection` and `image` modes (`sx = x * 2`, `sy = y * 2`, `sw = width * 2`, `sh = height * 2`);
   - Multi-frame `fullpage` stitching placement including a partial final scroll frame (`scrollYCss = 0, 900, 1350` for a `2250px` page with `900px` viewport at `@2x` DPR);
   - End-to-end `initEditor` loading a cropped `selection` session and a multi-frame `fullpage` session with `exceededMaxHeight: true` from IndexedDB.

## 6. Files

| Path | Action (create / modify) | Purpose |
|---|---|---|
| `src/editor/canvas-stage.ts` | modify | Add `buildSessionCompositePlacements` and physical DPI cropping & multi-frame stitching |
| `src/editor/index.ts` | modify | Decode multi-frame / cropped sessions from IndexedDB and render composite placements |
| `src/popup/index.ts` | modify | Connect selection/fullpage triggers, live progress listener, and scroll cancellation message |
| `README.md` | modify | Document all 4 contextual capture modes |
| `tests/unit/editor-crop-stitch.test.ts` | create | Unit & integration tests for physical DPI cropping and multi-frame stitching |

## 7. Contracts and data (if applicable)
- `FramePlacementPlan`: `{ frameIndex: number; sx: number; sy: number; sw: number; sh: number; dx: number; dy: number; dw: number; dh: number }`
- `buildSessionCompositePlacements(session: CaptureSession): FramePlacementPlan[]`

## 8. UI details (if applicable)
- When `session.exceededMaxHeight === true`, `#max-height-banner` is shown automatically in `editor.html`.

## 9. Acceptance criteria
- [ ] TC-01: `buildSessionCompositePlacements` multiplies `cropRectCss` by `session.dpr` for `selection` and `image` captures (`sx = x * dpr`, `sy = y * dpr`, `sw = width * dpr`, `sh = height * dpr`, `dx = 0`, `dy = 0`).
- [ ] TC-02: `buildSessionCompositePlacements` computes seamless physical offsets for multi-frame `fullpage` captures, including partial final scroll steps (`deltaY < viewportHeightCss`), with zero duplicated overlap pixels.
- [ ] TC-03: Loading a `fullpage` `CaptureSession` with `exceededMaxHeight: true` in `editor.html` sizes `#editor-canvas` to the stitched dimensions, displays `#max-height-banner`, and immediately purges the IndexedDB record.
- [ ] TC-04: `npm run typecheck && npm test && npm run build` pass with exit code `0`.

## 10. Tests to add or update
- `tests/unit/editor-crop-stitch.test.ts`: Tests physical DPI crop coordinates, partial final frame stitching math, and end-to-end IndexedDB session rendering in `editor.html`.

## 11. Verification
- Run from repository root:
  `npm run typecheck && npm test && npm run build`

## 12. Risks and notes
- For a partial final scroll frame where `scrollYCss` advanced by less than `viewportHeightCss` (e.g., Frame 2 at `scrollY = 900`, Frame 3 at `scrollY = 1350` with `viewportHeight = 900`), the non-overlapping bottom slice of Frame 3 starts at `sy = (viewportHeight - deltaY) * dpr` and is drawn at `dy = (prevScrollY + viewportHeight) * dpr` (or Frame 3 is drawn at `dy = 1350 * dpr`), ensuring the final canvas height is `(1350 + 900) * dpr = 2250 * dpr` without seam artifacts.
