# PRD: SnapMark — Szybkie zrzuty kontekstowe z lekkim edytorem adnotacji

## 1. Product Description

**SnapMark** to lekka, szanująca prywatność wtyczka do przeglądarek opartych na silniku Chromium (Google Chrome, Brave, Edge, Arc), zbudowana w architekturze **Manifest V3**. Wtyczka eliminuje wieloetapowy proces robienia zrzutów ekranu, ręcznego wycinania ich w systemowym narzędziu i przeklejania do zewnętrznego programu graficznego.

Produkt oferuje **4 kontekstowe tryby przechwytywania**:
1. **Zaznaczony fragment tekstu** (z automatycznym marginesem bezpieczeństwa i opcjonalnym podświetleniem na żółto),
2. **Wybrany obrazek `<img>`** (wycinany z widoku karty z pominięciem blokad CORS i formatów WebP/AVIF),
3. **Widoczny ekran (Viewport)**,
4. **Cała strona ze scrollem** (z automatycznym ukrywaniem pływających nagłówków `fixed`/`sticky` i kontrolą limitu zapytań API Chrome).

Po wykonaniu zrzutu wtyczka natychmiast otwiera lokalną kartę `editor.html` z minimalistycznym, wektorowym edytorem adnotacji (Strzałka, Podkreślenie i zakreślacz, Tekst, Cofnij `Ctrl+Z`) oraz błyskawicznym eksportem do pliku PNG lub bezpośrednio do schowka systemowego. Całość działa w 100% lokalnie bez kont użytkowników, bez chmury i bez inwazyjnego uprawnienia `<all_urls>`.

---

## 2. Problem & Goals

### 2.1 Problem Statement
W codziennej pracy przeglądarkowej (zgłaszanie błędów, design/code review, tworzenie instrukcji, cytowanie artykułów na Slacku/Teams) wykonanie estetycznego zrzutu ekranu z prostą adnotacją wiąże się z dużym tarciem:
- **Narzędzia systemowe (macOS Screenshot / Windows Snipping Tool)** nie mają świadomości drzewa DOM. Wymagają ręcznego celowania kursorem wokół akapitu tekstu lub zdjęcia, co skutkuje nierównymi marginesami lub uciętym tekstem, oraz nie potrafią wykonać zrzutu całej strony ze scrollem.
- **Natywne zapisywanie grafik („Zapisz grafikę jako…”)** często zawodzi przez polityki CORS, pobiera pliki w formatach `AVIF`/`WebP` nieakceptowanych przez część narzędzi i nie pozwala na szybkie dorysowanie strzałki czy komentarza przed wysłaniem.
- **Rozbudowane wtyczki z Chrome Web Store (Awesome Screenshot, Nimbus, Loom)** wymagają szerokich uprawnień (`<all_urls>` — dostęp do wszystkich danych na odwiedzanych stronach), zmuszają do rejestracji konta, wypychają zrzuty do chmury i przytłaczają dziesiątkami rzadko używanych funkcji.

### 2.2 Product Goals
1. **Błyskawiczny czas od intencji do udostępnienia (< 5 sekund)**: Przejście od zaznaczenia tekstu lub kliknięcia PPM na obrazek do skopiowania gotowego, opisanego zrzutu do schowka w mniej niż 5 sekund.
2. **Perfekcyjna ostrość i kadrowanie DOM-aware**: Zrzuty wycinane automatycznie na podstawie `getBoundingClientRect()` z pełnym uwzględnieniem `window.devicePixelRatio` (ekrany Retina / 4K / skalowanie Windows 125%–200%) i równym marginesem bezpieczeństwa (domyślnie `20 px`).
3. **Architektura Zero-Invasive Permissions**: Działanie wyłącznie na uprawnieniach `activeTab`, `contextMenus`, `scripting` oraz `storage` (ew. `clipboardWrite`), co gwarantuje pełną prywatność użytkowników i szybką weryfikację w Chrome Web Store.
4. **Niezawodność dla dużych zrzutów**: Bezstratny transfer pełnowymiarowych zrzutów ze scrollem do edytora z ominięciem limitów długości URL i limitów pojedynczego klucza `chrome.storage.local` poprzez wykorzystanie **IndexedDB** (lub `chrome.storage.session`) oraz pełna obsługa limitu `MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND`.

---

## 3. Target Audience

- **Primary Persona — Product Manager / QA Engineer / Software Developer**:
  - *Kontekst*: Spędza 6–8 godzin dziennie w przeglądarce; testuje aplikacje webowe, zgłasza bugi w Jira/Linear/GitHub Issues i wymienia szybkie uwagi na Slacku.
  - *Potrzeba*: Chce zaznaczyć błędny tekst lub element UI, jednym ruchem dorysować wyraźną czerwoną strzałkę (`#FF3B30`) z krótkim opisem i kliknąć „Kopiuj do schowka”, nie zapisując śmieciowych plików na pulpicie.
- **Secondary Persona — Content Creator / Researcher / Marketer**:
  - *Kontekst*: Czyta artykuły branżowe, raporty i dokumentację; zbiera wycinki oraz wykresy/zdjęcia do Notion, Obsidiana lub prezentacji.
  - *Potrzeba*: Chce szybko wyciąć zaznaczony akapit z równym marginesem (i opcjonalnym żółtym podświetleniem) lub pobrać jako czysty PNG dowolny obrazek `<img>` ze strony, nawet jeśli strona serwuje `AVIF` lub blokuje pobieranie.
- **Stakeholders**:
  - *Administratorzy IT / Bezpieczeństwa w firmach*: Oczekują, że wtyczka instalowana przez pracowników nie żąda uprawnień `<all_urls>` i nie wysyła zrzutów ekranu wewnętrznych systemów na zewnętrzne serwery.

---

## 4. Functional Requirements

### 4.1 Tryb 1: Zaznaczony fragment ekranu oraz zaznaczony tekst (Interactive Area & Text Selection Capture — updated by `07-feature-plan-interactive-area-selection`)

| Aspect | Description |
|--------|-------------|
| **User Story** | 1. **Interaktywny fragment ekranu (Popup / `Alt+Shift+S`)**: Jako użytkownik chcę kliknąć opcję **„Zaznacz fragment ekranu”** w popupie (lub wcisnąć `Alt+Shift+S`) i przeciągnąć myszą dowolny prostokątny kawałek strony, aby zrobić zrzut dokładnie tego wycinka.<br>2. **Zaznaczony tekst (PPM)**: Jako użytkownik czytający stronę chcę zaznaczyć fragment tekstu i wywołać zrzut z menu kontekstowego PPM, aby otrzymać wykadrowany wycinek tekstu z marginesem 20 px i opcjonalnym żółtym podświetleniem. |
| **Trigger** | 1. **Przycisk „Zaznacz fragment ekranu” w popupie (`#btn-capture-selection`)** lub skrót klawiszowy `Alt + Shift + S` (zawsze aktywny na dozwolonych stronach WWW — uruchamia na stronie pełnoekranowy celownik `selectAreaOverlayInDom`).<br>2. Menu kontekstowe PPM na zaznaczonym tekście (`contexts: ["selection"]`): pozycja **„Zrób zrzut zaznaczenia”**. |
| **Acceptance Criteria** | 1. **Interaktywna nakładka wyboru obszaru (`selectAreaOverlayInDom` — `07-feature-plan-interactive-area-selection`)**: Po kliknięciu karty w popupie (popup zamyka się) lub użyciu `Alt+Shift+S`, skrypt wstrzyknięty przez `chrome.scripting.executeScript` tworzy pełnoekranową warstwę `[data-snapmark-area-overlay]` (`position: fixed; inset: 0; z-index: 2147483647; cursor: crosshair`). Użytkownik przeciąga myszą prostokąt (`mousedown` → `mousemove` → `mouseup`), widząc na żywo czerwoną ramkę `#FF3B30`, przyciemnione tło wokół wycinka oraz licznik wymiarów `W × H px`. Klawisz `Escape` anuluje wycinanie. Po puszczeniu przycisku myszy (`mouseup`) nakładka jest natychmiast usuwana z DOM (w bloku `finally`), skrypt odczekuje klatkę renderowania (`requestAnimationFrame`) i zwraca `cropRectCss` oraz `window.devicePixelRatio` do Service Workera.<br>2. **Wycinanie zaznaczonego tekstu z PPM (`measureSelectionInDom`)**: Skrypt pobiera aktywne zaznaczenie (`window.getSelection().getRangeAt(0)`), mierzy `Range.getBoundingClientRect()` (centrując w razie potrzeby przez `scrollIntoView`), dodaje automatyczny margines bezpieczeństwa **20 px CSS** ograniczony do krawędzi viewportu i opcjonalnie nakłada żółte podświetlenie `[data-snapmark-highlight]` (`rgba(255, 235, 59, 0.45)`) na czas zrzutu.<br>3. Wszystkie współrzędne CSS (`x, y, width, height`) są mnożone przez `window.devicePixelRatio` przed wycięciem obszaru ze zrzutu zwróconego przez `chrome.tabs.captureVisibleTab()`.<br>4. Wycięty obraz trafia jako `Blob` do pamięci tymczasowej IndexedDB i otwiera się w `editor.html`. |

### 4.2 Tryb 2: Zrzut wybranego obrazka (Image Element Capture)

| Aspect | Description |
|--------|-------------|
| **User Story** | Jako użytkownik chcę kliknąć prawym przyciskiem myszy na dowolny obrazek `<img>` i otworzyć go od razu w edytorze, omijając problemy z CORS, formatami WebP/AVIF i blokadami zapisu. |
| **Trigger** | Menu kontekstowe PPM na elemencie `<img>` (`contexts: ["image"]`): pozycja **„Edytuj i pobierz obrazek”**. |
| **Acceptance Criteria** | 1. Wtyczka **nie** pobiera pliku źródłowego przez `fetch(srcUrl)` (co mogłoby zawieść przez CORS, autoryzację ciasteczkową lub zwrócić surowy plik SVG/AVIF o innych wymiarach niż wyrenderowany element).<br>2. Skrypt w kontekście strony lokalizuje kliknięty element `<img>` (poprzez zapamiętany ostatni cel zdarzenia `contextmenu` lub dopasowanie `info.srcUrl` / `currentSrc` wśród widocznych elementów `<img>`).<br>3. Jeżeli obrazek jest częściowo ucięty przez krawędź okna, ale mieści się w wysokości viewportu, skrypt przewija go do widoku (`scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })`) i odczekuje 1 klatkę renderowania.<br>4. Pobiera `imgElement.getBoundingClientRect()` (ograniczone do widocznego viewportu), mnoży `(x, y, width, height)` przez `window.devicePixelRatio` i wycina dokładnie ten prostokąt ze zrzutu `chrome.tabs.captureVisibleTab()`.<br>5. Obraz otwiera się w karcie `editor.html` gotowy do adnotacji lub pobrania jako standardowy PNG. |

### 4.3 Tryb 3: Zrzut widocznego ekranu (Visible Viewport Capture)

| Aspect | Description |
|--------|-------------|
| **User Story** | Jako użytkownik chcę jednym kliknięciem lub skrótem klawiszowym przechwycić dokładnie to, co widzę obecnie w karcie przeglądarki, bez zaznaczania czegokolwiek. |
| **Trigger** | 1. Przycisk **„Widoczny ekran (Viewport)”** w popupie wtyczki.<br>2. Skrót klawiszowy `Alt + Shift + V`.<br>3. Pozycja w menu kontekstowym strony (`contexts: ["page"]`): **„Zrób zrzut widocznego ekranu”**. |
| **Acceptance Criteria** | 1. Service Worker wywołuje `chrome.tabs.captureVisibleTab(windowId, { format: 'png' })`.<br>2. Zrzut w natywnej rozdzielczości fizycznej (Retina/4K) zostaje zapisany jako `Blob` w IndexedDB wraz z metadanymi źródłowej karty (domena, tytuł, `devicePixelRatio`, znacznik czasu).<br>3. Nowa karta `editor.html` otwiera się natychmiast (< 300 ms od wywołania). |

### 4.4 Tryb 4: Zrzut całej strony ze scrollem (Full-Page Scroll Capture)

| Aspect | Description |
|--------|-------------|
| **User Story** | Jako użytkownik chcę zrzucić całą długą stronę internetową od góry do dołu na jeden spójny obraz bez powielonych na każdej klatce pływających pasków nawigacyjnych. |
| **Trigger** | 1. Przycisk **„Cała strona ze scrollem”** w popupie wtyczki.<br>2. Skrót klawiszowy `Alt + Shift + F`. |
| **Acceptance Criteria** | 1. Skrypt pomiarowy zapisuje oryginalną pozycję scrolla (`window.scrollX, window.scrollY`) oraz wylicza całkowitą wysokość dokumentu (`Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)`) i wysokość viewportu (`window.innerHeight`).<br>2. Na czas przechwytywania tymczasowo ukrywa pasek przewijania (`document.documentElement.style.overflow = 'hidden'` lub `scrollbar-width: none`) oraz wyłącza płynne przewijanie (`scroll-behavior: auto`).<br>3. Przewija na samą górę (`window.scrollTo(0, 0)`) i wykonuje **Klatkę #1** (dzięki czemu elementy `position: fixed` oraz `position: sticky` na górze strony są widoczne dokładnie raz, w swoim naturalnym miejscu na szczycie zrzutu).<br>4. Po Klatce #1 skrypt wykrywa wszystkie widoczne elementy o obliczonym stylu `getComputedStyle(el).position === 'fixed'` lub `'sticky'` i tymczasowo ukrywa je (np. `visibility: hidden !important` z zapisaniem oryginalnej wartości w atrybucie/WeakMap), aby nie dublowały się na kolejnych klatkach.<br>5. Pętla przewija stronę krok po kroku o `window.innerHeight` (ostatnia klatka może mieć mniejszy przyrost — wyliczany jest dokładny offset `deltaY` dla dolnej części strony).<br>6. **Throttling pod limit Chrome API**: Między kolejnymi wywołaniami `chrome.tabs.captureVisibleTab()` zachowany jest odstęp **minimum 550 ms** (aby nie przekroczyć `MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND = 2`), uzupełniony o obsługę retry z backoffem w razie błędu rate-limitu.<br>7. W trakcie przewijania użytkownik widzi nieinwazyjny wskaźnik postępu (w popupie lub jako lekki pasek postępu / badge na ikonie rozszerzenia, usuwany przed samym strzałem `captureVisibleTab`).<br>8. Po zebraniu wszystkich klatek skrypt przywraca ukryte elementy `fixed`/`sticky`, styl scrollbara oraz oryginalną pozycję `window.scrollTo()`.<br>9. Klatki są sklejane w jeden obraz na elemencie `<canvas>` (lub `OffscreenCanvas`) z uwzględnieniem `devicePixelRatio` i ewentualnego przesunięcia ostatniej klatki, a wynikowy `Blob` otwiera się w `editor.html`. |

### 4.5 Lekki edytor adnotacji i eksport (`editor.html`)

| Narzędzie / Funkcja | Szczegółowe zachowanie i wymagania |
|---------------------|------------------------------------|
| **Architektura płótna (Vector Overlay)** | Edytor wyświetla zrzut ekranu jako tło (bitmapa źródłowa), a wszystkie adnotacje przechowuje w tablicy obiektów wektorowych (`annotations = []`) i przerysowuje w pętli renderującej `<canvas>`. Bitmapa i warstwa wektorowa są spłaszczane do jednego obrazu dopiero w momencie eksportu („Pobierz PNG” / „Kopiuj do schowka”). |
| **1. Strzałka (wektorowa)** | - Rysowanie jednym przeciągnięciem myszy (`mousedown` -> `mousemove` -> `mouseup`) od punktu początkowego `(x1, y1)` do grota `(x2, y2)`.<br>- Automatyczne rysowanie proporcjonalnego, wypełnionego grota strzałki zależnego od kąta nachylenia i wybranej grubości linii.<br>- Domyślny kolor: wyraźny czerwony `#FF3B30`. Możliwość zmiany koloru z predefiniowanej palety (np. Czerwony `#FF3B30`, Żółty `#FFCC00`, Zielony `#34C759`, Niebieski `#007AFF`, Biały `#FFFFFF`, Czarny `#1C1C1E`) oraz wyboru grubości (np. Cienka `2px`, Średnia `4px`, Gruba `8px` — skalowane względem DPI zrzutu).<br>- **Edycja po narysowaniu**: Kliknięcie istniejącej strzałki wyświetla dwa uchwyty kontrolne (handles) na jej końcach `(x1, y1)` oraz `(x2, y2)`, pozwalające swobodnie przesunąć grot lub początek strzałki oraz przesunąć całą strzałkę. |
| **2. Podkreślenie i zakreślacz (2-w-1)** | Jeden przycisk narzędzia z przełącznikiem dwóch podtrybów (lub szybkim wyborem na pasku właściwości):<br>- **Podkreślenie (Underline)**: Rysuje prostą linię pod tekstem (`globalAlpha = 1.0`). Przytrzymanie klawisza `Shift` podczas przeciągania wymusza idealnie poziomą (lub pionową) linię (`y2 = y1`).<br>- **Zakreślacz (Highlighter)**: Rysuje szeroki, półprzezroczysty pas markera (`ctx.globalAlpha = 0.35`, `lineCap = 'butt'` lub `'round'`, domyślna wysokość np. `24px` skalowana do DPI) do zakreślania całych wierszy tekstu. Przytrzymanie `Shift` również blokuje ruch w idealnym poziomie. |
| **3. Tekst** | - Kliknięcie w dowolne miejsce na zrzucie tworzy natychmiast aktywne, edytowalne pole tekstowe (nakładka HTML `<textarea>`/`contenteditable` pozycjonowana nad płótnem podczas pisania, po zatwierdzeniu renderowana jako obiekt wektorowy w tablicy `annotations`, z możliwością ponownego kliknięcia w celu edycji lub przesunięcia).<br>- **Opcje czytelności (Readability Mode)**: Przełącznik stylu tekstu umożliwiający włączenie:<br>  a) **Kontrastowego tła (Pill / Box)** — np. ciemne/jasne lub kolorowe zaokrąglone tło pod tekstem,<br>  b) **Białego/kontrastowego obrysu (Stroke Outline)** wokół liter (`ctx.strokeText` przed `ctx.fillText`), gwarantującego czytelność napisu zarówno na ciemnym, jak i jasnym tle zrzutu. |
| **4. Cofnij, Zarządzanie i Eksport** | - **Historia zmian (`Ctrl + Z` / `Cmd + Z`)**: Przycisk „Cofnij” na pasku oraz obsługa skrótu klawiszowego cofająca ostatnią operację (dodanie, przesunięcie lub edycję obiektu w tablicy wektorowej). Dodatkowo `Delete` / `Backspace` usuwa aktualnie zaznaczony obiekt wektorowy.<br>- **Pobierz PNG**: Spłaszcza zrzut wraz z warstwą wektorową w pełnej rozdzielczości i pobiera plik z automatyczną nazwą w formacie `<domena-z-myslnikami>_YYYY-MM-DD_HH-mm.png` (np. `domena-pl_2026-11-21_14-10.png`).<br>- **Kopiuj do schowka**: Spłaszcza obraz do `Blob` (`image/png`) i zapisuje go w schowku systemowym za pomocą `navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])`, wyświetlając czytelne potwierdzenie wizualne („Skopiowano do schowka!”). |

---

### 4.6 Wymagania M07 — `editor-capture-improvements`

Poniższe wymagania zastępują sprzeczne wcześniejsze opisy paska i eksportu do schowka; wklejanie ze schowka w pustym edytorze pozostaje dostępne.

- **FR-01:** Zrzut całej strony zaczyna się po potwierdzeniu położenia i wyrenderowania samej góry strony; przy zakończeniu, błędzie i anulowaniu przywraca pierwotną pozycję i style.
- **FR-02:** Kompaktowy pasek edytora nie pokazuje nazwy ani wymiarów obrazu i nie oferuje kopiowania wyniku do schowka. Zachowuje narzędzia, kontrolki adnotacji i automatyczne nazewnictwo PNG.
- **FR-03:** Strzałka ma połączony trzon i czytelny wypełniony grot w kierunku przeciągania, z poprawnym wyglądem w edytorze i eksporcie.
- **FR-04:** Kliknięcie pustego miejsca odznacza strzałkę lub linię; przeciąganie rysuje nowy obiekt, a ponowne zaznaczanie, uchwyty i przesuwanie działają.
- **FR-05:** Narzędzie Tekst umożliwia wpisywanie, zatwierdzanie, ponowną edycję i eksport tekstu w rzeczywistej wtyczce.
- **FR-06:** Pobranie PNG zamyka kartę edytora dopiero po potwierdzonym zakończeniu pobierania; błąd lub anulowanie pozostawia kartę i adnotacje oraz pokazuje błąd.
- **FR-07:** Dostępny i opisany przycisk na pasku zamyka kartę edytora.
- **FR-08:** Testy regresji i rzeczywistego rozszerzenia Chromium obejmują powyższe oraz istniejące tryby zrzutu, adnotacje i eksport.

## 5. User Experience & Interface (if applicable)

### 5.1 User Flows

#### Flow A: Zrzut zaznaczonego tekstu lub obrazka (Context Menu Flow)
1. Użytkownik zaznacza akapit tekstu na stronie (lub naprowadza kursor na `<img>`).
2. Klika PPM i wybiera **„Zrób screena zaznaczenia”** (lub **„Edytuj i pobierz obrazek”**).
3. Wtyczka w ułamku sekundy pobiera współrzędne `getBoundingClientRect()`, przelicza je przez `devicePixelRatio`, wykonuje zrzut, przycina obraz i zapisuje `Blob` w IndexedDB.
4. Otwiera się nowa karta `editor.html` z gotowym wycinkiem wyśrodkowanym na ekranie.
5. Użytkownik ma domyślnie wybrane narzędzie **Strzałka** (lub ostatnio używane narzędzie), rysuje strzałkę jednym ruchem i klika **„Kopiuj do schowka”**.

#### Flow B: Zrzut widocznego okna lub całej strony (Popup / Shortcut Flow)
1. Użytkownik klika ikonę SnapMark na pasku Chrome (lub wciska `Alt + Shift + V` / `Alt + Shift + F`).
2. W przypadku zrzutu całej strony ze scrollem strona przewija się automatycznie z odstępami ~550 ms, po pierwszej klatce chowając pływające nagłówki.
3. Po zakończeniu sklejania otwiera się `editor.html` ze zrzutem całej strony, umożliwiając przewijanie płótna, dodanie adnotacji i pobranie pliku `domena-pl_2026-11-21_14-10.png`.

### 5.2 UI States

- **Initial / Empty State**:
  - *Popup*: Kompaktowe menu z przyciskami trybów przechwytywania (Widoczny ekran, Cała strona ze scrollem, Zaznaczony tekst — aktywny, gdy na stronie wykryto zaznaczenie), podpowiedziami skrótów klawiszowych oraz przełącznikiem *„Podświetl zaznaczony tekst na żółto”*.
  - *Edytor (`editor.html` bez przekazanego zrzutu)*: Jeśli użytkownik otworzy adres `editor.html` ręcznie bez aktywnego zrzutu, wyświetla przyjazny ekran pustego stanu z informacją, jak wykonać zrzut (lub opcją wklejenia obrazu ze schowka `Ctrl+V` / wczytania pliku z dysku).
- **Active State (Edytor)**:
  - Górny, przypięty pasek narzędzi (Top Toolbar) zawierający 4 główne sekcje:
    1. Narzędzia rysowania: **Strzałka**, **Podkreślenie / Zakreślacz**, **Tekst**.
    2. Kontekstowe opcje stylu: wybór koloru (domyślnie `#FF3B30`), grubości linii, przełącznik Podkreślenie <-> Zakreślacz (z podpowiedzią `Shift = prosto`), przełącznik stylu tekstu (Tło / Obrys).
    3. Historia: **Cofnij (`Ctrl+Z`)** (oraz usunięcie wybranego obiektu).
    4. Akcje wyjściowe: **Kopiuj do schowka** (przycisk główny / akcentowany) oraz **Pobierz PNG**.
  - Centralny obszar roboczy (Canvas Viewport) z neutralnym ciemnym/szarym tłem wokół zrzutu i delikatnym cieniem pod przechwyconym obrazem.
- **Loading State (Scroll Capture w toku)**:
  - Podczas zrzutu całej strony ze scrollem użytkownik widzi postęp (np. `Przechwytywanie: klatka 3 z 7...` oraz możliwość anulowania klawiszem `Esc`). Jeśli wskaźnik postępu znajduje się w DOM strony, jest ukrywany na czas wywołania `captureVisibleTab` lub wyświetlany w popupie / tytule karty / badge'u ikony rozszerzenia (`chrome.action.setBadgeText`), aby nie zanieczyścić samego zrzutu.
- **Success State**:
  - Po kliknięciu **„Kopiuj do schowka”** przycisk zmienia stan na 2 sekundy na `✓ Skopiowano!` (z zielonym akcentem).
  - Po kliknięciu **„Pobierz PNG”** uruchamia się natywne pobieranie pliku z wygenerowaną nazwą `domena_YYYY-MM-DD_HH-mm.png`.
- **Error State**:
  - Próba wykonania zrzutu na stronach zastrzeżonych przez przeglądarkę (`chrome://`, `edge://`, `about:blank`, strony Chrome Web Store) wyświetla w popupie czytelny komunikat: *„Przeglądarka Chrome ze względów bezpieczeństwa blokuje wykonywanie zrzutów na stronach systemowych i w Chrome Web Store.”*

---

## 6. Technical Architecture & Constraints

### 6.1 Logical / System Architecture

Wtyczka dzieli się na 4 współpracujące moduły zgodne z Manifest V3:

1. **Background Service Worker (`background.js`)**:
   - Rejestruje pozycje menu kontekstowego (`chrome.contextMenus.create`) przy instalacji (`onInstalled`):
     - `capture-selection` (`contexts: ["selection"]`, tytuł: *„Zrób screena zaznaczenia”*),
     - `capture-image` (`contexts: ["image"]`, tytuł: *„Edytuj i pobierz obrazek”*),
     - `capture-viewport` (`contexts: ["page"]`, tytuł: *„Zrób zrzut widocznego ekranu”*).
   - Nasłuchuje skrótów klawiszowych (`chrome.commands.onCommand`) oraz komunikatów z `popup.js`.
   - Wstrzykuje skrypt pomocniczy (`chrome.scripting.executeScript`) do aktywnej karty w celu pomiaru współrzędnych DOM, obsługi podświetlenia lub sterowania pętlą scrollowania.
   - Wywołuje `chrome.tabs.captureVisibleTab()` z kontrolą rate-limitingu.
   - Zapisuje przechwycone klatki / wycięty `Blob` w bazie **IndexedDB** kontekstu rozszerzenia i otwiera kartę `chrome.tabs.create({ url: 'editor.html?captureId=<uuid>' })`.
2. **On-Demand Content Script (`capture-injected.js`)**:
   - Wstrzykiwany **wyłącznie na żądanie** dzięki uprawnieniom `activeTab` + `scripting` (brak stałych `content_scripts` w `manifest.json`, co eliminuje wymóg `<all_urls>`).
   - Odpowiada za:
     - pomiar `Range.getBoundingClientRect()` dla zaznaczenia tekstu + dodanie marginesu `20 px` + opcjonalne żółte podświetlenie,
     - identyfikację klikniętego elementu `<img>` i pomiar jego `getBoundingClientRect()`,
     - orkiestrację przewijania strony (`window.scrollTo`), ukrywanie i przywracanie elementów `position: fixed / sticky` po pierwszej klatce oraz odczyt `window.devicePixelRatio`.
3. **Popup UI (`popup.html` / `popup.js`)**:
   - Szybki panel uruchamiania trybów (Viewport, Cała strona ze scrollem, Zaznaczenie) oraz zapisu lekkich preferencji użytkownika w `chrome.storage.local` (np. czy podświetlać zaznaczony tekst na żółto).
4. **Vector Annotation Editor (`editor.html` / `editor.js`)**:
   - Odczytuje rekord `captureId` z IndexedDB, renderuje obraz bazowy (lub kończy sklejanie i przycinanie klatek na pełnym `<canvas>`) i **natychmiast usuwa dane tymczasowe z IndexedDB** po wczytaniu ich na płótno.
   - Utrzymuje stan warstwy wektorowej (`annotations[]`, `selectedId`, `historyStack[]`), obsługuje interakcje myszy/klawiatury (`Shift`, `Ctrl+Z`, `Delete`, przeciąganie uchwytów strzałki) oraz eksport do PNG i schowka.

### 6.2 Technical Stack & Constraints

- **Platforma**: Chrome Extension Manifest V3 (Chromium 114+).
- **Uprawnienia (`manifest.json`)**:
  - `"permissions": ["activeTab", "contextMenus", "scripting", "storage"]` (oraz `"clipboardWrite"` jeśli wymagane dla kompatybilności schowka w starszych wersjach Chromium, choć w aktywnej karcie `editor.html` po kliknięciu użytkownika `navigator.clipboard.write` działa natywnie).
  - **Brak `host_permissions: ["<all_urls>"]`**.
- **Skalowanie DPI (Retina / 4K)**:
  - `chrome.tabs.captureVisibleTab()` zwraca bitmapę w fizycznych pikselach urządzenia, natomiast `getBoundingClientRect()` zwraca piksele CSS.
  - Każda operacja wycinania (crop) stosuje przelicznik:
    - `cropX = Math.round(rect.x * dpr)`
    - `cropY = Math.round(rect.y * dpr)`
    - `cropWidth = Math.round(rect.width * dpr)`
    - `cropHeight = Math.round(rect.height * dpr)`
- **Limit wywołań `captureVisibleTab`**:
  - Chrome narzuca `MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND` (2 wywołania/s). Pętla zrzutu ze scrollem stosuje minimalne opóźnienie **550 ms** między kolejnymi klatkami.
- **Transfer obrazu do edytora**:
  - Wykorzystanie **IndexedDB** (`SnapMarkDB`, object store `captures`) dzielonego w obrębie originu `chrome-extension://<id>/`. Pozwala to przesyłać surowe obiekty `Blob` (lub tablicę klatek `Blob[]` przy długim scrollu) o rozmiarze kilkudziesięciu megabajtów bez serializacji do ciągów Base64 i bez ryzyka przekroczenia limitu 10 MB w `chrome.storage.session`.

### 6.3 Data Model (High-Level)

#### 1. Tymczasowy rekord przechwycenia w IndexedDB (`CaptureSession`)
```json
{
  "id": "cap_1763730600000",
  "mode": "selection | image | viewport | fullpage",
  "sourceUrl": "https://domena.pl/artykul",
  "sourceDomain": "domena-pl",
  "capturedAt": "2026-11-21T14:10:00.000Z",
  "dpr": 2,
  "cropRectCss": { "x": 120, "y": 240, "width": 640, "height": 180 },
  "frames": [
    {
      "blob": "<Blob image/png>",
      "scrollYCss": 0,
      "viewportWidthCss": 1440,
      "viewportHeightCss": 900
    }
  ],
  "totalWidthCss": 1440,
  "totalHeightCss": 900
}
```

#### 2. Obiekty warstwy wektorowej w edytorze (`AnnotationItem`)
```json
[
  {
    "id": "ann_1",
    "type": "arrow",
    "x1": 150,
    "y1": 120,
    "x2": 340,
    "y2": 210,
    "color": "#FF3B30",
    "strokeWidth": 4
  },
  {
    "id": "ann_2",
    "type": "line",
    "subtype": "underline | highlighter",
    "x1": 200,
    "y1": 310,
    "x2": 580,
    "y2": 310,
    "color": "#FFCC00",
    "strokeWidth": 24,
    "alpha": 0.35
  },
  {
    "id": "ann_3",
    "type": "text",
    "x": 360,
    "y": 190,
    "text": "Błąd wyrównania przycisku",
    "color": "#FF3B30",
    "fontSize": 20,
    "styleMode": "background | outline | plain"
  }
]
```

---

## 7. Edge Cases & Error Handling

| Scenario / Edge Case | Expected System Behavior / Resolution |
|----------------------|---------------------------------------|
| **Zaznaczony tekst przy samej krawędzi okna (mniej niż 20 px od brzegu viewportu)** | Margines bezpieczeństwa (`20 px`) jest klamrowany (clamped) do granic widocznego okna: `x = Math.max(0, rect.left - 20)`, `y = Math.max(0, rect.top - 20)`, a prawa/dolna krawędź nie przekracza `window.innerWidth` / `window.innerHeight`. |
| **Zaznaczony tekst jest dłuższy niż wysokość jednego ekranu (Viewport)** | Skrypt przewija do początku zaznaczenia (z marginesem górnym 20 px) i przechwytuje maksymalny obszar mieszczący się w widocznym oknie (lub w trybie wieloklatkowym przycina zakres od początku do końca zaznaczenia). W v1 przy zrzucie pojedynczej klatki użytkownik otrzymuje pełny widoczny fragment zaznaczenia. |
| **Obrazek `<img>` kliknięty PPM nie posiada unikalnego `src` (np. `blob:`, `data:` lub zduplikowany URL na stronie)** | Przy otwarciu menu kontekstowego (lub podczas wstrzyknięcia skryptu) wtyczka identyfikuje właściwy element `<img>` po dopasowaniu `currentSrc`/`src` oraz weryfikacji, że element znajduje się w aktualnym viewporcie (`rect.width > 0 && rect.height > 0`). |
| **Przekroczenie limitu `MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND` podczas zrzutu ze scrollem** | Pętla wymusza odstęp `>= 550 ms` między klatkami. Jeśli mimo to Chrome zwróci błąd rate-limit, Service Worker przechwytuje wyjątek, odczekuje dodatkowe `600 ms` i ponawia ujęcie tej samej klatki (do 3 prób). |
| **Bardzo długa strona przekraczająca maksymalny wymiar `<canvas>` przeglądarki (np. > 32 767 px fizycznych na ekranie Retina)** | Pętla scrollowania posiada bezpieczny limit wysokości fizycznej płótna (np. `MAX_CANVAS_HEIGHT = 16384` lub `32000` px fizycznych; powyżej tej wysokości zrzut kończy przewijanie na maksymalnej bezpiecznej klatce i informuje użytkownika w edytorze banerem: *„Osiągnięto maksymalną bezpieczną wysokość obrazu dla pełnej rozdzielczości”*). |
| **Elementy `position: fixed / sticky` zasłaniające treść podczas zrzutu ze scrollem** | Na Klatce #1 (góra strony) elementy te są pozostawione bez zmian. Przed Klatką #2 skrypt przechodzi przez drzewo DOM, znajduje elementy z `computedStyle.position` równym `fixed` lub `sticky` i ustawia im tymczasowo `visibility: hidden !important`. Po zakończeniu pętli (lub w bloku `finally` przy błędzie/anulowaniu) przywraca ich pierwotny styl. |
| **Strony z leniwym ładowaniem obrazków (Lazy Loading) lub animacjami podczas scrollowania** | W trakcie pętli scrollowania okres oczekiwania `550 ms` na nowej pozycji `scrollTo` pozwala przeglądarce doczytać i wyrenderować leniwe obrazy w nowym viewporcie przed wywołaniem `captureVisibleTab`. |
| **Strony systemowe (`chrome://`, Chrome Web Store, lokalne pliki bez uprawnień)** | Wtyczka wykrywa niedozwolony protokół URL przed próbą wstrzyknięcia skryptu i wyświetla czytelny komunikat w popupie zamiast surowego błędu w konsoli. |
| **Użytkownik wywołuje skrót klawiszowy „Zrzut zaznaczenia”, gdy nic nie jest zaznaczone** | Jeśli `window.getSelection().toString().trim() === ''`, wtyczka wyświetla krótki komunikat (toast / powiadomienie w popupie): *„Najpierw zaznacz fragment tekstu na stronie”* lub proponuje zrzut widocznego ekranu. |

---

## 8. User Settings & Configuration

Wtyczka przechowuje lekkie ustawienia użytkownika w `chrome.storage.local`, pamiętając ostatnie wybory między sesjami:

| Setting Name | Type | Default Value | Description / Impact |
|--------------|------|---------------|----------------------|
| `highlightSelectionBeforeCapture` | `boolean` | `false` | Gdy `true`, przed zrobieniem zrzutu zaznaczonego tekstu zaznaczenie jest tymczasowo podświetlane na żółto, a natywny niebieski selektor systemu jest ukrywany. |
| `selectionPaddingPx` | `number` | `20` | Margines bezpieczeństwa (w pikselach CSS) dodawany wokół zaznaczonego tekstu. |
| `activeTool` | `string` | `"arrow"` | Ostatnio wybrane narzędzie w edytorze (`"arrow"`, `"underline"`, `"highlighter"`, `"text"`). |
| `activeColor` | `string` | `"#FF3B30"` | Ostatnio wybrany kolor adnotacji w edytorze (domyślnie wyraźny czerwony `#FF3B30`). |
| `strokeWidth` | `number` | `4` | Ostatnio wybrana grubość linii strzałki / podkreślenia (`2`, `4`, `8`). |
| `textStyleMode` | `string` | `"background"` | Tryb kontrastu dla narzędzia Tekst: `"background"` (kontrastowe tło), `"outline"` (biały obrys wokół liter) lub `"plain"` (czysty tekst). |

---

## 9. Sample Output / Deliverables

### 9.1 Automatyczne nazewnictwo pobieranych plików PNG
Format nazwy pliku przy kliknięciu **„Pobierz PNG”**:
```text
<znormalizowana-domena>_<YYYY-MM-DD>_<HH-mm>.png
```
Przykłady:
- Zrzut z `https://domena.pl/artykul/test` o godz. 14:10 w dniu 21.11.2026:
  `domena-pl_2026-11-21_14-10.png`
- Zrzut z `https://app.github.com/issues/12`:
  `app-github-com_2026-11-21_14-10.png`
- Zrzut z lokalnego serwera `http://localhost:3000`:
  `localhost_2026-11-21_14-10.png`

### 9.2 Zawartość schowka systemowego
Przy kliknięciu **„Kopiuj do schowka”** wygenerowany jest obiekt `ClipboardItem` z typem MIME `image/png` w pełnej rozdzielczości fizycznej (spłaszczona bitmapa zrzutu + wyrenderowane wektory z antyaliasingiem), gotowy do wklejenia przez `Ctrl+V` / `Cmd+V` bezpośrednio w komunikatorach (Slack, Discord, MS Teams), klientach poczty (Gmail, Outlook) oraz narzędziach projektowych (Figma, Jira, Linear, Notion).

---

## 10. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | - Przechwycenie zaznaczenia, obrazka lub viewportu i otwarcie karty `editor.html` musi nastąpić w czasie **< 400 ms**.<br>- Przerysowanie warstwy wektorowej na `<canvas>` podczas przeciągania strzałki lub zakreślacza musi utrzymywać **60 FPS** (czas klatki < 16 ms). |
| **Memory & Storage** | - Rekordy tymczasowe w IndexedDB (`captures`) muszą być **usuwane natychmiast** po wczytaniu obrazu na płótno w `editor.html` (z dodatkowym mechanizmem garbage collection przy starcie Service Workera usuwającym osierocone rekordy starsze niż 15 minut). |
| **Security & Privacy** | - Zero zewnętrznych zapytań sieciowych (brak telemetrii, analityki, zewnętrznych fontów ładowanych z CDN czy chmury).<br>- Wyłącznie minimalne uprawnienia Manifest V3: `activeTab`, `contextMenus`, `scripting`, `storage`. Brak `<all_urls>`. |
| **Compatibility** | - Przeglądarki Chromium obsługujące Manifest V3 (Chrome 114+, Edge 114+, Brave, Arc) na systemach macOS, Windows i Linux.<br>- Pełna obsługa ekranów HiDPI / Retina (`window.devicePixelRatio` od `1.0` do `3.0+`). |

---

## 11. Success Metrics & Analytics (KPIs)

Ponieważ wtyczka działa w 100% lokalnie i nie zawiera telemetrii śledzącej użytkowników, kryteria sukcesu są weryfikowane poprzez mierzalne testy jakościowe i operacyjne:

| Metric / KPI | Goal / Target |
|--------------|---------------|
| **Czas wykonania i skopiowania zrzutu (Time-to-Clipboard)** | **< 5 sekund** od kliknięcia w menu kontekstowym do skopiowania opisanego zrzutu do schowka. |
| **Dokładność wycinania HiDPI / Retina** | **100% zgodności pikselowej** (zero uciętych krawędzi tekstu/obrazka przy `devicePixelRatio` = 1.0, 1.25, 1.5, 2.0) w testach automatycznych i manualnych. |
| **Niezawodność zrzutu ze scrollem** | **0 błędów `MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND`** przy zrzutach stron składających się z 10+ ekranów (viewportów). |
| **Czystość pamięci (Zero Storage Leak)** | **0 MB** zalegających danych tymczasowych w IndexedDB po zamknięciu lub wczytaniu karty `editor.html`. |
| **Weryfikacja uprawnień Chrome Web Store** | Brak ostrzeżenia o „odczycie i zmianie wszystkich danych na odwiedzanych stronach” podczas instalacji rozszerzenia. |

---

## 12. Future Scope (v2)

Elementy świadomie wykluczone z wersji v1 w celu zachowania maksymalnej lekkości i prostoty:
- [ ] **Narzędzie Blur / Pixelate** do zamazywania wrażliwych danych (adresy e-mail, kwoty, dane osobowe) na zrzucie.
- [ ] **Obsługa przewijania wewnętrznych kontenerów DOM** (`overflow-y: auto/scroll` wewnątrz aplikacji SPA, np. panele boczne i tabele) podczas zrzutu ze scrollem.
- [ ] **Narzędzie numerowanych kroków (Step Counter `1`, `2`, `3`)** do tworzenia instrukcji i tutoriali.
- [ ] **Ponów (`Ctrl + Y` / `Cmd + Shift + Z`)** oraz eksport do formatu PDF / JPG.
- [ ] **Swobodne kadrowanie (Crop Tool)** bezpośrednio wewnątrz `editor.html` po wykonaniu zrzutu.

---

## 13. Risks & Mitigations

| Risk | Impact (Low/Med/High) | Mitigation Strategy |
|------|-----------------------|---------------------|
| **Błąd przekroczenia limitu `MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND` przy zrzucie całej strony** | High | Sztywne opóźnienie `>= 550 ms` między wywołaniami `captureVisibleTab` oraz mechanizm retry z exponential backoff (np. 600 ms -> 1200 ms) w przypadku odrzucenia wywołania przez API Chrome. |
| **Rozmycie lub przesunięcie wyciętego tekstu/obrazka na ekranach Retina / 4K / Windows 125%** | High | Konsekwentne mnożenie wszystkich wymiarów CSS (`x, y, width, height`, w tym marginesu `20 px`) przez `window.devicePixelRatio` przed wycięciem na `<canvas>` oraz skalowanie grubości linii i fontów w edytorze względem DPI obrazu. |
| **Przekroczenie limitu rozmiaru wiadomości / pamięci przy przekazywaniu dużego zrzutu do `editor.html`** | High | Zapis surowego obiektu `Blob` w **IndexedDB** (w obrębie tego samego originu `chrome-extension://`) zamiast używania parametrów URL (`data:image/png;base64,...`) lub `chrome.storage.local`, oraz natychmiastowe usunięcie rekordu po wczytaniu na płótno. |
| **Brak dostępu do `activeTab` przy wywołaniu z menu kontekstowego lub skrótu klawiszowego** | Med | Zgodnie ze specyfikacją Chrome Manifest V3, kliknięcie pozycji `contextMenus`, kliknięcie ikony rozszerzenia oraz wywołanie skrótu z `commands` automatycznie przyznaje tymczasowe uprawnienie `activeTab` dla bieżącej karty — wszystkie wstrzyknięcia `chrome.scripting.executeScript` są wykonywane bezpośrednio w handlerach tych zdarzeń. |
| **Powielanie pływających nagłówków (`fixed` / `sticky`) na każdej klatce zrzutu ze scrollem** | Med | Wykrywanie elementów z `getComputedStyle(el).position` równym `fixed` lub `sticky` po wykonaniu pierwszej klatki, tymczasowe ukrywanie ich przez `visibility: hidden !important` i gwarantowane przywrócenie w bloku `finally`. |

---

## 14. Go-To-Market & Launch Strategy

1. **Faza 1 — Wersja deweloperska (Unpacked Extension & Testy E2E)**:
   - Zbudowanie kompletnej paczki Manifest V3 ładowanej w trybie deweloperskim (`chrome://extensions` -> *Load unpacked*).
   - Weryfikacja wszystkich 4 trybów przechwytywania na stronach o różnej strukturze (artykuły tekstowe, galerie zdjęć z obrazami WebP/AVIF i politykami CORS, długie strony z przyklejonymi nawigacjami `sticky`/`fixed`, ekrany Retina `dpr = 2`).
2. **Faza 2 — Publikacja w Chrome Web Store i dystrybucja Open-Source / Społecznościowa**:
   - Przygotowanie paczki `.zip` spełniającej wymogi *Single Purpose Policy* oraz *Minimal Permissions* (brak `<all_urls>` przyspiesza proces recenzji w Chrome Web Store do minimum).
   - Udostępnienie dla pierwszej grupy docelowej (developerzy, QA, PM-owie) jako lekkiej, prywatnej alternatywy dla ciężkich wtyczek chmurowych.
