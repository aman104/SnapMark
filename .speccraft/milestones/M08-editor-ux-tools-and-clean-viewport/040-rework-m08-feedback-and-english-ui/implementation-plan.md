# Implementation Plan: 040 - Rework M08 feedback (no zoom jump, pen handles, icon-only toolbar, defaults, clean Undo, English UI)

- **Milestone**: M08
- **Task**: `040`

## Changes
1. **Eliminate canvas zoom jump**: Add `scrollbar-gutter: stable;` to `.editor-stage` in `src/styles/editor.css` and compute `displayScale` consistently from `container.clientWidth` / `stage.clientWidth` so adding an annotation never shifts the canvas width.
2. **Pen start/end handles**: In `src/editor/canvas-stage.ts` (`drawPenAnnotation`), render `drawEndpointHandle` on the first and last point of the stroke instead of a dashed blue bounding box.
3. **Icon-only tool buttons**: In `src/editor/index.ts`, remove text `<span>` and `<kbd>` inside `#tool-arrow`, `#tool-line`, `#tool-text`, `#tool-step`, `#tool-pen`, `#tool-crop` while retaining accessible `aria-label` and `title`.
4. **Defaults**: Keep `arrow` / `pen` default thickness at `8px`, set `line` tool default thickness to `4px` (`Medium`), and set `DEFAULT_USER_SETTINGS.textStyleMode = 'plain'`.
5. **Clean Undo button**: Remove `<kbd>Ctrl+Z</kbd>` and `#undo-count` badge from `#btn-undo`.
6. **English UI copy**: Translate all UI labels, tooltips, buttons, banners, context menu titles, overlays, and error messages across `src/popup/index.ts`, `src/editor/index.ts`, `src/editor/text-overlay.ts`, `src/editor/exporter.ts`, `src/shared/constants.ts`, `src/content/capture-injected.ts`, `src/background/capture-orchestrator.ts`, and `public/manifest.json` to English, and update unit & E2E tests accordingly.
