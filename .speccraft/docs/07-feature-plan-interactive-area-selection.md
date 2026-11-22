# Feature Plan: Interactive Screen Area Selection (Zaznaczony fragment ekranu)

## 1. Overview

Użytkownik zgłosił zmianę zachowania trzeciego trybu przechwytywania w `popup.html`:
> *"Zaznaczony fragment tekstu" to ma być funkcja zaznaczenia fragmentu ekranu, tj. włączam tą opcję i mogę zaznaczyć kawałek strony, który ma być zrobiony screen.*

Zamiast wymagać wcześniejszego zaznaczenia tekstu w DOM przed otwarciem popupu (gdzie karta była wyszarzona w stanie `no-selection`), karta w popupie (**„Zaznacz fragment ekranu”**, skrót `Alt+Shift+S`) staje się **zawsze aktywna** na zwykłych stronach WWW. Po jej kliknięciu popup zamyka się, a na aktywnej karcie strony wstrzykiwana jest lekka, pełnoekranowa nakładka z celownikiem (`cursor: crosshair`), pozwalająca użytkownikowi przeciągnąć myszą dowolny prostokątny obszar strony (`mousedown` → `mousemove` z żywym podglądem ramki i wymiarów `W × H px` → `mouseup`). Po puszczeniu przycisku myszy nakładka natychmiast znika, Service Worker wykonuje `chrome.tabs.captureVisibleTab()`, wycina zaznaczony prostokąt w fizycznej rozdzielczości Retina (`cropRectCss * devicePixelRatio`) i otwiera go w `editor.html`.

Jednocześnie zachowujemy obsługę wycinania zaznaczonego tekstu z menu kontekstowego PPM (`contexts: ["selection"]` — *„Zrób zrzut zaznaczonego tekstu”*), dzięki czemu oba scenariusze (interaktywne wycięcie dowolnego kawałka strony myszą oraz szybki zrzut zaznaczonego akapitu tekstu z PPM) działają obok siebie.

## 2. Impact analysis

- **Affected code:**
  - `src/popup/index.ts` & `src/styles/popup.css` — karta `#btn-capture-selection` zmienia tytuł na **„Zaznacz fragment ekranu”** (*„Przeciągnij myszą dowolny obszar strony”*) i jest zawsze aktywna na dozwolonych stronach (`http://` / `https://`), bez blokowania jej przy braku zaznaczenia tekstu.
  - `src/content/capture-injected.ts` — dodanie wstrzykiwanej na żądanie funkcji `selectAreaOverlayInDom(): Promise<AreaSelectionResult>` tworzącej pełnoekranową warstwę `[data-snapmark-area-overlay]` (`position: fixed; inset: 0; z-index: 2147483647; cursor: crosshair`), obsługującą rysowanie prostokąta zaznaczenia z przyciemnieniem tła wokół wycinka, odznaką wymiarów `W × H px`, anulowaniem klawiszem `Escape` oraz gwarantowanym usunięciem z DOM przed wykonaniem `captureVisibleTab()`.
  - `src/background/capture-orchestrator.ts` & `src/background/index.ts` — dodanie funkcji `captureInteractiveArea(tab, rateLimiter)` wywoływanej z popupu (`mode: 'area'` / `#btn-capture-selection`) oraz skrótu `Alt+Shift+S`, przy zachowaniu `captureTextSelection` dla menu kontekstowego PPM (`contexts: ["selection"]`).
  - `src/shared/types.ts` — rozszerzenie lub doprecyzowanie wyzwalacza `RuntimeCaptureRequest` i wyniku `AreaSelectionResult`.
  - `tests/unit/` & `tests/e2e/extension.spec.ts` — testy jednostkowe dla `selectAreaOverlayInDom` (przeciągnięcie prostokąta, anulowanie `Escape`, czyszczenie DOM) oraz aktualizacja testów popupu i E2E.
- **Data and schema changes:**
  - Brak zmian migracyjnych w `SnapMarkDB.captures` — `CaptureSession` już przechowuje `cropRectCss: CssRect` oraz `dpr: number`, a `buildSessionCompositePlacements` w `src/editor/canvas-stage.ts` wycina każdy zrzut z `cropRectCss * dpr`.
- **API / contract changes:**
  - Kompatybilne wstecznie: `CaptureSession` z `mode: 'selection'` i `cropRectCss` działa identycznie dla wycinka obszaru ekranu oraz wycinka tekstu z PPM.
- **Risks:**
  - Widoczność ramki zaznaczenia na zrzucie ekranu: mitygacja poprzez usunięcie `[data-snapmark-area-overlay]` z DOM oraz odczekanie `requestAnimationFrame` przed rozwiązaniem Promise zwracanego do Service Workera przed `captureVisibleTab()`.

## 3. Specification changes

| Document | Section | Change |
|---|---|---|
| `.speccraft/docs/02-General-PRD.md` | `§4.1 Tryb 1: Zaznaczony fragment` | Rozszerzenie Trybu 1 o **Interaktywne zaznaczenie fragmentu ekranu myszą (Area Selection Overlay)** uruchamiane z popupu i skrótu `Alt+Shift+S` (`cursor: crosshair`, przeciągnięcie prostokąta, `Escape` anuluje), z zachowaniem wycinania zaznaczonego tekstu (+20 px marginesu i opcjonalne żółte podświetlenie) z menu kontekstowego PPM (`contexts: ["selection"]`). |
| `.speccraft/docs/04-Interface-spec.md` | `§5.1 Extension Action Popup` & `§6.3` | Zmiana trzeciej karty w `popup.html` na zawsze aktywną kartę **„Zaznacz fragment ekranu”** (*„Włącz celownik i zaznacz kawałek strony”*) oraz opis pełnoekranowej nakładki wyboru obszaru `[data-snapmark-area-overlay]` z odznaką wymiarów `W × H px`. |

## 4. Implementation outline

1. **In-Page Area Selection Overlay (`src/content/capture-injected.ts`)**:
   - Samowystarczalna funkcja `selectAreaOverlayInDom()` wstrzykiwana przez `chrome.scripting.executeScript`.
   - Renderuje warstwę `[data-snapmark-area-overlay]` z celownikiem (`crosshair`), przyciemnieniem `rgba(15, 17, 21, 0.45)`, ramką `#FF3B30` (`2px solid`) wokół przeciąganego prostokąta i licznikiem `W × H px`.
   - Na `mouseup` (gdy `width >= 8 && height >= 8`) usuwa nakładkę z DOM, czeka na odmalowanie klatki (`requestAnimationFrame`) i zwraca `{ cancelled: false, cropRectCss: { x, y, width, height }, viewportWidthCss, viewportHeightCss, dpr }`.
   - Na `keydown` (`Escape`) lub kliknięcie bez przeciągnięcia usuwa nakładkę i zwraca `{ cancelled: true }`.
2. **Background Orchestration (`src/background/capture-orchestrator.ts`, `src/background/index.ts`)**:
   - Dodanie `captureInteractiveArea()` wywoływanego z popupu (`#btn-capture-selection`) i skrótu `Alt+Shift+S`.
   - Jeśli użytkownik zaznaczył wcześniej tekst na stronie i użyje PPM *„Zrób zrzut zaznaczenia”*, uruchamia się dotychczasowe `captureTextSelection` (+20 px marginesu + opcjonalny żółty marker).
3. **Popup UI (`src/popup/index.ts`)**:
   - Karta `#btn-capture-selection` jest zawsze aktywna na zwykłych stronach WWW, wyświetla tytuł **„Zaznacz fragment ekranu”** i po kliknięciu wysyła żądanie uruchomienia celownika na stronie oraz zamyka popup, aby użytkownik mógł od razu zaznaczyć kawałek strony.

## 5. Rollback and safety

- Zmiana realizowana jako osobny kamień milowy `M06` na gałęzi `milestone/M06-feature-interactive-screen-area-selection`, mergowany jednym commitem `--no-ff` do `main`. W razie potrzeby pełny rollback jednym `git revert -m 1`.

## 6. Milestone(s)

- `## [ ] M06 - Feature: Interactive screen area selection overlay (Zaznacz fragment ekranu)`
