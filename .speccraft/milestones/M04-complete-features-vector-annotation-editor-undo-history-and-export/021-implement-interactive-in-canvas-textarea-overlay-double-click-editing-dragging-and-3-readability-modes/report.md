# Task Report: 021 - Implement interactive in-canvas Textarea overlay, double-click editing, dragging and 3 readability modes

- **Milestone**: M04 - Complete features: Vector annotation editor, undo history and export
- **Task**: `021` - Implement interactive in-canvas Textarea overlay, double-click editing, dragging and 3 readability modes
- **Status**: Completed (`[~]` ready for review)
- **Branch**: `task/021-implement-interactive-in-canvas-textarea-overlay-double-click-editing-dragging-and-3-readability-modes`

## Summary of Changes

1. **In-Canvas Text Input Overlay (`src/editor/text-overlay.ts`, `src/styles/editor.css`)**:
   - Implemented `renderTextOverlayLayer()` spawning `#active-text-input.canvas-text-input` inside `#text-overlay-layer` positioned at `(draft.x, draft.y)` and styled with the active color and readability mode (`background`, `outline`, `plain`).
   - Handled `Enter` (without `Shift`) and `blur` to commit the text annotation, and `Escape` to cancel without saving.
2. **Editor Integration (`src/editor/index.ts`)**:
   - Clicking empty canvas space with the **Tekst (`3`)** tool active opens a new `ActiveTextEditorDraft`.
   - Double-clicking (`dblclick`) any existing `TextAnnotation` opens `#active-text-input` pre-filled with the annotation's text for in-place editing, pushing an undo snapshot on change.
   - Dragging any committed `TextAnnotation` translates it smoothly across the canvas with `Ctrl+Z` undo support.
3. **Unit Tests (`tests/unit/editor-text-tool.test.ts`)**:
   - Verified inline textarea spawning, `Enter`/`blur` commit, `Escape` cancellation, `dblclick` editing, readability mode switching (`background`, `outline`, `plain`), and dragging with `Ctrl+Z` undo.

## Verification

- `npm run typecheck`: 0 errors
- `npx vitest run tests/unit/editor-text-tool.test.ts`: 2/2 tests passed
