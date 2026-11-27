# Milestone Report: M08 - Feature: Clean viewport capture, fit-to-width editor, crop, step badges and freehand pen

- **Milestone**: `M08`
- **Phase**: 8+ — Evolution
- **Type**: feature
- **Status**: `[?]` Ready for operator review
- **Branch**: `milestone/M08-editor-ux-tools-and-clean-viewport`

## Summary of Delivered Improvements

1. **Czysty zrzut widocznego ekranu bez scrollbara (`FR-09`)** (`src/content/capture-injected.ts`, `src/background/capture-orchestrator.ts`):
   - `hideViewportScrollbarInDom()` tymczasowo ukrywa wizualnie paski przewijania (`scrollbar-width: none !important`, `::-webkit-scrollbar { display: none !important; }`) przed `captureVisibleTab()`, a `restoreViewportScrollbarInDom()` gwarantuje ich przywrócenie w bloku `finally`.
2. **Podgląd edytora dopasowany do szerokości bez poziomego scrolla (`FR-10`)** (`src/styles/editor.css`, `src/editor/canvas-stage.ts`, `src/editor/index.ts`):
   - Padding `.editor-stage` zmniejszono do `12px` (`overflow-x: hidden`), a podgląd `<canvas>` automatycznie skaluje się do szerokości okna (`computeFitToWidthScale`) przy zachowaniu 100% fizycznej rozdzielczości Retina i precyzyjnego mapowania współrzędnych myszy oraz nakładki tekstowej.
3. **Narzędzie Kadruj (`crop`, skrót `C`) (`FR-11`)** (`src/editor/index.ts`, `src/editor/canvas-stage.ts`, `src/editor/exporter.ts`):
   - Interaktywne zaznaczanie prostokąta kadrowania z przyciemnieniem tła i przyciskami **Zastosuj (`Enter`)** / **Anuluj (`Esc`)**, przesuwanie adnotacji o `(-cropX, -cropY)`, spłaszczony eksport wykadrowanego obrazu HiDPI oraz pełne cofanie kadrowania przez `Ctrl+Z`.
4. **Numerowane znaczniki kroków (`1`, `2`, `3`..., skrót `4`) (`FR-12`)** (`src/shared/types.ts`, `src/editor/vector-engine.ts`, `src/editor/canvas-stage.ts`, `src/editor/index.ts`):
   - Kliknięcie stawia kolejne ponumerowane kółko w wybranym kolorze tła z automatycznie kontrastową cyfrą (białą lub ciemną), z pełną obsługą przesuwania, zmiany koloru, `Ctrl+Z` i `Delete`.
5. **Pisak / rysowanie odręczne (`pen`, skrót `5`) (`FR-13`)** (`src/shared/types.ts`, `src/editor/vector-engine.ts`, `src/editor/canvas-stage.ts`, `src/editor/index.ts`):
   - Płynne rysowanie i zakreślanie odręczne myszą z wyborem koloru i grubości, obsługą zaznaczania, przesuwania, zmiany stylu, `Ctrl+Z` i `Delete`.
6. **Odwrócona kolejność grubości linii i domyślna gruba (`8px`) (`FR-14`)** (`src/shared/constants.ts`):
   - Kolejność w pasku: **Gruba (`8px`)** → **Średnia (`4px`)** → **Cienka (`2px`)**, domyślnie `8px`.
7. **Usunięcie przełącznika żółtego podświetlenia tekstu z popupu (`FR-15`)** (`src/popup/index.ts`):
   - Usunięto stopkę `#toggle-highlight` (*„Podświetl zaznaczony tekst na żółto / Tymczasowy marker przed zrzutem”*).
8. **Poprawki po recenzji M08 (Task `040`)**:
   - **Wyeliminowany efekt skakania/zoomowania płótna przy dodawaniu adnotacji**: `scrollbar-gutter: stable` w `.editor-stage` (`src/styles/editor.css`) oraz przerysowywanie bez przeładowywania `#editor-canvas` (`redrawCanvasOnly()` + `refreshToolbarOnly()` w `src/editor/index.ts`).
   - **Pisak z punktami końcowymi zamiast niebieskiej przerywanej ramki**: `drawPenAnnotation` w `src/editor/canvas-stage.ts` rysuje uchwyty punktu początkowego i końcowego tak jak w strzałce i linii.
   - **Same ikony narzędzi w pasku**: usunięto napisy tekstowe i etykiety skrótów z przycisków narzędzi (`#tool-arrow`..`#tool-crop`), zostawiając czytelne ikony SVG oraz angielskie `aria-label`/`title`.
   - **Domyślne ustawienia narzędzi**: **Line** domyślnie ma średnią grubość (`4px`), **Text** domyślnie tryb `Plain`, a **Arrow** i **Pen** pozostają grube (`8px`).
   - **Czysty przycisk `Undo`**: usunięto odznakę `Ctrl+Z` oraz licznik elementów do cofnięcia (`#undo-count`).
   - **Cały interfejs w języku angielskim**: przetłumaczono wszystkie teksty UI w popupie, edytorze, nakładce zaznaczania, menu kontekstowym, komunikatach błędów i `public/manifest.json`.

## Verification

- `npm run typecheck`: 0 errors
- `npm test`: **32 test files, 141 tests passed**
- `npm run build`: clean Vite build (`dist/`)
- `npm run test:e2e`: **4/4 Vitest E2E + 8/8 real Chromium extension workflows passed**
- `npm run package`: `snapmark-extension.zip` (36 887 bytes)
