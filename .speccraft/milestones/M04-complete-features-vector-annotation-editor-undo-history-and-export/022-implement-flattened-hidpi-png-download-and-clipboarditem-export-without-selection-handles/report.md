# Task Report: 022 - Implement flattened HiDPI PNG download and ClipboardItem export without selection handles

- **Milestone**: M04 - Complete features: Vector annotation editor, undo history and export
- **Task**: `022` - Implement flattened HiDPI PNG download and ClipboardItem export without selection handles
- **Status**: Completed (`[~]` ready for review)
- **Branch**: `task/022-implement-flattened-hidpi-png-download-and-clipboarditem-export-without-selection-handles`

## Summary of Changes

1. **Flattened HiDPI Exporter (`src/editor/exporter.ts`)**:
   - Implemented `createFlattenedExportCanvas(metadata, annotations, baseImage, placedFrames)` which renders the base Retina capture and all vector `annotations[]` onto an offscreen canvas with `selectedId = null` so selection outlines and blue endpoint handles are never baked into exported files.
   - Implemented `canvasToPngBlob(canvas)`, `exportFlattenedPngDownload(...)` (downloading `<znormalizowana-domena>_YYYY-MM-DD_HH-mm.png`), and `exportFlattenedToClipboard(...)` (writing `image/png` `Blob` via `navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])`).
2. **Editor Toolbar Integration (`src/editor/index.ts`, `README.md`)**:
   - Wired `#btn-download-png` and `#btn-copy-clipboard` to commit any open inline text draft first and invoke `exportFlattenedPngDownload` / `exportFlattenedToClipboard`.
   - Updated `README.md` with M04 vector editor and export documentation.
3. **Unit Tests (`tests/unit/editor-exporter.test.ts`)**:
   - Verified physical Retina export dimensions (`1920×1160`), PNG download filename (`domena-pl_2026-11-21_14-10.png`), `navigator.clipboard.write` invocation with `image/png`, and `✓ Skopiowano!` feedback.

## Verification

- `npm run typecheck`: 0 errors
- `npm test`: 23 test files, 79 tests passed
- `npm run build`: Production bundle in `dist/` built cleanly
