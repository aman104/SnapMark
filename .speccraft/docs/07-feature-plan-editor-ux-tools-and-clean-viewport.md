# Feature Plan: Editor UX, New Annotation Tools (Steps, Pen, Crop) & Clean Viewport Capture

## 1. Overview

Zestaw 7 usprawnień ergonomii przechwytywania i edytora adnotacji zgłoszonych przez użytkownika po zamknięciu `M07`:

1. **Czysty zrzut widocznego ekranu bez paska przewijania** — tymczasowe ukrycie scrollbara strony na czas `captureVisibleTab()` w trybie `viewport` i natychmiastowe przywrócenie w bloku `finally`.
2. **Brak poziomego scrolla w podglądzie edytora (Fit-to-Width)** — redukcja marginesów sceny `.editor-stage` oraz automatyczne skalowanie podglądu `<canvas>` do dostępnej szerokości okna (przy zachowaniu 100% fizycznej rozdzielczości Retina podczas rysowania i eksportu PNG).
3. **Kadrowanie (Crop) zrzutu w edytorze** — interaktywne narzędzie przycinania gotowego zrzutu bezpośrednio w `editor.html` (z cofaniem `Ctrl+Z` i przesunięciem istniejących adnotacji).
4. **Numerowane znaczniki kroków (`1`, `2`, `3`, `4`...)** — narzędzie wstawiające kliknięciem ponumerowane kółka z wybranym kolorem tła i automatycznym kontrastowym numerem do instrukcji krok po kroku.
5. **Odwrócona kolejność grubości linii/strzałek i domyślna gruba (`8px`)** — kolejność w pasku: `Gruba (8px)` → `Średnia (4px)` → `Cienka (2px)`, domyślnie `8px`.
6. **Pisak / rysowanie odręczne (`pen`)** — swobodne zakreślanie i rysowanie ręczne na zrzucie z wyborem koloru i grubości oraz pełną obsługą zaznaczania, przesuwania i `Ctrl+Z`.
7. **Usunięcie przełącznika „Podświetl zaznaczony tekst na żółto / Tymczasowy marker przed zrzutem”** — uproszczenie `popup.html` i usunięcie zbędnej opcji z interfejsu.

## 2. Impact analysis

- **Affected code:**
  - `src/content/capture-injected.ts` — dodanie samowystarczalnych funkcji `hideViewportScrollbarInDom()` i `restoreViewportScrollbarInDom()`.
  - `src/background/capture-orchestrator.ts` — użycie ukrywania scrollbara w `captureVisibleViewport()` z gwarantowanym przywróceniem w `finally`; wyłączenie nakładania żółtego podświetlenia w `captureTextSelection()`.
  - `src/popup/index.ts` & `src/styles/popup.css` — usunięcie stopki `<footer class="popup-footer">` z przełącznikiem `#toggle-highlight` (*„Podświetl zaznaczony tekst na żółto / Tymczasowy marker przed zrzutem”*).
  - `src/shared/types.ts` & `src/shared/constants.ts` — rozszerzenie `EditorTool` o `'step' | 'pen' | 'crop'`, dodanie `StepAnnotation` i `PenAnnotation` do `AnnotationItem`, odwrócenie `STROKE_WIDTHS` na `[8, 4, 2]`, zmiana `DEFAULT_USER_SETTINGS.strokeWidth` na `8`.
  - `src/shared/settings.ts` — akceptacja nowych narzędzi (`'step' | 'pen'`) i bezpieczna kompatybilność wsteczna z istniejącymi wpisami w `chrome.storage.local`.
  - `src/styles/editor.css`, `src/editor/canvas-stage.ts`, `src/editor/vector-engine.ts`, `src/editor/history.ts`, `src/editor/exporter.ts`, `src/editor/index.ts`:
    - skalowanie podglądu `<canvas>` do dostępnej szerokości okna (`fit-to-width`, minimalny padding `12px`, zero poziomego scrolla) wraz z przeliczaniem współrzędnych wskaźnika (`clientX/Y` → współrzędne logiczne CSS płótna) i nakładki tekstowej `#text-overlay-layer`,
    - renderowanie, hit-testing, przesuwanie i eksport `StepAnnotation` (kółka `1, 2, 3...` z automatycznym kontrastem tekstu i auto-inkrementacją numeru) oraz `PenAnnotation` (gładkie ścieżki odręczne `points[]`),
    - interaktywny tryb kadrowania (`crop`) z prostokątem wycinka, akcjami `Zastosuj` (`Enter`) / `Anuluj` (`Escape`) oraz zapisem stanu przed kadrowaniem w historii `UndoHistoryStack` (aby `Ctrl+Z` cofało również przycięcie!).
  - `tests/unit/` & `tests/e2e/` — nowe testy jednostkowe i aktualizacja istniejących testów (`popup.test.ts`, `editor-toolbar.test.ts`, `settings.test.ts`, testy dla `step`, `pen`, `crop`, ukrywania scrollbara i fit-to-width).
- **Data and schema changes:**
  - Brak zmian migracyjnych w IndexedDB (`SnapMarkDB.captures`).
  - `UserSettings` zachowuje kompatybilność wsteczną przy odczycie z `chrome.storage.local` (stare klucze są bezpiecznie ignorowane/sanitizowane).
- **API / contract changes:**
  - Rozszerzenie unii `EditorTool` i `AnnotationItem` w `src/shared/types.ts`.
  - `UndoHistoryStack` przechowuje migawkę `{ annotations, cropBounds }` (lub kompatybilny wrapper), aby `Ctrl+Z` mogło cofnąć zarówno adnotacje, jak i kadrowanie obrazu.
- **Risks:**
  - Przeliczanie współrzędnych przy przeskalowanym podglądzie `<canvas>` (`displayScale < 1`): mitygacja przez jedną wspólną funkcję `getCanvasCssPoint()` używającą `rect.width` i `metadata.cssWidth` oraz testy jednostkowe przy `displayScale = 0.5`.
  - Ukrywanie scrollbara na stronach z `overflow: scroll` może chwilowo poszerzyć layout: użycie `scrollbar-width: none !important` + `::-webkit-scrollbar { display: none !important; }` ukrywa sam pasek wizualnie bez zmiany pozycji scrolla i z gwarantowanym usunięciem `<style>` w `finally`.

## 3. Specification changes

| Document | Section | Change |
|---|---|---|
| `.speccraft/docs/02-General-PRD.md` | `§4.1`, `§4.3`, `§4.5`, `§6.3`, `§8`, `§12` | Dodanie wymagań `FR-09`..`FR-15` (`editor-ux-tools-and-clean-viewport`): ukrywanie scrollbara w Viewport (`FR-09`), podgląd fit-to-width bez poziomego scrolla (`FR-10`), kadrowanie w edytorze (`FR-11`), numerowane kółka kroków 1,2,3... (`FR-12`), pisak odręczny (`FR-13`), domyślna gruba linia `8px` i kolejność `8/4/2` (`FR-14`), usunięcie opcji żółtego podświetlenia tekstu z popupu (`FR-15`). |
| `.speccraft/docs/04-Interface-spec.md` | `§5.1`, `§5.2` | Usunięcie sekcji stopki z przełącznikiem `#toggle-highlight` w `popup.html`; dodanie narzędzi **Kroki (`4`)**, **Pisak (`5`)** i **Kadruj (`C`)** do paska narzędzi `editor.html`, odwróconej kolejności grubości (`8px / 4px / 2px`) oraz zasad skalowania podglądu bez poziomego scrolla. |

## 4. Implementation outline

1. **Capture & Popup Cleanup (Task 1)**:
   - `hideViewportScrollbarInDom` / `restoreViewportScrollbarInDom` w `src/content/capture-injected.ts` + wywołanie w `captureVisibleViewport()` (`finally`).
   - Usunięcie przełącznika *„Podświetl zaznaczony tekst na żółto”* z `src/popup/index.ts`.
   - Odwrócenie `STROKE_WIDTHS` na `[8, 4, 2]` i zmiana domyślnej grubości na `8` w `src/shared/constants.ts`.
2. **Fit-to-Width Stage & Coordinate Mapping (Task 2)**:
   - Zmniejszenie paddingu `.editor-stage` w `src/styles/editor.css` i automatyczne skalowanie podglądu `#editor-canvas` (oraz `#text-overlay-layer`) do szerokości sceny bez poziomego scrolla, przy zachowaniu natywnej rozdzielczości fizycznej eksportu.
3. **Numbered Step Badges (`1, 2, 3...`) & Freehand Pen Tool (Task 3)**:
   - Rozszerzenie `src/shared/types.ts`, `src/editor/vector-engine.ts`, `src/editor/canvas-stage.ts` i `src/editor/index.ts` o narzędzia **Kroki (`step`, `4`)** i **Pisak (`pen`, `5`)** z pełną obsługą rysowania, zaznaczania, przesuwania, zmiany koloru/grubości i `Ctrl+Z`.
4. **Interactive Editor Crop Tool (Task 4)**:
   - Dodanie narzędzia **Kadruj (`crop`, `C`)** w `src/editor/index.ts` i `src/editor/canvas-stage.ts` (przeciąganie obszaru kadrowania, `Zastosuj` / `Enter`, `Anuluj` / `Escape`, przesunięcie adnotacji, spłaszczony eksport wykadrowanego obrazu i cofanie `Ctrl+Z`).
5. **Verification & Release Package (Task 5)**:
   - Aktualizacja testów jednostkowych, E2E i przebudowa paczki `dist/` oraz `snapmark-extension.zip`.

## 5. Rollback and safety

- Zmiany zrealizowane jako osobny kamień milowy `M08` na gałęzi `milestone/M08-editor-ux-tools-and-clean-viewport`, mergowany jednym commitem `--no-ff` do `main`. W razie potrzeby pełny rollback jednym `git revert -m 1`.

## 6. Milestone(s)

- `## [ ] M08 - Feature: Clean viewport capture, fit-to-width editor, crop, step badges and freehand pen`
