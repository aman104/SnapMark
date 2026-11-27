# Report — Task 042: Rework M08 crop dimensions, tool deselect, text alignment, and step editing

- **Status:** Completed
- **Branch:** `task/042-rework-m08-crop-text-step-edit`

## Summary of Changes

1. **Live crop pixel dimensions (`src/editor/canvas-stage.ts`, `src/editor/index.ts`):**
   - Rendered a dark pixel-dimension pill (`W × H px`) directly on the crop overlay rectangle and live-updated `#crop-dimensions-label` + `#btn-apply-crop` during `mousemove`.
2. **Never auto-select existing annotation on tool switch (`src/editor/index.ts`):**
   - `setTool()` now always clears `state.selectedAnnotationId = null`.
3. **Aligned text input & committed canvas text (`src/styles/editor.css`):**
   - Added `box-sizing: border-box`, `line-height: 1.15`, and `transform: translate(-11.5px, -8px)` to `.canvas-text-input` so typed text aligns pixel-for-pixel with `ctx.fillText(item.text, item.x, item.y)` on commit/blur.
4. **Universal click-off deselection (`src/editor/index.ts`):**
   - Clicking empty canvas now deselects any active annotation across all tools (`arrow`, `line`, `text`, `step`, `pen`), and pressing `Escape` also clears selection.
5. **Editable step number (`src/editor/index.ts`, `src/styles/editor.css`):**
   - Added `#step-number-control` (`−`, numeric input `1..99`, `+`) in Cluster 3 when a `StepAnnotation` is selected, with Undo history support and double-click on a step badge focusing the input.

## Verification

- `npm run typecheck`: 0 errors
- `npm test`: 32 test files, 143 tests passed
- `npm run build`: passed
- `npm run test:e2e`: 4 Vitest E2E + 8 real Chromium workflows passed
- `npm run package`: `snapmark-extension.zip` (37 769 bytes)
