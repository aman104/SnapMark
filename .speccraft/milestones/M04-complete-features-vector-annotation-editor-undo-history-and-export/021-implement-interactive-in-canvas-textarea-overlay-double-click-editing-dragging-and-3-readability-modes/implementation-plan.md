# Implementation Plan: 021 - Implement interactive in-canvas Textarea overlay, double-click editing, dragging and 3 readability modes

- **Milestone**: M04 - Complete features: Vector annotation editor, undo history and export
- **Task**: `021` - Implement interactive in-canvas Textarea overlay, double-click editing, dragging and 3 readability modes
- **Spec References**:
  - `.speccraft/docs/02-General-PRD.md` (§4.5 Narzędzie 3: Tekst — z kontrastowym tłem lub obrysem)
  - `.speccraft/docs/04-Interface-spec.md` (§5.2 & §6.1 In-Canvas Text Input Overlay)

## Goal & Scope

Implement the interactive in-canvas `<textarea>` overlay (`src/editor/text-overlay.ts`) inside `#text-overlay-layer` so users can click anywhere on the screenshot with the **Tekst (`3`)** tool to type an annotation, commit with `Enter` (without `Shift`) or `blur`, cancel with `Escape`, double-click any existing text annotation to edit its text in place, drag text annotations across the canvas, and switch between the 3 readability modes (**Tło** `background`, **Obrys** `outline`, **Czysty** `plain`).

## Files to Create / Modify

1. **Create `src/editor/text-overlay.ts`**:
   - `export interface ActiveTextEditorDraft { id: string | null; x: number; y: number; text: string; color: AnnotationColor; fontSize: number; styleMode: TextStyleMode; }`
   - Helper functions to render and bind the inline `<textarea id="active-text-input" class="canvas-text-input">` inside `#text-overlay-layer`, styled with the active color and readability mode (`background`, `outline`, `plain`), handling `Enter` (commit), `Escape` (cancel), and `blur` (commit if non-empty).
2. **Modify `src/editor/index.ts`**:
   - When `state.activeTool === 'text'` and the user clicks on empty canvas space, open an inline text editor draft at `(cssX, cssY)`.
   - When the user double-clicks (`dblclick`) any existing `TextAnnotation` on `#editor-canvas`, open the inline text editor pre-filled with that annotation's text, position, color, and `styleMode`.
   - On commit: if creating a new text item with non-empty trimmed text, push an undo snapshot, append the `TextAnnotation` to `state.annotations`, and select it; if editing an existing text item, push an undo snapshot and update its text (or delete if cleared).
   - Expose `commitActiveTextDraft()` / `cancelActiveTextDraft()` cleanly and ensure switching tools or clicking outside commits any non-empty draft.
3. **Create `tests/unit/editor-text-tool.test.ts`**:
   - Test clicking the canvas with the Text tool active (`3`) spawns `#active-text-input` inside `#text-overlay-layer`, typing text and pressing `Enter` commits a `TextAnnotation` with the active color and `styleMode`.
   - Test pressing `Escape` cancels the draft without adding an annotation.
   - Test double-clicking an existing `TextAnnotation` opens `#active-text-input` with its current text, edits it on `Enter`, and supports `Ctrl+Z` undo back to the previous text.
   - Test switching readability modes (`background`, `outline`, `plain`) on a selected `TextAnnotation` and dragging it across the canvas.

## Acceptance Criteria & Verification

- `npm run typecheck && npm test` passes with all tests in `tests/unit/editor-text-tool.test.ts` green.
