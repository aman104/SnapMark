# Report — Task 043: Floating Crop Apply/Cancel buttons and draggable crop region

- **Status:** Completed
- **Branch:** `task/043-rework-m08-crop-floating-actions-and-move`

## Summary of Changes

1. **Floating Apply & Cancel buttons at bottom-right of crop area (`src/editor/index.ts`, `src/styles/editor.css`):**
   - Added `#crop-actions-overlay` inside `#canvas-wrapper` and `syncFloatingCropActions()` rendering `#crop-floating-actions` (`Cancel` + `Apply`) anchored to the bottom-right corner of the active crop rectangle (with viewport/canvas bounds clamping).
2. **Draggable crop region (`src/editor/index.ts`):**
   - Added `crop-move` interaction mode: hovering inside an existing crop rectangle shows the `grab` cursor; dragging inside repositions the crop rectangle within canvas bounds (preserving width and height) with `grabbing` cursor and live-updating the floating Apply/Cancel bar position.

## Verification

- `npm run typecheck`: 0 errors
- `npm test`: 32 test files, 144 tests passed
- `npm run build`: passed
- `npm run test:e2e`: 4 Vitest E2E + 8 real Chromium workflows passed
- `npm run package`: `snapmark-extension.zip` (38 295 bytes)
