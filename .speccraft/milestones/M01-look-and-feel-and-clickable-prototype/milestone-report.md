# Milestone M01 report: Look & feel and clickable prototype

## Summary
Zrealizowano kompletny kamień milowy **M01 (Look & feel and clickable prototype)**: zainicjalizowano szkielet TypeScript 5 + Vite multi-entry + Vitest w katalogu głównym repozytorium, wdrożono system wizualny **Dark Studio Utility** (`03-Design.md`) w 100% offline (zero wywołań sieciowych) oraz zbudowano interaktywne, klikalne prototypy obu powierzchni produktu — `popup.html` (`320px`) oraz `editor.html` (przypięty pasek `56px` z 4 klastrami narzędzi + scena `<canvas id="editor-canvas">` skalowana w fizycznych pikselach Retina `@2x`). Wszystkie stany interfejsu z `04-Interface-spec.md` (`default`, `no-selection`, `progress`, `restricted`, `empty`, `max-height-warning`) działają interaktywnie oraz przez parametry URL i są pokryte 24 testami jednostkowymi Vitest.

## What you can see now
**Phase:** 1–2 — Look & feel & Clickable prototype, milestone 1 of 1 in this phase.
- **Przed M01:** W repozytorium znajdowały się wyłącznie dokumenty projektowe w `.speccraft/docs/` oraz plan kamieni milowych.
- **Po M01:** Działa prawdziwa aplikacja frontendowa TypeScript + Vite z dwoma punktami wejścia (`popup.html` oraz `editor.html`) zbudowana z zatwierdzonych tokenów CSS (`src/styles/tokens.css`), w której możesz przeklikać pełną ścieżkę od wywołania dowolnego trybu zrzutu w popupie (wraz z przełącznikiem żółtego podświetlenia tekstu oraz widokiem postępu zrzutu całej strony ze scrollem) do wektorowego edytora adnotacji z podglądem strzałek (z uchwytami końcówek), zakreślacza (`alpha = 0.35`, podpowiedź `Shift = poziom`), tekstu (**Tło / Obrys / Czysty**), historii `Ctrl+Z` oraz przycisku **„Kopiuj do schowka”** ze zmianą stanu na zielone **„✓ Skopiowano!”**.

## How to review
Uruchom z katalogu głównego repozytorium:

```bash
npm install && npm run dev
```

Następnie otwórz w przeglądarce:
1. **Popup (`320px`)**:
   - Stan gotowości (3 karty trybów, wskazówka PPM dla `<img>`, przełącznik żółtego podświetlenia): `http://localhost:5173/popup.html`
   - Stan braku zaznaczenia tekstu na stronie: `http://localhost:5173/popup.html?state=no-selection`
   - Widok postępu zrzutu całej strony ze scrollem (`Klatka 3 z 8`, pasek postępu, anulowanie `Esc`): `http://localhost:5173/popup.html?state=progress`
   - Baner strony chronionej (`chrome://` / Chrome Web Store): `http://localhost:5173/popup.html?state=restricted`
2. **Wektorowy Edytor Adnotacji (`editor.html`)**:
   - Kliknij dowolną kartę w `popup.html` lub otwórz bezpośrednio: `http://localhost:5173/editor.html?mode=viewport`
   - Przetestuj przełączanie narzędzi (**Strzałka** `1`, **Linia / Marker** `2`, **Tekst** `3`), zmianę koloru (6 próbek z domyślnym `#FF3B30`), grubości linii (`2px / 4px / 8px`), podtrybu **Podkreślenie ↔ Zakreślacz**, stylu czytelności tekstu (**Tło / Obrys / Czysty**), cofanie (`Ctrl+Z`), usuwanie (`Delete`) oraz kliknięcie **„Kopiuj do schowka”** (`✓ Skopiowano!`).
   - Sprawdź zrzut zaznaczenia z żółtym podświetleniem: `http://localhost:5173/editor.html?mode=selection&highlight=1`
   - Sprawdź ekran pustego stanu (Empty State Card z `Ctrl+V`): `http://localhost:5173/editor.html?state=empty`
   - Sprawdź baner ostrzegawczy maksymalnej wysokości płótna: `http://localhost:5173/editor.html?state=max-height-warning`

Kod: gałąź `milestone/M01-look-and-feel-and-clickable-prototype`.
- `git log --oneline --first-parent milestone/M01-look-and-feel-and-clickable-prototype` pokazuje historię merge'y zadań `001`–`006`.
- `git diff main...milestone/M01-look-and-feel-and-clickable-prototype` pokazuje pełny zakres zmian.

## Exit criteria
| Criterion | Status | Evidence |
|---|---|---|
| Wszystkie tokeny kolorów, typografii, odstępów i cieni z `03-Design.md` są zdefiniowane w `src/styles/tokens.css` i użyte w `popup.html` oraz `editor.html` (brak zewnętrznych zapytań do Google Fonts / CDN) | MET | `src/styles/tokens.css` + test `tests/unit/tokens.test.ts` (4/4 testy przechodzą, weryfikacja 0 wywołań `http://`/`https://`/`@import`) |
| `popup.html` ma szerokość `320px` i poprawnie wyświetla wszystkie 4 stany z `04-Interface-spec.md §5.1 i §7` (`default`, `no-selection`, `progress`, `restricted`) | MET | `src/styles/popup.css` (`.popup-shell { width: 320px }`), `src/popup/index.ts` + test `tests/unit/popup.test.ts` (5/5 testów przechodzi) |
| `editor.html` wyświetla pojedynczy pasek `56px` z wszystkimi 4 klastrami narzędzi, przełącza kontekstowe kontrolki dla narzędzi `1`, `2`, `3`, pokazuje stan `✓ Skopiowano!` oraz obsługuje ekran pustego stanu (`?state=empty`) z `04-Interface-spec.md §5.2–5.3` | MET | `src/styles/editor.css`, `src/editor/index.ts`, `src/editor/canvas-stage.ts` + testy `tests/unit/editor-toolbar.test.ts` (4/4) i `tests/unit/editor-stage.test.ts` (4/4) |
| `npm run typecheck && npm test && npm run build` kończą się sukcesem z kodem wyjścia `0` | MET | `tsc --noEmit` (0 błędów), `vitest run` (6 plików testowych, 24/24 testy zielone), `vite build` (`dist/popup.html`, `dist/editor.html`, `dist/manifest.json`) |

## Tasks
| Task | Status | Note |
|---|---|---|
| 001 - Scaffold TypeScript and Vite extension project | done | Multi-entry Vite build + strict TS + Vitest JSDOM + Manifest V3 baseline |
| 002 - Implement Dark Studio Utility design tokens and shared UI styles | done | Complete `src/styles/tokens.css` with 27 color tokens and reusable UI primitives |
| 003 - Create shared types, constants and mock capture fixtures | done | Typed contracts in `src/shared/types.ts`, constants, and HiDPI `@2x` mock fixtures |
| 004 - Build clickable extension popup prototype with all UI states | done | 320px `popup.html` with all 4 states and interactive navigation to `editor.html` |
| 005 - Build vector editor 56px top toolbar and contextual controls | done | Fixed 56px 4-cluster toolbar, tool shortcuts `1`/`2`/`3`, `Ctrl+Z`, and `✓ Skopiowano!` |
| 006 - Build editor HiDPI canvas stage, sample vector preview and fallback states | done | Retina physical pixel canvas stage, vector preview, `?state=empty`, `?state=max-height-warning`, `README.md` |

## Assumptions to review
- none

## Known limitations and deviations
- **Milestone completion fixes:** W `src/editor/canvas-stage.ts` dodano detekcję środowiska `jsdom` w `get2DContext()`, aby wyeliminować ostrzeżenia `Not implemented: HTMLCanvasElement.prototype.getContext` wypisywane przez JSDOM na `stderr` podczas testów jednostkowych.
- Zgodnie z zakresem prototypu `M01`, widoki korzystają z deterministycznych fikstur (`src/shared/mock-captures.ts`). Rzeczywiste API Chrome (`captureVisibleTab`, IndexedDB `SnapMarkDB`, `chrome.storage.local`) zostaną wpięte w kamieniu milowym `M02`.

## Spec changes
none

## Recommendations for next milestones
- Interfejsy `renderPopup` (`src/popup/index.ts`), `initEditor` (`src/editor/index.ts`) oraz `renderCanvasStage` (`src/editor/canvas-stage.ts`) są już przygotowane pod bezpośrednie podpięcie `SnapMarkDB` (IndexedDB `Blob` store) oraz `chrome.storage.local` w kamieniu milowym **M02**.

## Operator decision
- [x] Accept: tell `08-planning-tasks` "accept M01". It merges `milestone/M01-look-and-feel-and-clickable-prototype` into the base branch and plans the next milestone
- [ ] Request changes: describe them below and run `08-planning-tasks`

### Feedback
Zaakceptowano przez operatora (2026-11-21).
