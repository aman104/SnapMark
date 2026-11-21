# Milestone M02 report: Foundations: Manifest V3, IndexedDB transfer and Viewport capture

## Summary
Zrealizowano wszystkie 7 zadań kamienia milowego **M02 (Foundations: Manifest V3, IndexedDB transfer and Viewport capture)**: zbudowano kompletną, gotową do załadowania w Chrome paczkę rozszerzenia Manifest V3 (`dist/`) z minimalnymi uprawnieniami (`activeTab`, `contextMenus`, `scripting`, `storage` — zero `<all_urls>`), wdrożono bazę **IndexedDB** (`SnapMarkDB.captures`, `src/shared/db.ts`) do transferu surowych obiektów `Blob` z **natychmiastowym usuwaniem rekordu tymczasowego** zaraz po wczytaniu na płótno (`consumeCaptureSession`) oraz 15-minutowym garbage collectorem (`cleanupStaleCaptures`), dodano trwałe ustawienia w `chrome.storage.local` (`src/shared/settings.ts`), moduły matematyki DPI (`src/shared/dpi.ts`), generatora nazw plików `<domena>_YYYY-MM-DD_HH-mm.png` (`src/shared/filename.ts`), strażnika stron chronionych (`src/shared/url-guard.ts`), `CaptureRateLimiter` (`>= 550 ms` + retry backoff `600 ms`) oraz działający end-to-end **Tryb 3: Zrzut widocznego ekranu (Visible Viewport Capture)**.

## What you can see now
**Phase:** 3 — Foundations, milestone 1 of 1 in this phase.
- **Przed M02:** Klikalny prototyp działający wyłącznie w karcie deweloperskiej z przykładowym obrazkiem testowym.
- **Po M02:** Kompletna wtyczka Chrome Manifest V3 w katalogu `dist/` (`manifest.json`, `background.js`, `popup.html`, `editor.html`, `icons/icon-16..128.png`). Po załadowaniu jej w `chrome://extensions` (*Load unpacked*) wtyczka nie wyświetla żadnego ostrzeżenia o dostępie do wszystkich danych na odwiedzanych stronach (`<all_urls>`), rejestruje menu kontekstowe i skróty klawiszowe, wykrywa strony chronione (`chrome://` / Chrome Web Store), zapisuje przełącznik podświetlenia oraz ostatnio wybrane narzędzie/kolor/grubość w `chrome.storage.local`, wykonuje prawdziwy **Zrzut widocznego ekranu (Viewport)** w natywnej rozdzielczości Retina, przesyła surowy obiekt `Blob` przez bazę **IndexedDB** do nowej karty `editor.html?captureId=<id>` i natychmiast czyści rekord tymczasowy z pamięci.

## How to review
1. Zbuduj paczkę rozszerzenia z katalogu głównego:
   ```bash
   npm run typecheck && npm test && npm run build
   ```
2. Otwórz w Google Chrome / Brave / Edge adres `chrome://extensions`, włącz **Tryb dewelopera** (*Developer mode*) i kliknij **Załaduj rozpakowane** (*Load unpacked*), wskazując katalog `dist/`.
3. Sprawdź szczegóły uprawnień wtyczki: widoczne są wyłącznie nieinwazyjne uprawnienia (brak dostępu do danych na wszystkich stronach `<all_urls>`).
4. Otwórz dowolną stronę WWW (np. `https://example.com`) i uruchom **Tryb 3: Widoczny ekran (Viewport)**:
   - Kliknij ikonę SnapMark → **„Widoczny ekran”** (lub wciśnij `Alt + Shift + V`, albo kliknij PPM na stronie → **„Zrób zrzut widocznego ekranu”**).
   - Nowa karta `editor.html?captureId=<id>` otwiera się z ostrym zrzutem Retina, automatyczną nazwą pliku `example-com_YYYY-MM-DD_HH-mm.png` w klastrze #1 oraz czystą bazą `SnapMarkDB.captures` w DevTools → Application → IndexedDB (rekord został usunięty natychmiast po wczytaniu na płótno).
5. Odśwież kartę `editor.html?captureId=<id>` (`F5`): ponieważ tymczasowy rekord został już usunięty dla ochrony prywatności, edytor wyświetla kartę pustego stanu (**„Brak aktywnego zrzutu na płótnie”**), skąd możesz wkleić dowolny obraz ze schowka (`Ctrl + V`) lub wczytać plik PNG/JPG z dysku.
6. Przełącz kartę na `chrome://extensions` i kliknij ikonę SnapMark: popup automatycznie wykrywa stronę systemową i wyświetla baner **„Strona chroniona przez przeglądarkę”**.

Kod: gałąź `milestone/M02-foundations-manifest-v3-indexeddb-transfer-and-viewport-capture`.
- `git log --oneline --first-parent milestone/M02-foundations-manifest-v3-indexeddb-transfer-and-viewport-capture` pokazuje merge zadań `007`–`013`.
- `git diff main...milestone/M02-foundations-manifest-v3-indexeddb-transfer-and-viewport-capture` pokazuje pełny zakres zmian M02.

## Exit criteria
| Criterion | Status | Evidence |
|---|---|---|
| Paczka w `dist/` ładuje się w `chrome://extensions` bez błędów i deklaruje w `manifest.json` wyłącznie uprawnienia `activeTab`, `contextMenus`, `scripting`, `storage` (brak `<all_urls>`) | MET | `public/manifest.json`, `dist/manifest.json`, `dist/background.js`, `dist/icons/icon-*.png` + test `tests/unit/smoke.test.ts` (3/3 testy zielone) |
| Zrzut widocznego ekranu (Viewport) działa z popupu, menu kontekstowego i skrótu `Alt+Shift+V`, otwierając `editor.html` z rzeczywistym obrazem przesłanym jako `Blob` przez IndexedDB | MET | `src/background/capture-orchestrator.ts`, `src/background/index.ts`, `src/popup/index.ts`, `src/editor/index.ts` + testy `tests/unit/background-viewport.test.ts` (4/4) i `tests/unit/editor-live-load.test.ts` (3/3) |
| Po wczytaniu obrazu na `<canvas>` w `editor.html` rekord tymczasowy w `SnapMarkDB.captures` jest natychmiast usuwany (potwierdzone testem w `tests/unit/db.test.ts` i w DevTools → Application → IndexedDB) | MET | `consumeCaptureSession()` w `src/shared/db.ts` + testy `tests/unit/db.test.ts` (3/3) oraz `tests/unit/editor-live-load.test.ts` |
| Ustawienia w `popup.html` i `editor.html` zapisują się w `chrome.storage.local` i przetrwają zamknięcie oraz ponowne otwarcie popupu/karty | MET | `src/shared/settings.ts` + testy `tests/unit/settings.test.ts` (4/4), `tests/unit/popup.test.ts` (6/6) i `tests/unit/editor-live-load.test.ts` (3/3) |
| Testy jednostkowe Vitest dla `dpi.ts`, `filename.ts`, `url-guard.ts`, `settings.ts`, `db.ts` i `rate-limiter.ts` przechodzą w 100% (`npm test && npm run build`) | MET | `npm test` — 14 plików testowych, **51/51 testów zielonych**; `npm run build` — kod wyjścia `0` |

## Tasks
| Task | Status | Note |
|---|---|---|
| 007 - Implement DPI crop math, filename formatter and restricted URL guard | done | `src/shared/dpi.ts`, `src/shared/filename.ts`, `src/shared/url-guard.ts` + 8 unit tests |
| 008 - Implement persistent user settings wrapper for chrome.storage.local | done | `src/shared/settings.ts` with schema sanitization and serialized write queue + 4 unit tests |
| 009 - Implement IndexedDB Blob capture session store with automatic purge | done | `src/shared/db.ts` (`SnapMarkDB.captures`, `consumeCaptureSession`, `cleanupStaleCaptures`) + 3 unit tests |
| 010 - Complete Manifest V3 package, extension icons and multi-entry Vite build | done | Complete `public/manifest.json`, PNG icons `16/32/48/128 px`, `dist/background.js` Rollup entry |
| 011 - Build MV3 Background Service Worker, rate limiter and Viewport capture orchestrator | done | `CaptureRateLimiter` (`>= 550 ms` + `600 ms` retry backoff), context menus, `captureVisibleViewport` |
| 012 - Connect popup.html to live Chrome APIs, storage settings and Viewport trigger | done | Active tab URL check, persistent highlight toggle, `chrome.runtime.sendMessage` Viewport dispatch |
| 013 - Connect editor.html to IndexedDB Blob loading, immediate purge and clipboard/file input | done | `consumeCaptureSession` on `?captureId=`, physical Retina canvas draw, live paste/file input, `README.md` |

## Assumptions to review
- none

## Known limitations and deviations
- W `M02` menu kontekstowe i skróty klawiszowe są w pełni zarejestrowane, a wywołanie zrzutu wykonuje **Tryb 3: Widoczny ekran (Viewport)**. Wstrzykiwany skrypt DOM (`src/content/capture-injected.ts`) wycinający zaznaczony tekst (+20 px marginesu i opcjonalne żółte podświetlenie), wycinający kliknięty element `<img>` oraz sterujący pętlą zrzutu całej strony ze scrollem (z ukrywaniem `fixed`/`sticky` po pierwszej klatce) jest zakresem kolejnego kamienia milowego **M03**.

## Spec changes
none

## Recommendations for next milestones
- Infrastruktura `CaptureRateLimiter` (`>= 550 ms`), `computePhysicalCropRect` (`coord * dpr` + `20 px` marginesu) oraz `SnapMarkDB` (`frames: CaptureFrame[]` + `cropRectCss`) jest już gotowa do bezpośredniego użycia w kamieniu milowym **M03 (Contextual DOM captures: Selection, Image, Full-Page Scroll)**.

## Operator decision
- [x] Accept: tell `08-planning-tasks` "accept M02". It merges `milestone/M02-foundations-manifest-v3-indexeddb-transfer-and-viewport-capture` into the base branch and plans the next milestone
- [ ] Request changes: describe them below and run `08-planning-tasks`

### Feedback
Zaakceptowano przez operatora (2026-11-21).
