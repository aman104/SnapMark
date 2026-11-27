# Report — Task 045: Screen area selection parity with Crop tool

- **Status:** Completed
- **Branch:** `task/045-rework-m08-area-selection-crop-parity`

## Summary of Changes

1. **Full Crop-tool parity in `selectAreaOverlayInDom()` (`src/content/capture-injected.ts`):**
   - After dragging a screen area rectangle (`>= 8×8 px`), the selection stays active on the page for fine-tuning:
     - **8 resize handles** (4 corners + 4 edge midpoints) with directional cursors (`nwse-resize`, `nesw-resize`, `ns-resize`, `ew-resize`) and minimum `16×16 px` bounds clamped to the viewport.
     - **Drag-to-move** inside the selected rectangle (`grab` / `grabbing` cursor), preserving dimensions within viewport bounds.
     - **Live pixel dimensions pill** (`W × H px`) at the top-left of the selection box.
     - **Floating `Cancel` / `Apply` bar** at the bottom-right corner of the selection box (with viewport clamping), plus `Enter` to apply and `Escape` to cancel.
     - Guaranteed DOM cleanup before `captureVisibleTab()` runs.
2. **Updated tests (`tests/unit/content-area-overlay.test.ts`, `tests/e2e/chromium-workflow.mjs`):**
   - Verified 8 handles, drag-to-move, SE-corner resize, floating `Apply` confirmation, and real Chromium end-to-end area capture.

## Verification

- `npm run typecheck`: 0 errors
- `npm test`: 32 test files, 145 tests passed
- `npm run build`: passed
- `npm run test:e2e`: 4 Vitest E2E + 8 real Chromium workflows passed
- `npm run package`: `snapmark-extension.zip` (40 240 bytes)
