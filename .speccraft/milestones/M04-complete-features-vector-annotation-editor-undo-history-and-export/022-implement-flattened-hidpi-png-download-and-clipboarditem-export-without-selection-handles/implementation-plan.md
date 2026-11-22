# Implementation Plan: 022 - Implement flattened HiDPI PNG download and ClipboardItem export without selection handles

- **Milestone**: M04 - Complete features: Vector annotation editor, undo history and export
- **Task**: `022` - Implement flattened HiDPI PNG download and ClipboardItem export without selection handles
- **Spec References**:
  - `.speccraft/docs/02-General-PRD.md` (§4.5 Narzędzie 4: Cofnij / Usuń oraz Eksport — Pobierz PNG & Kopiuj do schowka, §9 Konwencja nazewnictwa eksportowanych plików)
  - `.speccraft/docs/04-Interface-spec.md` (§5.2 Cluster 4: History & Export Actions)

## Goal & Scope

Create `src/editor/exporter.ts` and integrate it into `src/editor/index.ts` so clicking **„Pobierz PNG”** or **„Kopiuj do schowka”** flattens the base HiDPI screenshot and all vector `annotations[]` onto an offscreen/export canvas **with `selectedId = null`** (so blue selection outlines and endpoint handles are never baked into exported files or clipboard images), downloads `<znormalizowana-domena>_YYYY-MM-DD_HH-mm.png`, and writes an `image/png` `Blob` to the system clipboard via `navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])`.

## Files to Create / Modify

1. **Create `src/editor/exporter.ts`**:
   - `export function createFlattenedExportCanvas(metadata: MockCaptureMetadata, annotations: AnnotationItem[], baseImage: CanvasImageSource | null, placedFrames: PlacedFrameDrawable[]): HTMLCanvasElement`:
     - Creates an offscreen `HTMLCanvasElement` and calls `renderCanvasStage(exportCanvas, metadata, annotations, null, baseImage, placedFrames)` so `selectedId` is `null` (zero selection handles or dashed focus boxes in the exported image).
   - `export async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob>`:
     - Uses `canvas.toBlob((blob) => ..., 'image/png')` when available, with a dataURL/fallback `Blob` in JSDOM test environments.
   - `export async function exportFlattenedPngDownload(metadata: MockCaptureMetadata, annotations: AnnotationItem[], baseImage: CanvasImageSource | null, placedFrames: PlacedFrameDrawable[]): Promise<{ filename: string; blob: Blob }>`:
     - Renders the flattened canvas, generates the PNG `Blob`, and triggers an `<a download="${metadata.filename}">` click in browser environments.
   - `export async function exportFlattenedToClipboard(metadata: MockCaptureMetadata, annotations: AnnotationItem[], baseImage: CanvasImageSource | null, placedFrames: PlacedFrameDrawable[]): Promise<Blob>`:
     - Renders the flattened canvas, converts to a PNG `Blob`, and when `navigator.clipboard?.write` and `ClipboardItem` are available, writes `new ClipboardItem({ 'image/png': blob })` to the system clipboard.
2. **Modify `src/editor/index.ts`**:
   - Commit any active text overlay draft before exporting.
   - Wire `#btn-download-png` and `#btn-copy-clipboard` to `exportFlattenedPngDownload` and `exportFlattenedToClipboard` while preserving `options.onDownloadPng` callback hook and the 2-second `✓ Skopiowano!` (`is-success`) button state.
3. **Modify `README.md`**:
   - Update documentation to describe the completed Milestone M04 vector annotation tools (**Strzałka** with draggable handles, **Podkreślenie i zakreślacz** with `Shift` lock, **Tekst** with **Tło / Obrys / Czysty**, **Cofnij `Ctrl+Z` / `Delete`**, and flattened **Pobierz PNG / Kopiuj do schowka**).
4. **Create `tests/unit/editor-exporter.test.ts`**:
   - Test that `createFlattenedExportCanvas` renders at full physical Retina dimensions (`cssWidth * dpr` × `cssHeight * dpr`) and strips selection handles (`selectedId = null`).
   - Test that clicking `#btn-copy-clipboard` calls `navigator.clipboard.write` with a `ClipboardItem` containing `image/png` and transitions the button to `✓ Skopiowano!`.
   - Test that clicking `#btn-download-png` exports the flattened PNG with filename `<domena>_YYYY-MM-DD_HH-mm.png`.

## Acceptance Criteria & Verification

- `npm run typecheck && npm test && npm run build` passes with 0 errors.
