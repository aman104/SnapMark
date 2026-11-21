# Milestones: SnapMark

## Roadmap

*Note on Phase Merging:* Because SnapMark is a focused, 2-surface Chrome Extension (`popup.html` and `editor.html`), **Phases 1 and 2 (`Look & feel` + `Clickable prototype`)** are merged into **M01**, and **Phases 6 and 7 (`Quality` + `Release`)** are merged into **M05**, following the SpecCraft rule for compact UI products while preserving the strict phase order.

| Phase | Milestones | What you will see at the end | Status |
|---|---|---|---|
| 1–2. Look & feel & Clickable prototype | M01 | The real TypeScript + Vite project running both `popup.html` and `editor.html` in the Dark Studio Utility design system (`03-Design.md`), with every UI state switchable (`?state=default\|progress\|restricted\|empty`) and a clickable mock capture flow loading a sample Retina screenshot onto the editor stage | in review |
| 3. Foundations | M02 | A loadable Chrome Extension Manifest V3 package (`dist/`) with minimal permissions (`activeTab`, `contextMenus`, `scripting`, `storage`), IndexedDB `Blob` transfer store (`SnapMarkDB`) with automatic cleanup, persistent settings in `chrome.storage.local`, and **Tryb 3: Widoczny ekran (Viewport)** working end-to-end from popup, context menu, and `Alt+Shift+V` | planned |
| 4. Core features | M03 | All remaining contextual capture modes working on live websites: **Tryb 1: Zaznaczony fragment tekstu** (+20 px safety margin, DPI scaling, optional yellow highlight), **Tryb 2: Wybrany obrazek `<img>`** (bypassing CORS and AVIF/WebP via `captureVisibleTab`), and **Tryb 4: Cała strona ze scrollem** (>= 550 ms rate-limit throttling, hiding `fixed`/`sticky` headers after Frame #1, live progress bar/badge, multi-frame stitching) | planned |
| 5. Complete features | M04 | The complete interactive **Vector Annotation Editor (`editor.html`)** and export pipeline: vector **Strzałka** (with post-draw draggable endpoint handles), 2-in-1 **Podkreślenie i zakreślacz** (`Shift` horizontal axis lock, `globalAlpha = 0.35`), **Tekst** (in-canvas `<textarea>` with contrasting background pill or white stroke outline), **Cofnij (`Ctrl+Z`) / Usuń (`Delete`)**, **Pobierz PNG** (`domena-pl_YYYY-MM-DD_HH-mm.png`), and **Kopiuj do schowka** (`✓ Skopiowano!`) | planned |
| 6–7. Quality & release | M05 | Automated Playwright Chromium Extension E2E test suite loading `./dist`, edge-case & security hardening (`MAX_CANVAS_HEIGHT` banner, `finally` DOM cleanup verification, zero network requests check), GitHub Actions CI, and a packaged Chrome Web Store `.zip` release with documentation | planned |

## [?] M01 - Look & feel and clickable prototype
- **Phase:** 1–2 — Look & feel & Clickable prototype
- **Type:** prototype
- **What you will see:** Przed: tylko dokumentacja projektowa w `.speccraft/docs/`. Po: działająca aplikacja frontendowa (TypeScript + Vite) z kompletnym systemem wizualnym **Dark Studio Utility** (`03-Design.md`) oraz klikalnymi widokami `popup.html` (`320px`) i `editor.html` (pasek `56px` + płótno `<canvas>`), w których możesz przełączać wszystkie stany interfejsu (`default`, `progress`, `restricted`, `empty`, `warning`) i przeklikać pełną ścieżkę od wywołania zrzutu do edytora na realistycznych danych testowych.
- **Goal:** Zbudować docelowy szkielet TypeScript + Vite z tokenami CSS (`03-Design.md`) i kompletnym układem ekranów z `04-Interface-spec.md` zasilanym z lokalnych danych testowych (`mock`), aby zweryfikować ergonomię paska narzędzi edytora oraz popupu przed wpięciem API przeglądarki Chrome.
- **Scope:**
  - Inicjalizacja projektu w katalogu głównym repozytorium zgodnie z `05-Tech-Stack.md §8` (`package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `.gitignore`) bez naruszania `.speccraft/`, `.agents/` i `.claude/`
  - Kompletna implementacja tokenów wizualnych w `src/styles/tokens.css` (paleta `#0F1115` → `#1E222B`, Signal Red `#FF3B30`, paleta 6 kolorów adnotacji, typografia systemowa, cienie `shadow-xl`, zaokrąglenia) z `03-Design.md`
  - Klikalny prototyp `popup.html` (`src/popup/`, `src/styles/popup.css`) z `04-Interface-spec.md §5.1`: nagłówek z pigułką `Lokalny • MV3`, 3 karty trybów zrzutu (`popup-action-card`) z odznakami `<kbd>`, wskazówka PPM dla obrazków `<img>`, przełącznik *„Podświetl zaznaczony tekst na żółto”* oraz przełączalne parametrem URL stany: `?state=default`, `?state=no-selection`, `?state=progress` (widok postępu zrzutu całej strony `Klatka 3 z 8`), `?state=restricted` (baner błędu dla `chrome://` i Chrome Web Store)
  - Klikalny prototyp `editor.html` (`src/editor/`, `src/styles/editor.css`) z `04-Interface-spec.md §5.2–5.3`: przypięty górny pasek `56px` podzielony na 4 klastry (Metadane `domena-pl_2026-11-21_14-10.png` + `1280×800 • @2x`, 3 narzędzia: **Strzałka**, **Linia / Marker**, **Tekst**, kontekstowe właściwości: 6 próbek koloru, grubość `2/4/8 px`, przełącznik Podkreślenie ↔ Zakreślacz z podpowiedzią `Shift = poziom`, przełącznik czytelności tekstu **Tło / Obrys / Czysty**, oraz przyciski **Cofnij `Ctrl+Z`**, **Usuń**, **Pobierz PNG**, **Kopiuj do schowka** ze zmianą stanu na `✓ Skopiowano!`)
  - Centralna scena `<canvas id="editor-canvas">` renderująca przykładowy zrzut HiDPI z fikstur (`src/shared/mock-captures.ts`) wraz z przykładowymi adnotacjami demonstracyjnymi oraz obsługą widoków `?state=empty` (Empty State Card z przyciskami wklejenia ze schowka i wczytania pliku z `04-Interface-spec.md §5.3`) i `?state=max-height-warning`
- **Out of scope:**
  - Prawdziwe wywołania `chrome.tabs.captureVisibleTab`, `chrome.contextMenus`, `chrome.scripting` oraz zapis w IndexedDB (M02 i M03)
  - Pełny interaktywny silnik rysowania wektorowego i spłaszczania eksportu (M04)
- **Demo for the operator:**
  - Uruchom w katalogu głównym: `npm install && npm run dev`
  - Otwórz w przeglądarce `http://localhost:5173/popup.html` i przetestuj przełączanie kart, switch podświetlenia tekstu oraz stany: `http://localhost:5173/popup.html?state=progress`, `http://localhost:5173/popup.html?state=restricted`, `http://localhost:5173/popup.html?state=no-selection`
  - Kliknij dowolną kartę trybu zrzutu w `popup.html` (lub otwórz `http://localhost:5173/editor.html`), sprawdź wygląd paska `56px`, przełączanie aktywnych narzędzi (**Strzałka**, **Linia / Marker**, **Tekst**), kontekstowych właściwości i stan sukcesu **„✓ Skopiowano!”**, a następnie sprawdź `http://localhost:5173/editor.html?state=empty`
- **Exit criteria:**
  - [ ] Wszystkie tokeny kolorów, typografii, odstępów i cieni z `03-Design.md` są zdefiniowane w `src/styles/tokens.css` i użyte w `popup.html` oraz `editor.html` (brak zewnętrznych zapytań do Google Fonts / CDN)
  - [ ] `popup.html` ma szerokość `320px` i poprawnie wyświetla wszystkie 4 stany z `04-Interface-spec.md §5.1 i §7` (`default`, `no-selection`, `progress`, `restricted`)
  - [ ] `editor.html` wyświetla pojedynczy pasek `56px` z wszystkimi 4 klastrami narzędzi, przełącza kontekstowe kontrolki dla narzędzi `1`, `2`, `3`, pokazuje stan `✓ Skopiowano!` oraz obsługuje ekran pustego stanu (`?state=empty`) z `04-Interface-spec.md §5.2–5.3`
  - [ ] `npm run typecheck && npm test && npm run build` kończą się sukcesem z kodem wyjścia `0`
- **Depends on:** none
- **Estimated size:** 6–8 tasks

## [ ] M02 - Foundations: Manifest V3, IndexedDB transfer and Viewport capture
- **Phase:** 3 — Foundations
- **Type:** foundation
- **What you will see:** Przed: klikalny prototyp w karcie deweloperskiej z przykładowym obrazkiem. Po: prawdziwa, gotowa do załadowania w Chrome wtyczka Manifest V3 (`dist/`), która nie żąda uprawnienia `<all_urls>`, rejestruje menu kontekstowe i skróty klawiszowe, zapisuje ustawienia w `chrome.storage.local`, wykonuje prawdziwy **Zrzut widocznego ekranu (Viewport)** w natywnej rozdzielczości Retina, przesyła surowy `Blob` przez bazę **IndexedDB** (`SnapMarkDB`) do nowej karty `editor.html` i natychmiast czyści dane tymczasowe po wczytaniu na płótno.
- **Goal:** Zbudować kompletną infrastrukturę rozszerzenia Manifest V3 (Service Worker, IndexedDB `Blob` pipeline, `chrome.storage.local`, matematykę DPI, generator nazw plików, detekcję stron chronionych) i udowodnić jej działanie end-to-end na pierwszym rzeczywistym trybie przechwytywania (**Tryb 3: Widoczny ekran**).
- **Scope:**
  - Konfiguracja `public/manifest.json` (Manifest V3) z minimalnymi uprawnieniami: `["activeTab", "contextMenus", "scripting", "storage"]`, skrótami `commands` (`Alt+Shift+V`, `Alt+Shift+F`, `Alt+Shift+S`), ikonami `16/32/48/128 px` oraz wielowejściowym buildem Vite generującym kompletną paczkę do `dist/` (`PRD §6.1–6.2`, `05-Tech-Stack.md §4 & §8`)
  - Moduł bazy **IndexedDB** (`src/shared/db.ts` — `SnapMarkDB`, store `captures`) obsługujący zapis surowego obiektu `Blob` (`CaptureSession`), odczyt w `editor.html`, **natychmiastowe usunięcie rekordu po wczytaniu na płótno** oraz automatyczne czyszczenie osieroconych rekordów starszych niż 15 minut przy starcie Service Workera (`PRD §6.2–6.3 & §10`)
  - Moduł trwałych ustawień użytkownika w `chrome.storage.local` (`src/shared/settings.ts`) dla `highlightSelectionBeforeCapture`, `selectionPaddingPx`, `activeTool`, `activeColor`, `strokeWidth`, `textStyleMode` (`PRD §8`)
  - Moduły obliczeniowe i walidacyjne wraz z testami jednostkowymi Vitest: przelicznik fizycznych pikseli `devicePixelRatio` i klamrowania marginesów (`src/shared/dpi.ts`), generator nazw plików `<znormalizowana-domena>_YYYY-MM-DD_HH-mm.png` (`src/shared/filename.ts`, np. `domena-pl_2026-11-21_14-10.png`) oraz strażnik stron chronionych `chrome://` / Chrome Web Store (`src/shared/url-guard.ts`) (`PRD §6.2, §7, §9`)
  - Background Service Worker (`src/background/index.ts`, `src/background/rate-limiter.ts`) z rejestracją 3 pozycji `chrome.contextMenus` (`capture-selection`, `capture-image`, `capture-viewport`), obsługą skrótów `chrome.commands` i limiterem zapytań `captureVisibleTab`
  - **Tryb 3: Zrzut widocznego ekranu (Visible Viewport Capture)** (`PRD §4.3`) działający end-to-end z 3 wyzwalaczy: karty w `popup.html`, pozycji menu kontekstowego strony (*„Zrób zrzut widocznego ekranu”*) oraz skrótu `Alt+Shift+V`, ładujący rzeczywisty zrzut na `<canvas>` w `editor.html` wraz z obsługą wklejania obrazu ze schowka (`Ctrl+V`) i wczytywania pliku na ekranie pustego stanu (`04-Interface-spec.md §5.3`)
- **Out of scope:**
  - Wycinanie zaznaczonego fragmentu tekstu, wycinanie obrazka `<img>` i zrzut całej strony ze scrollem (M03)
  - Interaktywne rysowanie wektorowe na płótnie (M04)
- **Demo for the operator:**
  - Uruchom `npm run build` i załaduj katalog `dist/` w Chrome pod adresem `chrome://extensions` (*Tryb dewelopera* → *Załaduj rozpakowane*)
  - Sprawdź szczegóły uprawnień wtyczki w Chrome: brak ostrzeżenia o dostępie do danych na wszystkich stronach (`<all_urls>`)
  - Otwórz dowolną stronę WWW (np. `https://example.com`), kliknij ikonę SnapMark → **„Widoczny ekran”** (lub wciśnij `Alt+Shift+V` albo użyj PPM → *„Zrób zrzut widocznego ekranu”*): w mniej niż 400 ms otwiera się `editor.html` z ostrym zrzutem Retina, poprawną nazwą pliku `example-com_YYYY-MM-DD_HH-mm.png` na pasku i pustą bazą IndexedDB (rekord tymczasowy usunięty zaraz po wczytaniu)
  - Otwórz `chrome://extensions` i kliknij ikonę SnapMark: popup wyświetla czytelny baner *„Strona chroniona przez przeglądarkę”*
- **Exit criteria:**
  - [ ] Paczka w `dist/` ładuje się w `chrome://extensions` bez błędów i deklaruje w `manifest.json` wyłącznie uprawnienia `activeTab`, `contextMenus`, `scripting`, `storage` (brak `<all_urls>`)
  - [ ] Zrzut widocznego ekranu (Viewport) działa z popupu, menu kontekstowego i skrótu `Alt+Shift+V`, otwierając `editor.html` z rzeczywistym obrazem przesłanym jako `Blob` przez IndexedDB
  - [ ] Po wczytaniu obrazu na `<canvas>` w `editor.html` rekord tymczasowy w `SnapMarkDB.captures` jest natychmiast usuwany (potwierdzone testem w `tests/unit/db.test.ts` i w DevTools → Application → IndexedDB)
  - [ ] Ustawienia w `popup.html` i `editor.html` zapisują się w `chrome.storage.local` i przetrwają zamknięcie oraz ponowne otwarcie popupu/karty
  - [ ] Testy jednostkowe Vitest dla `dpi.ts`, `filename.ts`, `url-guard.ts`, `settings.ts`, `db.ts` i `rate-limiter.ts` przechodzą w 100% (`npm test && npm run build`)
- **Depends on:** M01
- **Estimated size:** 7–9 tasks

## [ ] M03 - Core features: Contextual DOM captures (Selection, Image, Full-Page Scroll)
- **Phase:** 4 — Core features
- **Type:** feature
- **What you will see:** Przed: działał tylko prosty zrzut aktualnie widocznego okna (Viewport). Po: działają wszystkie 4 tryby przechwytywania z PRD — możesz zaznaczyć dowolny akapit tekstu i kliknąć PPM *„Zrób screena zaznaczenia”* (otrzymując idealnie przycięty wycinek z marginesem 20 px i opcjonalnym żółtym podświetleniem), kliknąć PPM na dowolne zdjęcie `<img>` *„Edytuj i pobierz obrazek”* (nawet na stronach z blokadą CORS lub formatami AVIF/WebP) albo uruchomić *„Cała strona ze scrollem”* (strona sama przewinie się krok po kroku z odstępem ~550 ms, ukryje po pierwszej klatce pływające nagłówki `fixed`/`sticky` i sklei wszystko w jeden długi obraz w `editor.html`).
- **Goal:** Dostarczyć pełną inteligencję kontekstową DOM (`capture-injected.ts` wstrzykiwany na żądanie przez `activeTab` + `scripting`) oraz algorytm wieloklatkowego zrzutu ze scrollem odporny na limity API Chrome i skalowanie Retina/4K.
- **Scope:**
  - **Tryb 1: Zrzut zaznaczonego fragmentu tekstu (`PRD §4.1`)**:
    - Obsługa pozycji menu kontekstowego *„Zrób screena zaznaczenia”* (`contexts: ["selection"]`), skrótu `Alt+Shift+S` oraz karty w `popup.html` (z dynamicznym wykrywaniem aktywnego zaznaczenia na karcie)
    - Pomiar `Range.getBoundingClientRect()`, automatyczne centrowanie `scrollIntoView` gdy zaznaczenie wystaje częściowo poza widok, dodanie marginesu bezpieczeństwa **20 px CSS** (`selectionPaddingPx`) klamrowanego do krawędzi viewportu oraz przemnożenie `(x, y, width, height)` przez `window.devicePixelRatio` przed wycięciem obszaru na `<canvas>`
    - **Opcjonalne żółte podświetlenie przed zrzutem (`highlightSelectionBeforeCapture`)**: tymczasowe nałożenie żółtych nakładek `[data-snapmark-highlight]` (`rgba(255, 235, 59, 0.45)`) na podstawie `range.getClientRects()` i ukrycie natywnego zaznaczenia na czas `captureVisibleTab`, z gwarantowanym przywróceniem DOM w bloku `finally`
  - **Tryb 2: Zrzut wybranego obrazka `<img>` (`PRD §4.2`)**:
    - Obsługa pozycji menu kontekstowego *„Edytuj i pobierz obrazek”* (`contexts: ["image"]`)
    - Lokalizacja klikniętego elementu `<img>` w DOM (po dopasowaniu `info.srcUrl` / `currentSrc`, stanie `:hover` i widoczności w viewporcie), opcjonalne `scrollIntoView({ block: 'nearest' })`, pomiar `img.getBoundingClientRect()`, przemnożenie przez `window.devicePixelRatio` i bezpośrednie wycięcie z `captureVisibleTab()` z całkowitym pominięciem `fetch(srcUrl)` (odporność na CORS, `AVIF`, `WebP` i blokady zapisu)
  - **Tryb 4: Zrzut całej strony ze scrollem (`PRD §4.4`)**:
    - Pętla przewijająca stronę krok po kroku (`window.scrollTo`), tymczasowo ukrywająca pasek przewijania i zaczynająca od `(0, 0)` na Klatce #1
    - Automatyczne wykrywanie i ukrywanie elementów `getComputedStyle(el).position === 'fixed' || 'sticky'` (`visibility: hidden !important`) **po pierwszej klatce** oraz gwarantowane przywrócenie ich stanu i oryginalnej pozycji scrolla w bloku `finally`
    - Sztywne opóźnienie **>= 550 ms** między klatkami (`CaptureRateLimiter` + retry backoff `600 ms` pod limit `MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND`)
    - Wskaźnik postępu na żywo w `popup.html` (`Klatka k z N`, pasek postępu, przycisk *„Anuluj i zatrzymaj (Esc)”*) oraz na badge'u ikony rozszerzenia (`chrome.action.setBadgeText`), bez wstrzykiwania widocznego paska postępu do zrzucanego DOM strony
    - Sklejanie klatek na jednym elemencie `<canvas>` w `editor.html` z dokładnym wyliczeniem offsetu `deltaY` dla ostatniej klatki oraz bezpiecznym limitem wysokości `MAX_CANVAS_HEIGHT` (`PRD §7`)
- **Out of scope:**
  - Rysowanie i edycja obiektów wektorowych oraz eksport spłaszczonego obrazu do PNG / schowka (M04)
- **Demo for the operator:**
  - Zbuduj i przeładuj wtyczkę (`npm run build`), otwórz dowolny artykuł (np. na Wikipedii lub blogu technicznym) na ekranie Retina/HiDPI:
    1. **Zaznaczony tekst**: Włącz w popupie *„Podświetl zaznaczony tekst na żółto”*, zaznacz akapit tekstu, kliknij PPM → **„Zrób screena zaznaczenia”** — w `editor.html` otwiera się ostro wycięty kadr z równym marginesem 20 px wokół tekstu i żółtym markerem na zaznaczeniu, a na oryginalnej stronie podświetlenie już zniknęło.
    2. **Wybrany obrazek**: Kliknij PPM na dowolne zdjęcie `<img>` → **„Edytuj i pobierz obrazek”** — w `editor.html` otwiera się idealnie wycięty obrazek w pełnej rozdzielczości ekranu.
    3. **Cała strona ze scrollem**: Kliknij ikonę SnapMark → **„Cała strona ze scrollem”** (lub `Alt+Shift+F`) — obserwuj pasek postępu `Klatka 1 z N...`, po zakończeniu w `editor.html` pojawia się sklejona cała strona, na której górny przyklejony pasek nawigacji (`sticky`/`fixed`) widnieje tylko raz na samej górze.
- **Exit criteria:**
  - [ ] Tryb 1 (Zaznaczony tekst) wycina zaznaczenie z marginesem `20 px` CSS przeliczonym przez `window.devicePixelRatio` oraz poprawnie nakłada i usuwa tymczasowe żółte podświetlenie, gdy opcja jest włączona
  - [ ] Tryb 2 (Wybrany obrazek `<img>`) wycina dokładny prostokąt `img.getBoundingClientRect() * dpr` z `captureVisibleTab` bez wykonywania zapytań sieciowych `fetch`
  - [ ] Tryb 4 (Cała strona ze scrollem) zachowuje odstęp `>= 550 ms` między klatkami (zero błędów `MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND`), ukrywa elementy `fixed`/`sticky` po pierwszej klatce, skleja klatki bez szwów/duplikacji na ostatniej klatce i zawsze przywraca oryginalny stan DOM oraz pozycję scrolla strony
  - [ ] Użytkownik może anulować trwający zrzut ze scrollem przyciskiem w popupie lub klawiszem `Esc`, co natychmiast przywraca stronę do stanu początkowego
  - [ ] Testy jednostkowe i integracyjne dla wycinania DPI, ukrywania `fixed`/`sticky` oraz sklejania klatek przechodzą (`npm test && npm run build`)
- **Depends on:** M02
- **Estimated size:** 8–10 tasks

## [ ] M04 - Complete features: Vector annotation editor, undo history and export
- **Phase:** 5 — Complete features
- **Type:** feature
- **What you will see:** Przed: wszystkie 4 tryby zrzutu otwierały przechwycony obraz na płótnie w `editor.html`, ale narzędzia rysowania były tylko makietą z prototypu. Po: pełny, płynny (60 FPS) wektorowy edytor adnotacji — jednym przeciągnięciem myszy rysujesz czerwoną **Strzałkę** (`#FF3B30`) i po narysowaniu możesz chwycić jej grot lub początek, by skorygować kierunek; przełączasz na **Podkreślenie i zakreślacz** i z przytrzymanym `Shift` rysujesz idealnie proste linie lub półprzezroczysty marker (`globalAlpha = 0.35`); klikasz **Tekst** i wpisujesz komentarz z kontrastowym tłem lub białym obrysem wokół liter; cofasz dowolny ruch przez `Ctrl+Z` (`Cmd+Z`) lub usuwasz wybrany obiekt klawiszem `Delete`, a na końcu jednym kliknięciem **„Kopiuj do schowka”** lub **„Pobierz PNG”** eksportujesz spłaszczony obraz w pełnej rozdzielczości.
- **Goal:** Zaimplementować kompletny silnik warstwy wektorowej (`annotations[]`), interakcje manipulacji obiektami po narysowaniu, pełną historię zmian `Ctrl+Z` oraz bezstratny eksport do pliku PNG i schowka systemowego (`PRD §4.5`).
- **Scope:**
  - **Silnik warstwy wektorowej (`src/editor/vector-engine.ts`)**: przechowywanie adnotacji w tablicy obiektów `annotations: AnnotationItem[]` i przerysowywanie płótna w pętli `requestAnimationFrame` nad bazową bitmapą zrzutu (ze skalowaniem wszystkich wymiarów wektorowych przez `dpr`) (`PRD §4.5 & §6.3`)
  - **Narzędzie 1: Strzałka wektorowa (`arrow`)**:
    - Rysowanie jednym przeciągnięciem myszy z automatycznym, proporcjonalnym grotem zależnym od kąta i grubości linii (`2px`, `4px`, `8px`) oraz wybranym kolorem (domyślnie `#FF3B30`)
    - Hit-testing i **edycja po narysowaniu**: kliknięcie strzałki zaznacza ją i wyświetla dwa uchwyty kontrolne na końcach `(x1, y1)` oraz `(x2, y2)` umożliwiające niezależne przesuwanie grota lub początku strzałki, przesuwanie całej strzałki oraz zmianę jej koloru/grubości po narysowaniu (`PRD §4.5`, `04-Interface-spec.md §5.2`)
  - **Narzędzie 2: Podkreślenie i zakreślacz 2-w-1 (`line`: `underline` | `highlighter`)**:
    - Tryb **Podkreślenie**: pełne krycie (`globalAlpha = 1.0`), wybrana grubość (`2/4/8 px`) i kolor
    - Tryb **Zakreślacz**: półprzezroczysty pas markera (`ctx.globalAlpha = 0.35`, wysokość `24px` skalowana przez `dpr`) do zakreślania całych wierszy tekstu
    - Blokada osi pod klawiszem **`Shift`**: przytrzymanie `Shift` podczas rysowania lub przesuwania końcówki wymusza idealny poziom (`y2 = y1`) (`PRD §4.5`)
  - **Narzędzie 3: Tekst (`text`)**:
    - Kliknięcie w dowolne miejsce na zrzucie tworzy edytowalne pole `<textarea>` nad płótnem (`04-Interface-spec.md §6.1`), zatwierdzane przez `Enter` lub kliknięcie obok (`blur`), z możliwością przesuwania napisu po zatwierdzeniu oraz ponownej edycji treści po dwukliku
    - 3 tryby czytelności (**Readability Mode**): **Tło (Kontrast)** (zaokrąglony prostokąt kontrastowego tła pod tekstem), **Obrys (Biały / Kontrastowy)** (`ctx.strokeText` wokół liter przed `ctx.fillText`, czytelny na ciemnym i jasnym tle) oraz **Czysty** (`PRD §4.5`)
  - **Narzędzie 4: Historia zmian (`Ctrl+Z` / `Cmd+Z`), usuwanie (`Delete` / `Backspace`) i Eksport (`src/editor/history.ts`, `src/editor/exporter.ts`)**:
    - Pełny stos historii zmian (`historyStack[]`) obsługujący cofanie dodania, przesunięcia, edycji tekstu, zmiany stylu oraz usunięcia obiektu pod przyciskiem **„Cofnij”** i skrótem `Ctrl+Z` / `Cmd+Z`
    - Spłaszczanie warstwy bazowej bitmapy i tablicy `annotations[]` (bez uchwytów selekcji) w pełnej rozdzielczości fizycznej przy kliknięciu:
      - **„Pobierz PNG”**: automatyczne pobranie pliku o nazwie `<domena-z-myslnikami>_YYYY-MM-DD_HH-mm.png` (np. `domena-pl_2026-11-21_14-10.png`)
      - **„Kopiuj do schowka”**: zapis `Blob` (`image/png`) do schowka systemowego przez `navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])` z przejściem przycisku w stan `✓ Skopiowano!` (`#22C55E`) na 2 sekundy (`PRD §4.5 & §9`)
- **Out of scope:**
  - Narzędzia wykluczone do v2 w `PRD §12` (Blur/Pixelate, numerowane kroki, eksport do PDF)
- **Demo for the operator:**
  - Wykonaj dowolny zrzut wtyczką SnapMark, aby otworzyć `editor.html`:
    1. Narysuj czerwoną **Strzałkę**, a następnie chwyć jej grot myszą i przesuń w inne miejsce; zmień jej kolor na żółty `#FFCC00` i grubość na `8px`.
    2. Wybierz **Linia / Marker** → **Podkreślenie**, przytrzymaj `Shift` i podkreśl zdanie idealnie poziomą linią; przełącz na **Zakreślacz**, przytrzymaj `Shift` i zakreśl cały wiersz półprzezroczystym markerem (`alpha = 0.35`).
    3. Wybierz **Tekst**, kliknij na ciemny fragment zrzutu, wpisz komentarz i przełącz pomiędzy **Tło** a **Obrys** (biały obrys wokół liter).
    4. Wciśnij `Ctrl+Z` (lub `Cmd+Z`), aby cofnąć ostatnie zmiany, zaznacz obiekt i wciśnij `Delete`.
    5. Kliknij **„Kopiuj do schowka”** (przycisk zmieni się na `✓ Skopiowano!`) i wklej obraz przez `Ctrl+V` / `Cmd+V` bezpośrednio do Slacka, dokumentu lub nowej karty; kliknij **„Pobierz PNG”** i sprawdź pobrany plik `domena_YYYY-MM-DD_HH-mm.png`.
- **Exit criteria:**
  - [ ] Wszystkie obiekty rysowane w edytorze są przechowywane w tablicy wektorowej `annotations[]`, a nie wypalane od razu na źródłowej bitmapie
  - [ ] Strzałka posiada domyślny kolor `#FF3B30`, obsługuje zmianę koloru i grubości oraz pozwala po narysowaniu przesuwać oba swoje końce `(x1, y1)` i `(x2, y2)` za pomocą uchwytów
  - [ ] Narzędzie Podkreślenie i zakreślacz obsługuje oba podtryby, stosuje `globalAlpha = 0.35` dla zakreślacza i wymusza idealny poziom (`y2 = y1`) przy przytrzymaniu `Shift`
  - [ ] Narzędzie Tekst pozwala umieścić, przesunąć i edytować pole tekstowe oraz przełączać kontrastowe tło i biały/kontrastowy obrys wokół liter
  - [ ] `Ctrl+Z` / `Cmd+Z` cofa kolejne operacje z historii, a `Delete` / `Backspace` usuwa zaznaczony obiekt
  - [ ] „Pobierz PNG” pobiera spłaszczony obraz z nazwą `<domena>_YYYY-MM-DD_HH-mm.png`, a „Kopiuj do schowka” kopiuje `image/png` do schowka systemowego
  - [ ] Testy jednostkowe silnika wektorowego, hit-testingu, historii `Ctrl+Z` i eksportera przechodzą (`npm test && npm run build`)
- **Depends on:** M03
- **Estimated size:** 8–10 tasks

## [ ] M05 - Quality and release: Playwright E2E tests, edge-case hardening and Web Store package
- **Phase:** 6–7 — Quality & release
- **Type:** release
- **What you will see:** Przed: funkcjonalna wtyczka przetestowana jednostkowo i manualnie. Po: zautomatyzowany zestaw testów End-to-End w **Playwright**, który uruchamia prawdziwą przeglądarkę Chromium z załadowaną wtyczką `--load-extension=./dist` i automatycznie weryfikuje popup, zrzuty, edytor wektorowy i eksport; pełna odporność na sytuacje brzegowe (ekstremalnie długie strony > `MAX_CANVAS_HEIGHT`, strony bez zaznaczenia, błędy limitu zapytań API Chrome); zielony pipeline CI GitHub Actions oraz gotowa do publikacji w Chrome Web Store paczka `snapmark-extension.zip` wraz z dokumentacją `README.md`.
- **Goal:** Zweryfikować wszystkie wymagania niefunkcjonalne i sytuacje brzegowe z `PRD §7, §10, §11`, zabezpieczyć produkt testami E2E w prawdziwej przeglądarce Chromium oraz przygotować finalną paczkę wydaniową v1.
- **Scope:**
  - Testy End-to-End **Playwright (`tests/e2e/extension.spec.ts`, `playwright.config.ts`)** ładujące zbudowaną wtyczkę z `./dist` w Chromium i weryfikujące:
    - otwarcie `popup.html`, detekcję stron chronionych oraz przełącznik żółtego podświetlenia
    - przepływ przechwycenia obrazu do `editor.html`, weryfikację wyczyszczenia rekordu w IndexedDB po załadowaniu na `<canvas>`
    - narysowanie wektorowej strzałki, przesunięcie jej grota, narysowanie zakreślacza z `Shift`, dodanie tekstu z obrysem, cofnięcie przez `Ctrl+Z` oraz wygenerowanie pliku PNG o nazwie `<domena>_YYYY-MM-DD_HH-mm.png`
  - Utwardzenie sytuacji brzegowych z `PRD §7`:
    - bezpieczne zatrzymanie zrzutu ze scrollem na `MAX_CANVAS_HEIGHT` wraz z wyświetleniem banera ostrzegawczego w `editor.html` (`04-Interface-spec.md §7.4`)
    - wykrycie stron ze scrollem wewnętrznym (gdy `window.scrollY` nie zmienia się po pierwszym kroku) i czyste zakończenie zrzutu bez duplikowania klatek
    - obsługa wywołania skrótu `Alt+Shift+S` przy braku zaznaczonego tekstu na stronie (czytelny komunikat bez otwierania pustego edytora)
  - Audyt prywatności, uprawnień i wydajności (`PRD §10–11`): automatyczny test weryfikujący brak jakichkolwiek zewnętrznych wywołań sieciowych (`https://`), brak `<all_urls>` w `manifest.json` oraz płynność 60 FPS przy rysowaniu na płótnie
  - Konfiguracja **GitHub Actions CI (`.github/workflows/ci.yml`)** uruchamiająca `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e` oraz skrypt pakujący `npm run package` (tworzący gotowy do wgrania w Chrome Web Store plik `snapmark-extension.zip`)
  - Kompletna dokumentacja `README.md` (instrukcja instalacji *Load unpacked*, opis 4 trybów zrzutu, skrótów klawiszowych, architektury Manifest V3 i budowania paczki)
- **Out of scope:**
  - Funkcje z listy Future Scope v2 (`PRD §12`)
- **Demo for the operator:**
  - Uruchom w katalogu głównym jedną komendę weryfikacyjną:
    `npm run typecheck && npm test && npm run build && npm run test:e2e && npm run package`
  - Obserwuj przechodzące testy jednostkowe Vitest oraz testy E2E Playwright w Chromium i sprawdź wygenerowany artefakt wydaniowy `snapmark-extension.zip` oraz `README.md`
- **Exit criteria:**
  - [ ] Zestaw testów Playwright E2E (`npm run test:e2e`) przechodzi w 100% na zbudowanej paczce `./dist` w przeglądarce Chromium
  - [ ] Wszystkie sytuacje brzegowe z `PRD §7` (krawędzie viewportu przy marginesie 20 px, brak zaznaczenia tekstu, `MAX_CANVAS_HEIGHT`, strony `chrome://`, rate-limit backoff `>= 550 ms`) są pokryte testami i działają zgodnie ze specyfikacją
  - [ ] Audyt potwierdza 0 zewnętrznych zapytań sieciowych, 0 zalegających rekordów w IndexedDB po otwarciu edytora oraz wyłącznie 4 uprawnienia w `manifest.json` (`activeTab`, `contextMenus`, `scripting`, `storage`)
  - [ ] Skrypt `npm run package` generuje poprawny plik `snapmark-extension.zip`, a `README.md` opisuje instalację, użytkowanie i architekturę
- **Depends on:** M04
- **Estimated size:** 5–7 tasks

## Coverage

| Requirement / screen | Milestone |
|---|---|
| `03-Design.md` Design tokens, Dark Studio Utility palette, typography & component styles | M01 |
| `04-Interface-spec.md §5.1` Extension Action Popup (`popup.html` — all 4 states: Ready, No-Selection, Scroll Progress, Restricted Page) | M01 (UI & states), M02–M03 (live Chrome bindings) |
| `04-Interface-spec.md §5.2` Vector Annotation Editor (`editor.html` — `56px` 4-cluster toolbar & HiDPI canvas stage) | M01 (UI layout), M02 (IndexedDB stage loader), M04 (vector engine & export) |
| `04-Interface-spec.md §5.3` Editor Empty / Fallback State (`Ctrl+V` clipboard paste & local file loader) | M01 (UI), M02 (live paste & file loading logic) |
| `PRD §4.1` Tryb 1: Zrzut zaznaczonego fragmentu tekstu (`Range.getBoundingClientRect()`, `20px` padding, `devicePixelRatio`, optional yellow highlight) | M01 (Popup UI), M03 (DOM injection & crop logic) |
| `PRD §4.2` Tryb 2: Zrzut wybranego obrazka `<img>` (`contexts: ["image"]`, crop from `captureVisibleTab`, CORS & AVIF/WebP bypass) | M01 (Popup hint UI), M03 (context menu & image crop logic) |
| `PRD §4.3` Tryb 3: Zrzut widocznego ekranu (Viewport — popup button, context menu, `Alt+Shift+V`) | M01 (Popup UI), M02 (end-to-end capture logic) |
| `PRD §4.4` Tryb 4: Zrzut całej strony ze scrollem (`window.scrollTo`, `>= 550 ms` throttling, hiding `fixed`/`sticky` after Frame #1, stitching) | M01 (Progress UI), M03 (scroll loop, rate-limiting & stitching logic) |
| `PRD §4.5` Narzędzie 1: Wektorowa Strzałka (`#FF3B30` default, stroke width, color picker, post-draw endpoint handle dragging) | M01 (Toolbar UI), M04 (vector canvas rendering & hit-testing) |
| `PRD §4.5` Narzędzie 2: Podkreślenie i zakreślacz 2-w-1 (`Shift` horizontal axis lock, `globalAlpha = 0.35` highlighter) | M01 (Toolbar UI), M04 (vector canvas rendering & Shift constraint) |
| `PRD §4.5` Narzędzie 3: Tekst (in-canvas `<textarea>`, contrasting background pill mode & white stroke outline mode) | M01 (Toolbar UI), M04 (interactive overlay & vector rendering) |
| `PRD §4.5 & §9` Narzędzie 4: Cofnij (`Ctrl+Z` / `Cmd+Z`), Usuń (`Delete`), Pobierz PNG (`domena-pl_YYYY-MM-DD_HH-mm.png`) & Kopiuj do schowka | M01 (Toolbar UI), M02 (filename formatter), M04 (undo stack & flattened export) |
| `PRD §6.1–6.3` Manifest V3 minimal permissions (`activeTab`, `contextMenus`, `scripting`, `storage`) & IndexedDB `Blob` transfer with immediate cleanup | M02 |
| `PRD §8` User Settings & Configuration in `chrome.storage.local` | M02 |
| `PRD §7, §10, §11` Edge cases (`MAX_CANVAS_HEIGHT`, restricted pages, rate-limit retry), non-functional requirements, Playwright E2E & Web Store release package | M05 (hardening & E2E), unit criteria in M02–M04 |
