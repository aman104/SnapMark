# Milestone Report: M04 - Complete features: Vector annotation editor, undo history and export

- **Milestone**: `M04` — Complete features: Vector annotation editor, undo history and export
- **Phase**: 5 — Complete features
- **Type**: feature
- **Status**: `[?]` Ready for operator review
- **Branch**: `milestone/M04-complete-features-vector-annotation-editor-undo-history-and-export`

## Summary of Delivered Capabilities

1. **Vector Annotation Engine & Endpoint Handle Geometry (`src/editor/vector-engine.ts`)**:
   - All annotations are stored in the vector object list `annotations: AnnotationItem[]` and rendered over the HiDPI base screenshot scaled by `devicePixelRatio`.
   - Implemented `hitTestEndpointHandle` (detecting `'start'` `(x1, y1)` and `'end'` `(x2, y2)` handles within a `10 px` CSS radius), `hitTestAnnotationBody` (top-down z-order hit-testing across arrows, lines/highlighters, and text), `applyShiftHorizontalLock` (`y2 = y1`), `updateAnnotationEndpoint`, and `moveAnnotationByDelta`.

2. **Narzędzie 1: Wektorowa Strzałka (`arrow`) (`src/editor/index.ts`, `src/editor/canvas-stage.ts`)**:
   - Single-drag creation on `#editor-canvas` with default Signal Red (`#FF3B30`), configurable thickness (`2px`, `4px`, `8px`), 6 colors, and proportional filled arrowhead.
   - Post-draw manipulation: clicking any arrow selects it and reveals draggable endpoint handles at `(x1, y1)` and `(x2, y2)` to redirect the arrowhead or tail independently, or drag the shaft to reposition the entire arrow.

3. **Narzędzie 2: Podkreślenie i zakreślacz 2-w-1 (`line`: `underline` | `highlighter`) (`src/editor/index.ts`, `src/editor/canvas-stage.ts`)**:
   - Supports **Podkreślenie** (`globalAlpha = 1.0`, thickness `2/4/8 px`) and **Zakreślacz** (`globalAlpha = 0.35`, height `24 px` CSS scaled by `dpr`).
   - Holding **`Shift`** during creation or endpoint handle dragging enforces a strict horizontal axis lock (`y2 = y1`).

4. **Narzędzie 3: Tekst (`text`) (`src/editor/text-overlay.ts`, `src/styles/editor.css`, `src/editor/index.ts`)**:
   - Clicking the canvas with the Text tool active (`3`) spawns an inline `<textarea id="active-text-input">` inside `#text-overlay-layer`; pressing `Enter` (without `Shift`) or clicking outside (`blur`) commits the `TextAnnotation`, while `Escape` cancels.
   - Double-clicking (`dblclick`) any existing `TextAnnotation` re-opens the inline `<textarea>` for in-place text editing, and dragging moves the text across the canvas.
   - Supports all 3 readability modes (**Tło** contrasting background pill, **Obrys** white/dark contrasting stroke around glyphs, and **Czysty** plain text).

5. **Narzędzie 4: Historia zmian (`Ctrl+Z` / `Delete`) i Spłaszczony Eksport (`src/editor/history.ts`, `src/editor/exporter.ts`)**:
   - Immutable `UndoHistoryStack` (`historyStack[]`) recording snapshots before creation, endpoint handle dragging, body moving, text editing, style changes, and deletion (`Delete` / `Backspace`), restorable via **„Cofnij”** or `Ctrl+Z` / `Cmd+Z`.
   - `createFlattenedExportCanvas` renders the base HiDPI capture and all vector annotations with `selectedId = null` (stripping blue selection outlines and endpoint handles), powering **„Pobierz PNG”** (`<domena>_YYYY-MM-DD_HH-mm.png`) and **„Kopiuj do schowka”** (`navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])` + 2-second `✓ Skopiowano!` state).

## Completed Tasks

- `[x]` **019** — Implement vector geometry, endpoint handle hit-testing, Shift axis lock and undo history stack (`src/editor/vector-engine.ts`, `src/editor/history.ts`, `tests/unit/vector-engine.test.ts`)
- `[x]` **020** — Implement interactive Arrow and 2-in-1 Line or Highlighter drawing and endpoint handle dragging on canvas (`src/editor/canvas-stage.ts`, `src/editor/index.ts`, `tests/unit/editor-drawing.test.ts`)
- `[x]` **021** — Implement interactive in-canvas Textarea overlay, double-click editing, dragging and 3 readability modes (`src/editor/text-overlay.ts`, `src/styles/editor.css`, `src/editor/index.ts`, `tests/unit/editor-text-tool.test.ts`)
- `[x]` **022** — Implement flattened HiDPI PNG download and ClipboardItem export without selection handles (`src/editor/exporter.ts`, `src/editor/index.ts`, `README.md`, `tests/unit/editor-exporter.test.ts`)

## Exit Criteria Verification

- [x] Wszystkie obiekty rysowane w edytorze są przechowywane w tablicy wektorowej `annotations[]`, a nie wypalane od razu na źródłowej bitmapie (`tests/unit/vector-engine.test.ts`, `tests/unit/editor-drawing.test.ts`).
- [x] Strzałka posiada domyślny kolor `#FF3B30`, obsługuje zmianę koloru i grubości oraz pozwala po narysowaniu przesuwać oba swoje końce `(x1, y1)` i `(x2, y2)` za pomocą uchwytów (`tests/unit/editor-drawing.test.ts`).
- [x] Narzędzie Podkreślenie i zakreślacz obsługuje oba podtryby, stosuje `globalAlpha = 0.35` dla zakreślacza i wymusza idealny poziom (`y2 = y1`) przy przytrzymaniu `Shift` (`tests/unit/editor-drawing.test.ts`).
- [x] Narzędzie Tekst pozwala umieścić, przesunąć i edytować pole tekstowe oraz przełączać kontrastowe tło i biały/kontrastowy obrys wokół liter (`tests/unit/editor-text-tool.test.ts`).
- [x] `Ctrl+Z` / `Cmd+Z` cofa kolejne operacje z historii, a `Delete` / `Backspace` usuwa zaznaczony obiekt (`tests/unit/editor-drawing.test.ts`, `tests/unit/editor-text-tool.test.ts`, `tests/unit/editor-toolbar.test.ts`).
- [x] „Pobierz PNG” pobiera spłaszczony obraz z nazwą `<domena>_YYYY-MM-DD_HH-mm.png`, a „Kopiuj do schowka” kopiuje `image/png` do schowka systemowego (`tests/unit/editor-exporter.test.ts`).
- [x] Testy jednostkowe silnika wektorowego, hit-testingu, historii `Ctrl+Z` i eksportera przechodzą: `npm run typecheck && npm test && npm run build` (23 pliki testowe, 82 testy na zielono).

## Spec Changes

- None — implementation matches `.speccraft/docs/02-General-PRD.md`, `.speccraft/docs/04-Interface-spec.md`, and `.speccraft/docs/05-Tech-Stack.md`.
