# SnapMark — Szybkie zrzuty kontekstowe z lekkim edytorem adnotacji

**SnapMark** to lekka, szanująca prywatność wtyczka do przeglądarek Chromium (Chrome, Brave, Edge, Arc) w architekturze **Manifest V3**, która zamienia wieloetapowy proces robienia, wycinania i opisywania zrzutów ekranu w jedną płynną akcję. Zaznaczony tekst (+20 px marginesu), kliknięty obrazek `<img>` (bez blokad CORS i problemów z AVIF/WebP), widoczny ekran (Viewport) lub cała strona ze scrollem natychmiast otwierają się w lokalnej karcie `editor.html` z wektorowym edytorem adnotacji.

## Implemented Scope (Milestone M01 — Look & Feel and Clickable Prototype)

- **System projektowy Dark Studio Utility (`src/styles/tokens.css`)**:
  - Kompletna paleta ciemnego studia (`#0F1115` → `#262B36`), akcent Signal Red (`#FF3B30`), 6 kolorów adnotacji wektorowych, stosy fontów systemowych (100% offline, zero wywołań CDN) oraz współdzielone komponenty UI.
- **Klikalny prototyp Popup (`popup.html`, `320px`)**:
  - 3 karty trybów przechwytywania (**Widoczny ekran**, **Cała strona ze scrollem**, **Zaznaczony fragment tekstu**) ze skrótami `<kbd>` (`Alt+Shift+V`, `Alt+Shift+F`, `Alt+Shift+S`).
  - Wskazówka kontekstowa dla wycinania obrazków `<img>` przez PPM oraz przełącznik **„Podświetl zaznaczony tekst na żółto”**.
  - Obsługa wszystkich 4 stanów UI: `?state=default`, `?state=no-selection`, `?state=progress` (pasek postępu zrzutu całej strony `Klatka 3 z 8` z anulowaniem `Esc`) oraz `?state=restricted` (baner dla stron `chrome://` i Chrome Web Store).
- **Klikalny prototyp Edytora Wektorowego (`editor.html`)**:
  - Przypięty górny pasek narzędzi (`56px`) podzielony na 4 klastry:
    1. **Metadane zrzutu**: `domena-pl_2026-11-21_14-10.png` oraz rozdzielczość HiDPI `@2x`.
    2. **3 główne narzędzia wektorowe**: **Strzałka** (`1`), **Linia / Marker** (`2`), **Tekst** (`3`).
    3. **Kontekstowe właściwości**: 6 próbek koloru (domyślnie `#FF3B30`), grubość linii (`2px / 4px / 8px`), przełącznik **Podkreślenie ↔ Zakreślacz** z podpowiedzią `Shift = poziom`, przełącznik czytelności tekstu **Tło / Obrys / Czysty**.
    4. **Historia i eksport**: **Cofnij (`Ctrl+Z`)**, **Usuń (`Delete`)**, **Pobierz PNG** oraz **Kopiuj do schowka** (z 2-sekundowym zielonym stanem potwierdzenia **„✓ Skopiowano!”**).
  - Scena `<canvas id="editor-canvas">` skalowana w fizycznych pikselach Retina (`width = cssWidth * dpr`) z cieniem `shadow-xl` i `border-radius: 0px`, obsługująca podgląd adnotacji wektorowych, ekran pustego stanu (`?state=empty`) oraz baner ostrzegawczy maksymalnej wysokości płótna (`?state=max-height-warning`).

## Product Context

- Source Idea: `.speccraft/docs/01-Idea.md`
- Source PRD: `.speccraft/docs/02-General-PRD.md`
- Source Design System: `.speccraft/docs/03-Design.md`
- Source Interface Spec: `.speccraft/docs/04-Interface-spec.md`
- Source Tech Stack Plan: `.speccraft/docs/05-Tech-Stack.md`
- Milestones: `.speccraft/milestones.md`
- Task lists, plans and reports: `.speccraft/milestones/`
- Project progress: `.speccraft/progress.md`

## Stack

- **Extension Runtime / Client Platform**: Chrome Extension Manifest V3 (`activeTab`, `contextMenus`, `scripting`, `storage`)
- **Frontend (`popup.html` & `editor.html`)**: TypeScript 5.x (Strict Mode) + Vanilla DOM + HTML5 2D `<canvas>` + CSS Custom Properties
- **Build & Packaging**: Node.js 20+ & Vite 5.x (multi-entry Rollup build to `dist/`)
- **Testing**: Vitest (JSDOM unit & integration tests)

## Prerequisites

- Node.js 20+
- npm 10+

## Getting Started

Wszystkie poniższe komendy uruchamia się w katalogu głównym repozytorium.

### Install

```bash
npm install
```

### Run Locally (Interactive Prototype Server)

```bash
npm run dev
```

Po uruchomieniu serwera deweloperskiego Vite (`http://localhost:5173`) możesz przetestować wszystkie widoki i stany z kamienia milowego `M01`:

- **Popup (`320px`)**:
  - Stan domyślny (gotowy): `http://localhost:5173/popup.html`
  - Brak zaznaczenia tekstu na stronie: `http://localhost:5173/popup.html?state=no-selection`
  - Trwający zrzut całej strony ze scrollem: `http://localhost:5173/popup.html?state=progress`
  - Strona chroniona (`chrome://` / Web Store): `http://localhost:5173/popup.html?state=restricted`
- **Edytor Wektorowy (`editor.html`)**:
  - Zrzut widocznego ekranu (`@2x` Retina): `http://localhost:5173/editor.html?mode=viewport`
  - Zrzut zaznaczonego tekstu (+20 px marginesu i żółte podświetlenie): `http://localhost:5173/editor.html?mode=selection&highlight=1`
  - Zrzut wybranego obrazka `<img>`: `http://localhost:5173/editor.html?mode=image`
  - Zrzut całej strony ze scrollem: `http://localhost:5173/editor.html?mode=fullpage`
  - Stan pusty / awaryjny (Empty State z wklejaniem `Ctrl+V`): `http://localhost:5173/editor.html?state=empty`
  - Ostrzeżenie o maksymalnej bezpiecznej wysokości `<canvas>`: `http://localhost:5173/editor.html?state=max-height-warning`

### Build & Load Unpacked Chrome Extension (Milestones M02 & M03)

```bash
npm run build
```

Buduje kompletną paczkę rozszerzenia Manifest V3 do katalogu `dist/` (`manifest.json`, `background.js`, `popup.html`, `editor.html`, `icons/icon-16..128.png`).

**Jak załadować wtyczkę w Google Chrome / Brave / Edge i przetestować wszystkie 4 tryby przechwytywania (M03):**
1. Otwórz w przeglądarce adres `chrome://extensions`.
2. Włącz przełącznik **Tryb dewelopera** (*Developer mode*) w prawym górnym rogu.
3. Kliknij **Załaduj rozpakowane** (*Load unpacked*) i wskaż katalog `dist/` w tym repozytorium.
4. Otwórz dowolną stronę WWW i przetestuj **4 tryby przechwytywania kontekstowego**:
   - **Tryb 1: Zaznaczony fragment tekstu (`selection`)** — Zaznacz akapit tekstu na stronie i kliknij PPM → **„Zrób zrzut zaznaczenia”** (lub użyj przycisku w popupie / `Alt + Shift + S`). Wstrzykiwany na żądanie skrypt mierzy `Range.getBoundingClientRect()`, dodaje **20 px marginesu bezpieczeństwa** przyciętego do granic widoku, opcjonalnie nakłada żółte podświetlenie `rgba(255, 235, 59, 0.45)` na czas zrzutu i otwiera wycięty fragment w fizycznej rozdzielczości Retina (`cropRectCss * devicePixelRatio`).
   - **Tryb 2: Wybrany obrazek `<img>` (`image`)** — Kliknij PPM na dowolnym obrazku na stronie → **„Edytuj i pobierz obrazek”**. Skrypt mierzy rzeczywiste współrzędne `img.getBoundingClientRect()` (dopasowując element po `srcUrl` / `currentSrc` / środku widoku) i wycina go bezpośrednio z bufora ekranu (`captureVisibleTab`), **całkowicie omijając blokady CORS/Hotlink oraz formaty WebP/AVIF**.
   - **Tryb 3: Widoczny ekran (`viewport`)** — Kliknij ikonę **SnapMark** → **„Widoczny ekran”** (lub `Alt + Shift + V` / PPM → **„Zrób zrzut widocznego ekranu”**).
   - **Tryb 4: Cała strona ze scrollem (`fullpage`)** — Kliknij w popupie **„Cała strona ze scrollem”** (lub `Alt + Shift + F`). Wtyczka przewija stronę w pętli z bezpiecznym throttlingiem **`>= 550 ms`** (respektując limit `MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND` w Chrome), ukrywa pływające elementy `position: fixed` i `sticky` po pierwszej klatce (aby nagłówki i banery cookie nie powtarzały się na złączeniach), przywraca oryginalny stan DOM i pozycję przewinięcia w bloku `finally`, a w `editor.html` bezszwowo skleja klatki na płótnie `<canvas>` (z kontrolą limitu `MAX_CANVAS_HEIGHT_PHYSICAL_PX = 16384`).
5. Każdy zrzut w natywnej rozdzielczości Retina trafia jako surowy obiekt `Blob` do bazy **IndexedDB** (`SnapMarkDB.captures`), otwiera kartę `editor.html?captureId=<id>` i **natychmiast usuwa dane tymczasowe z IndexedDB** zaraz po wczytaniu na płótno `<canvas>`.

## Available Scripts

- `npm run dev`: uruchamia lokalny serwer Vite dla `popup.html` i `editor.html`
- `npm run typecheck`: weryfikuje typy TypeScript (`tsc --noEmit`)
- `npm test`: uruchamia zestaw testów jednostkowych Vitest (`vitest run`)
- `npm run build`: wykonuje `typecheck` oraz buduje produkcyjną paczkę rozszerzenia do `dist/`

## Project Structure

```text
SnapMark/
├── public/
│   └── manifest.json           # Deklaracja Chrome Extension Manifest V3
├── src/
│   ├── styles/
│   │   ├── tokens.css          # Tokeny i komponenty Dark Studio Utility (03-Design.md)
│   │   ├── popup.css           # Style popupu (320px)
│   │   └── editor.css          # Style paska 56px i sceny płótna
│   ├── shared/
│   │   ├── types.ts            # Kontrakty CaptureSession, AnnotationItem, UserSettings
│   │   ├── constants.ts        # Paleta 6 kolorów (#FF3B30), grubości linii, domyślne ustawienia
│   │   └── mock-captures.ts    # Fikstury HiDPI (@2x) i parsery stanów URL
│   ├── popup/
│   │   └── index.ts            # Kontroler popup.html i jego 4 stanów
│   └── editor/
│       ├── index.ts            # Kontroler paska 56px, skrótów i stanów edytora
│       └── canvas-stage.ts     # Renderer sceny HiDPI <canvas> i obiektów wektorowych
├── tests/
│   └── unit/                   # Testy jednostkowe Vitest
├── popup.html
├── editor.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

## Testing and Quality

Uruchomienie pełnej weryfikacji typów, testów jednostkowych i produkcyjnego buildu:

```bash
npm run typecheck && npm test && npm run build
```

## Assumptions and Deferred Scope

- **M01 (Look & Feel and Clickable Prototype — Zrealizowano)**: System projektowy Dark Studio Utility (`src/styles/tokens.css`) oraz widoki `popup.html` i `editor.html`.
- **M02 (Foundations — Zrealizowano)**: Background Service Worker Manifest V3, baza IndexedDB (`SnapMarkDB`) do transferu surowych obiektów `Blob` z natychmiastowym czyszczeniem po wczytaniu, ustawienia w `chrome.storage.local` oraz zrzut widocznego ekranu (`chrome.tabs.captureVisibleTab`).
- **M03 (Core Features — Zrealizowano)**: Wstrzykiwany na żądanie skrypt DOM (`src/content/capture-injected.ts`) dla zrzutu zaznaczenia (+20 px marginesu i opcjonalne żółte podświetlenie), wycinania `<img>` z pominięciem CORS/AVIF/WebP oraz pętli zrzutu całej strony ze scrollem (`>= 550 ms` throttling, ukrywanie `fixed`/`sticky` po klatce #1 i bezszwowe sklejanie na `<canvas>`).
- **M04 (Complete Features — Zrealizowano)**: Pełny interaktywny silnik warstwy wektorowej (`src/editor/vector-engine.ts`, `src/editor/history.ts`, `src/editor/text-overlay.ts`, `src/editor/exporter.ts`): rysowanie i przeciąganie uchwytów końcowych `(x1, y1)` i `(x2, y2)` strzałki, podkreślenie i zakreślacz (`globalAlpha = 0.35`) z blokadą poziomu `Shift`, pole tekstowe `<textarea>` z edycją po dwukliku i 3 trybami czytelności (**Tło / Obrys / Czysty**), wielopoziomowe `Ctrl+Z` / `Delete` oraz spłaszczony eksport HiDPI do pliku PNG (`<domena>_YYYY-MM-DD_HH-mm.png`) i schowka systemowego (`ClipboardItem`).
- **M05 (Quality and Release)**: Zestaw testów E2E Playwright w Chromium (`--load-extension=./dist`), testy brzegowe, CI GitHub Actions oraz paczka wydaniowa `snapmark-extension.zip`.
