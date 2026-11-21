# Idea: SnapMark — Szybkie zrzuty kontekstowe z lekkim edytorem adnotacji

## 1. Wizja produktu

**SnapMark** to lekka, szanująca prywatność wtyczka do przeglądarki Chrome (Manifest V3), która zamienia wieloetapowy proces robienia, wycinania i opisywania zrzutów ekranu w jedną płynną akcję. Niezależnie od tego, czy użytkownik zaznaczy fragment tekstu, kliknie prawym przyciskiem myszy na grafikę, czy przechwyci cały ekran lub stronę ze scrollem — obraz natychmiast otwiera się w minimalistycznym edytorze wektorowym w nowej karcie, gotowy do oznaczenia strzałką, zakreślaczem i tekstem oraz błyskawicznego skopiowania do schowka lub pobrania jako PNG.

---

## 2. Problem

W codziennej pracy (zgłaszanie bugów, code/design review, pisanie dokumentacji, dzielenie się cytatami z artykułów na Slacku) wykonanie czytelnego, opisanego zrzutu ekranu wymaga zbyt wielu kroków i przełączania kontekstu:

1. **Systemowe narzędzia (macOS Screenshot / Windows Snipping Tool)** wymagają ręcznego, precyzyjnego obrysowywania kursorem zaznaczonego tekstu lub obrazka (co często kończy się krzywo przyciętym kadrem), a ich wbudowane edytory są toporne lub wymagają zapisu pliku na dysk przed edycją.
2. **Pobieranie grafik ze stron („Zapisz grafikę jako…”)** często zawodzi przez blokady CORS, nakładki DOM, brak dostępu do źródła lub zapisuje plik w niewygodnych do szybkiego wklejenia formatach (`AVIF`, `WebP`).
3. **Istniejące kombajny w Chrome Web Store (Awesome Screenshot, Nimbus, GoFullPage)** rozrosły się do ciężkich platform chmurowych: wymagają zakładania konta, narzucają inwazyjne uprawnienia (`<all_urls>` — odczyt danych ze wszystkich stron), próbują wysyłać zrzuty na zewnętrzne serwery i przytłaczają dziesiątkami niepotrzebnych narzędzi.

Brakuje narzędzia typu **„zero-friction, local-first”**, które rozumie kontekst DOM (zaznaczony tekst, konkretny element `<img>`, viewport, cała strona) i od razu przenosi użytkownika do ultraszybkiego edytora z tylko tymi narzędziami, których używa się w 95% przypadków.

---

## 3. Grupa docelowa

- **Główny użytkownik (Primary user)** *(założenie wstępne — do walidacji)*:
  - **Product Managerowie, QA Testerzy, Developerzy i Designerzy** pracujący w przeglądarce, którzy kilkanaście razy dziennie komunikują poprawki wizualne, zgłaszają błędy w Jira/Linear lub wysyłają szybki feedback na Slacku / MS Teams.
  - **Twórcy treści, badacze i marketerzy**, którzy wycinają cytaty z artykułów oraz pojedyncze grafiki z sieci do notatek (Notion, Obsidian) lub prezentacji.
- **Użytkownicy poboczni (Secondary users)**:
  - Pracownicy wsparcia klienta (Customer Support) tworzący szybkie instrukcje krok-po-kroku („kliknij tutaj”).
  - Studenci i wykładowcy zbierający materiały z sieci.
- **Anty-persona**:
  - Osoby szukające narzędzia do nagrywania wideo ekranu (Loom), zespołowych tablic chmurowych z komentarzami, zaawansowanego retuszu zdjęć (Photoshop/Figma) lub automatycznej synchronizacji z chmurą.

---

## 4. Propozycja wartości (Value Proposition)

1. **Kontekstowe wycinanie bez celowania kursorem**: Zamiast ręcznie rysować prostokąt wokół akapitu czy zdjęcia, użytkownik zaznacza tekst lub klika PPM na obrazek — SnapMark sam wylicza `getBoundingClientRect()`, uwzględnia `devicePixelRatio` (Retina/4K), dodaje estetyczny margines bezpieczeństwa (np. 20 px) i wycina idealny kadr z `captureVisibleTab`.
2. **Edycja w 3 sekundy (Vector Canvas)**: Lokalna karta `editor.html` zawiera wyłącznie 4 kluczowe narzędzia (wektorowa strzałka z edytowalnymi końcówkami, podkreślenie/zakreślacz, czytelny tekst z obrysem/tłem, historia `Ctrl+Z` + eksport 1-kliknięciem do schowka lub PNG).
3. **100% prywatności i zero inwazyjnych uprawnień**: Działanie wyłącznie lokalnie (IndexedDB / `chrome.storage.session`) w oparciu o `activeTab`, `contextMenus`, `scripting` i `storage` — bez `<all_urls>`, bez serwerów zewnętrznych, bez konta.

---

## 5. Kluczowe funkcje (v1)

| # | Funkcja | Opis | Priorytet |
|---|---------|------|-----------|
| 1 | **Zrzut zaznaczonego tekstu** | Menu kontekstowe („Zrób screena zaznaczenia”) lub skrót klawiszowy. Pobiera `Range.getBoundingClientRect()`, mnoży przez `devicePixelRatio`, dodaje margines bezpieczeństwa (np. 20 px) i wycina obszar z widocznego okna. | must-have |
| 2 | **Opcjonalne podświetlenie zaznaczenia** | Tymczasowe podświetlenie zaznaczonego tekstu (np. na żółto) tuż przed wykonaniem zrzutu, aby wyróżnić kluczowy cytat bez ręcznego rysowania. *(do potwierdzenia czy domyślnie włączone)* | nice-to-have |
| 3 | **Zrzut wybranego obrazka (`<img>`)** | PPM na elemencie `<img>` („Edytuj i pobierz obrazek”). Pomija pobieranie pliku źródłowego (odporność na CORS, `AVIF`/`WebP`, blokady zapisu) i wycina dokładny obszar obrazka z `captureVisibleTab`. | must-have |
| 4 | **Zrzut widocznego ekranu (Viewport)** | Kliknięcie w popupie lub skrót (np. `Alt + Shift + V`). Natychmiastowy zrzut widocznego obszaru karty bez zaznaczania. | must-have |
| 5 | **Zrzut całej strony ze scrollem** | Przycisk w popupie lub skrót (np. `Alt + Shift + F`). Pętla `window.scrollTo` z throttlingiem (~550 ms pod limit `MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND`), ukrywaniem elementów `position: fixed / sticky` po pierwszej klatce i sklejaniem na jednym `<canvas>`. | must-have |
| 6 | **Lokalny transfer wysokiej rozdzielczości** | Przekazywanie surowego obiektu `Blob` między background service workerem a kartą `editor.html` przez IndexedDB (lub `chrome.storage.session`) z automatycznym czyszczeniem po wczytaniu na płótno. | must-have |
| 7 | **Wektorowy edytor adnotacji (`editor.html`)** | Narzędzia oparte na tablicy obiektów wektorowych: **Strzałka** (regulacja grubości/koloru, domyślnie `#FF3B30`, przesuwanie końcówek po narysowaniu), **Podkreślenie i zakreślacz** (linia z blokadą poziomu pod `Shift` + marker `globalAlpha = 0.35`), **Tekst** (kontrastowe tło lub biały obrys liter), pełne **Cofnij (`Ctrl+Z`)**. | must-have |
| 8 | **Szybki eksport (PNG + Schowek)** | Spłaszczenie warstwy wektorowej i bitmapy przy eksporcie: **Kopiuj do schowka** (do natychmiastowego wklejenia na Slacka/maila) oraz **Pobierz PNG** z automatyczną nazwą (`domena-pl_YYYY-MM-DD_HH-mm.png`). | must-have |

---

## 6. Jak to działa (User Flow)

1. **Wywołanie kontekstowe**: Użytkownik czyta artykuł lub testuje aplikację. Zaznacza ważny akapit i wybiera z menu kontekstowego *„Zrób screena zaznaczenia”* (alternatywnie: klika PPM na zdjęcie lub wybiera zrzut Viewport / Cała strona z popupu lub skrótem klawiszowym).
2. **Przechwycenie i przycięcie**: Skrypt wstrzyknięty przez `activeTab` + `scripting` pobiera wymiary elementu/zaznaczenia i `window.devicePixelRatio` (lub przewija stronę krok po kroku, ukrywając pływające nagłówki). Background Service Worker wykonuje `chrome.tabs.captureVisibleTab()`, przycina/skleja obraz i zapisuje tymczasowy `Blob` w IndexedDB.
3. **Otwarcie edytora**: Wtyczka natychmiast otwiera nową kartę `editor.html`, wczytuje `Blob` na `<canvas>` i czyści pamięć tymczasową.
4. **Adnotacja jednym ruchem**: Użytkownik jednym przeciągnięciem myszy rysuje czerwoną strzałkę (w razie potrzeby koryguje jej grot), zakreśla kluczowe zdanie półprzezroczystym markerem i dopisuje krótki komentarz tekstowy z kontrastowym tłem.
5. **Rezultat**: Użytkownik klika **„Kopiuj do schowka”** (lub **„Pobierz PNG”** z nazwą `domena-pl_2026-11-21_14-10.png`) i od razu wkleja gotowy, czytelny obraz na Slacka, do Jiry lub dokumentu.

---

## 7. Inspiracje i konkurencja

| Produkt / rozwiązanie | Co robi dobrze | Czego brakuje / co robimy inaczej |
|-----------------------|----------------|-----------------------------------|
| **Systemowe narzędzia (macOS Cmd+Shift+4 / Windows Snipping Tool)** | Zawsze pod ręką, działają poza przeglądarką. | Wymagają ręcznego celowania kursorem; nie znają struktury DOM (nie wytną automatycznie zaznaczonego tekstu z równym marginesem ani całej strony ze scrollem). |
| **GoFullPage** | Świetny algorytm sklejania całej strony ze scrollem. | Brak szybkiego wycinania kontekstowego (zaznaczenie tekstu / `<img>`); edycja często bywa płatna lub rozbudowana ponad miarę. |
| **Awesome Screenshot / Nimbus Capture** | Bardzo bogate możliwości edycji i nagrywania. | Przeładowane funkcjami (bloatware), wymuszają logowanie/chmurę, często wymagają szerokich uprawnień do wszystkich stron. SnapMark stawia na lekkość, brak konta i minimalne uprawnienia. |
| **Zapisywanie obrazka przez PPM („Zapisz grafikę jako…”)** | Natywne w przeglądarce. | Zwraca `WebP`/`AVIF`, bywa blokowane przez CORS lub nakładki CSS, nie pozwala od razu nanieść strzałki czy tekstu przed wysłaniem. |

---

## 8. Model biznesowy (wstępny)

*(Założenie wstępne — do potwierdzenia z właścicielem produktu)*

- **Model przychodów**: Darmowe narzędzie Open Source / Free Utility budujące portfolio i zaufanie społeczności **LUB** model Freemium / One-time Pro (np. 100% opisanych funkcji v1 za darmo, a w przyszłości opcjonalne dodatki Pro jak rozmywanie danych wrażliwych / blur, numerowane kroki, własne presety stylów/watermark).
- **Kto płaci**: Użytkownik końcowy (jednorazowa opłata za licencję Pro lub „Buy me a coffee”) lub całkowicie darmowe.
- **Szacowana cena**: $0 dla pełnego zakresu v1.

---

## 9. Ryzyka i niewiadome

| Ryzyko / pytanie | Wpływ | Status |
|------------------|-------|--------|
| **Skuteczność `Range.getBoundingClientRect()` dla zaznaczenia wychodzącego poza aktualny viewport** (gdy użytkownik zaznaczy długi tekst wymagający scrolla). | Średni — zrzut z `captureVisibleTab` obejmie tylko widoczną część lub wymagałby mini-scrolla. | open |
| **Wykrywanie ukrytego obrazu pod nakładkami DOM** (gdy kliknięcie PPM z `contextMenus` z kontekstem `image` nie odpali się przez przezroczysty `<div>` nad `<img>`). | Średni — na stronach typu Instagram wywołanie natywnego kontekstu `image` może być zablokowane przez warstwę wyżej. | open |
| **Niestandardowe kontenery scrollowania przy zrzucie całej strony** (strony SPA, gdzie scrolluje wewnętrzny `<div style="overflow-y: auto">`, a nie `window`). | Wysoki — `window.scrollTo` nie przewinie takich aplikacji (np. niektóre panele SaaS, webmaile). | open |
| **Limity pamięci `<canvas>` przy bardzo długich stronach na ekranach Retina (`devicePixelRatio >= 2`)** — przeglądarki mają twardy limit maksymalnej wysokości/powierzchni pojedynczego elementu `<canvas>` (np. 32 767 px lub limit RAM). | Wysoki — zbyt długa strona może wygenerować pusty/ucięty canvas bez ostrzeżenia. | open |
| **Wymóg użycia Offscreen Canvas / edytora do sklejania klatek w Manifest V3**, ponieważ Service Worker nie ma dostępu do klasycznego DOM `<canvas>` i `Image`. | Średni — architektura musi przewidywać sklejanie klatek bezpośrednio w karcie `editor.html` (przesyłanie tablicy klatek) lub użycie `OffscreenCanvas` + `createImageBitmap` w SW. | researched |

---

## 10. Kolejne kroki

- [ ] Doprecyzować zachowanie w sytuacjach brzegowych (długie zaznaczenia tekstu, maksymalna wysokość zrzutu ze scrollem, selekcja i edycja już narysowanych obiektów w edytorze).
- [ ] Potwierdzić docelowy zakres narzędzi w edytorze (np. czy potrzebne jest usuwanie pojedynczego elementu klawiszem `Delete`/`Backspace` oprócz `Ctrl+Z`).
- [ ]Opcjonalnie przeprowadzić stres-test pomysłu skillem `/02-discovery-idea-roast` lub przejść bezpośrednio do specyfikacji wymagań w `/03-discovery-prd`.

---

## Change log

| Data | Co się zmieniło |
|------|-----------------|
| 2026-11-21 | Pierwsza wersja dokumentu wygenerowana na podstawie szczegółowej koncepcji użytkownika (4 tryby przechwytywania, lekki edytor wektorowy, architektura Manifest V3). |
