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

### Build

```bash
npm run build
```

Buduje kompletną paczkę rozszerzenia Manifest V3 do katalogu `dist/`.

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

- **M02 (Foundations)**: Wpięcie Background Service Workera, bazy IndexedDB (`SnapMarkDB`) do transferu surowych obiektów `Blob`, trwałych ustawień w `chrome.storage.local` oraz prawdziwego zrzutu widocznego ekranu (`chrome.tabs.captureVisibleTab`).
- **M03 (Core Features)**: Wstrzykiwany na żądanie skrypt DOM dla zrzutu zaznaczenia (+20 px marginesu i opcjonalne żółte podświetlenie), wycinania `<img>` oraz pętli zrzutu całej strony ze scrollem (`>= 550 ms` throttling i ukrywanie `fixed`/`sticky`).
- **M04 (Complete Features)**: Pełne interaktywne rysowanie i przeciąganie uchwytów obiektów wektorowych na płótnie oraz eksport `ClipboardItem` / PNG.
