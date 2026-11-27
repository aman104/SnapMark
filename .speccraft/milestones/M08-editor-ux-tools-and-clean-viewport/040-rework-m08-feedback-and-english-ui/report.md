# Report — Task 040: Rework M08 feedback and English UI

- **Status:** Completed
- **Branch:** `task/040-rework-m08-feedback-and-english-ui`

## Summary of Changes

1. **Eliminated canvas zoom/jump when adding annotations:**
   - Added `scrollbar-gutter: stable;` to `.editor-stage` in `src/styles/editor.css` so scrollbar appearance never shifts available width.
   - Updated `handleCanvasMouseUp`, `step` placement in `handleCanvasMouseDown`, `setStrokeWidth`, and canvas selection click in `src/editor/index.ts` to call `redrawCanvasOnly(); refreshToolbarOnly();` instead of wiping and rebuilding `#editor-canvas`.
2. **Pen endpoint handles instead of dashed blue bounding box:**
   - Updated `drawPenAnnotation` in `src/editor/canvas-stage.ts` to draw start and end `drawEndpointHandle` circles (matching Arrow & Line) instead of a dashed bounding rectangle.
3. **Icon-only tool buttons:**
   - Removed text labels and shortcut `<kbd>` tags from `#tool-arrow`, `#tool-line`, `#tool-text`, `#tool-step`, `#tool-pen`, and `#tool-crop` in `src/editor/index.ts`, retaining accessible English `aria-label` and `title` tooltips.
4. **Line tool defaults to Medium (`4px`):**
   - Added `DEFAULT_LINE_STROKE_WIDTH = 4` in `src/shared/constants.ts` and `lineStrokeWidth` to `EditorState` in `src/editor/index.ts` so Line/Underline defaults to Medium (`4px`) while Arrow and Pen remain Thick (`8px`).
5. **Text tool defaults to Plain (`'plain'`):**
   - Updated `DEFAULT_USER_SETTINGS.textStyleMode` to `'plain'` in `src/shared/constants.ts`.
6. **Clean Undo button:**
   - Removed `<kbd>Ctrl+Z</kbd>` and `#undo-count` from `#btn-undo` in `src/editor/index.ts`, keeping icon + `Undo`.
7. **All UI copy translated to English:**
   - Translated all UI strings, tooltips, banners, error messages, context menu items, and `public/manifest.json` descriptions across `popup.html`, `editor.html`, `public/manifest.json`, `src/popup/index.ts`, `src/editor/index.ts`, `src/editor/text-overlay.ts`, `src/editor/exporter.ts`, `src/content/capture-injected.ts`, `src/background/capture-orchestrator.ts`, and `src/shared/constants.ts`.
   - Updated unit tests and E2E tests (including `tests/e2e/chromium-workflow.mjs`) and added `tests/unit/editor-m08-polish.test.ts`.

## Verification

- `npm run typecheck` — passed (0 errors)
- `npm test` — passed (32 test files, 141 tests)
- `npm run build` — passed
- `npm run test:e2e` — passed (4 Vitest E2E + 8 real Chromium extension workflows)
- `npm run package` — passed (`snapmark-extension.zip` built)
