# Implementation Plan: 038 - Add interactive Crop tool (crop) to editor with overlay frame, annotation shifting, HiDPI cropped export and Ctrl+Z undo

- **Milestone**: M08 - Feature: Clean viewport capture, fit-to-width editor, crop, step badges and freehand pen
- **Task**: `038`
- **Spec References**: `02-General-PRD.md` (`FR-11`), `04-Interface-spec.md` (`§9`)

## Changes
1. `src/editor/history.ts`: Extend undo snapshots to support optional editor view crop state (`activeCropRectCss` + `metadata` dimensions) alongside `annotations[]`, keeping full backward compatibility with `UndoHistoryStack`.
2. `src/editor/canvas-stage.ts` & `src/editor/exporter.ts`: Support an active user crop offset (`userCropRectCss?: CssRect | null`) when rendering base drawables/placedFrames and mock backdrop, plus rendering the interactive crop selection overlay (dimmed scrim + `#FF3B30` crop frame + dimension label) when `cropDraftRect` is active on stage (always omitted on flattened export).
3. `src/editor/index.ts`: Add **Kadruj (`C`, `#tool-crop`)** button in toolbar, contextual `#btn-apply-crop` (`Zastosuj`, `Enter`) and `#btn-cancel-crop` (`Anuluj`, `Escape`) controls, drag-to-select crop box on canvas, shifting all annotations by `(-crop.x, -crop.y)` on apply, resizing stage metadata to `(crop.width, crop.height)`, and pushing an undo snapshot so `Ctrl+Z` reverts the crop and annotation offsets.
4. Add `tests/unit/editor-crop-tool.test.ts`.
