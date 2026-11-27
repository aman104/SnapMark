# Task Report: 038 - Add interactive Crop tool to editor with annotation shifting, HiDPI cropped export and Ctrl+Z undo

- **Milestone**: M08
- **Task**: `038`
- **Status**: Completed (`[~]` ready for review)

## Summary of Changes
1. Added `cropOffsetCss` and `cropDraftRect` rendering to `src/editor/canvas-stage.ts` and `src/editor/exporter.ts` (cropping base screenshots/placedFrames via physical `ctx.translate` while keeping flattened export free of crop scrim overlays).
2. Added **Kadruj (`C`, `#tool-crop`)** button, contextual **Zastosuj (`Enter`)** / **Anuluj (`Escape`)** controls, drag-to-select crop box, annotation coordinate shifting (`-cropX, -cropY`), and geometry-aware `Ctrl+Z` undo in `src/editor/index.ts`.
3. Added `tests/unit/editor-crop-tool.test.ts`.
