# Task 004: Build clickable extension popup prototype with all UI states

## 1. Summary
- **Task:** 004 - Build clickable extension popup prototype with all UI states - Implement popup.html, src/styles/popup.css and src/popup/index.ts following 04-Interface-spec.md sections 5.1 and 7. Render the 320px dark launcher with the brand header, Lokalny MV3 privacy pill, the 3 capture mode cards (Widoczny ekran, Cala strona ze scrollem, Zaznaczony fragment tekstu) with keyboard shortcut badges, the image right-click hint strip and the Podswietl zaznaczony tekst na zolto toggle switch. Support interactive switching and URL query states (?state=default, ?state=no-selection, ?state=progress with live frame progress bar and cancel button, and ?state=restricted with danger banner), and make clicking a capture card open editor.html with the corresponding mock capture mode. The task is done when all 4 popup states render and transition accurately with passing unit tests.
- **Milestone:** M01 - Look & feel and clickable prototype (type: prototype)
- **Type:** `ui`, `prototype`
- **Depends on:** 001, 002, 003
- **Parallel:** `safe` — touches only `popup.html`, `src/styles/popup.css`, `src/popup/index.ts` and `tests/unit/popup.test.ts`
- **Sources:** `04-Interface-spec.md §5.1 "Screen 1: Extension Action Popup"`, `04-Interface-spec.md §7.2–7.4`, `03-Design.md Layout & Components`

## 2. Goal
Build the complete `320px` extension launcher popup (`popup.html`) in the Dark Studio Utility design language with all 3 capture mode cards, the image right-click contextual tip, the yellow selection highlight switch, and all 4 required UI states (`default`, `no-selection`, `progress`, `restricted`). Clicking any active capture card navigates to `editor.html?mode=<mode>` (or starts the interactive scroll progress view for Full-Page Scroll before opening `editor.html?mode=fullpage`).

## 3. Scope
**In scope:**
- `popup.html` semantic structure and `src/styles/popup.css` layout (`width: 320px`, `padding: 12px`, `background: var(--color-canvas)`)
- Header bar (`28px` height) with SnapMark icon (`#FF3B30`), **"SnapMark"** title, and `Lokalny • MV3` privacy badge
- Primary Capture Mode Stack (`gap: 8px`):
  - `#btn-capture-viewport`: **"Widoczny ekran"** + *"Natychmiastowy zrzut aktualnego widoku"* + `<kbd>Alt+Shift+V</kbd>`
  - `#btn-capture-fullpage`: **"Cała strona ze scrollem"** + *"Skleja klatki i ukrywa pływające nagłówki"* + `<kbd>Alt+Shift+F</kbd>`
  - `#btn-capture-selection`: **"Zaznaczony fragment tekstu"** + dynamic subtitle (*"Gotowe: wytnij zaznaczenie (+20 px marginesu)"* in green `#22C55E` when selection is active; *"Zaznacz tekst na stronie lub użyj PPM"* and `aria-disabled="true"` in `no-selection` state) + `<kbd>Alt+Shift+S</kbd>`
- Contextual Image Hint Strip (`1px dashed var(--color-hairline-strong)`): *"Wskazówka: Kliknij PPM na dowolnym obrazku, aby wyciąć go z pominięciem blokad CORS i WebP/AVIF."*
- Settings Footer with toggle switch `#toggle-highlight` (`role="switch"`, `aria-checked`) for **"Podświetl zaznaczony tekst na żółto"** (*"Tymczasowy marker przed zrzutem"*)
- Scroll Capture Progress View (`#scroll-progress-panel`, shown when `?state=progress` or when clicking `#btn-capture-fullpage`): header **"Przechwytywanie całej strony..."**, detail *"Klatka 3 z 8 • Ukrywanie pływających nagłówków (fixed/sticky)..."*, progress bar (`--color-accent`), and cancel button `#btn-cancel-scroll` (**"Anuluj i zatrzymaj (Esc)"**)
- Restricted Page State (`#restricted-banner`, shown when `?state=restricted`): danger banner **"Strona chroniona przez przeglądarkę"** explaining `chrome://` and Chrome Web Store restrictions
- Unit tests in `tests/unit/popup.test.ts` verifying all 4 states and user interactions

**Out of scope:**
- Live `chrome.tabs.captureVisibleTab` and `chrome.scripting.executeScript` calls — Milestones M02 and M03

## 4. Current state and prerequisites
- Tasks 001, 002, and 003 completed (`tokens.css`, `types.ts`, `constants.ts`, `mock-captures.ts`).

## 5. Implementation steps
1. Implement `src/styles/popup.css` styling the `320px` popup container, header, `.popup-capture-stack`, `.image-hint-strip`, `.popup-footer`, `#scroll-progress-panel` progress track/fill, and `#restricted-banner`.
2. Build `renderPopup(root: HTMLElement, options?: { initialSearch?: string; onNavigate?: (url: string) => void })` in `src/popup/index.ts` so it initializes automatically on DOMContentLoaded and can also be mounted deterministically in Vitest tests.
3. Implement state rendering for `default`, `no-selection`, `progress`, and `restricted` based on `parsePopupStateFromSearch(window.location.search)`.
4. Wire interactive handlers:
   - Clicking `#btn-capture-viewport` navigates to `editor.html?mode=viewport`.
   - Clicking `#btn-capture-selection` (when enabled) navigates to `editor.html?mode=selection&highlight=<0|1>`.
   - Clicking `#btn-capture-fullpage` switches the popup to the `progress` state (and includes a button / completion step to open `editor.html?mode=fullpage`, plus `#btn-cancel-scroll` or `Escape` key to return to `default`).
   - Clicking `#toggle-highlight` toggles `aria-checked` (`"true"` / `"false"`).
5. Write `tests/unit/popup.test.ts` testing rendering of all 4 URL states, toggle switch interaction, full-page progress transition and cancellation, and navigation URLs to `editor.html`.

## 6. Files

| Path | Action (create / modify) | Purpose |
|---|---|---|
| `popup.html` | modify | Popup semantic HTML shell and stylesheet links |
| `src/styles/popup.css` | modify | 320px popup layout, capture cards, progress bar, and footer styles |
| `src/popup/index.ts` | modify | Popup state controller and interactive prototype handlers |
| `tests/unit/popup.test.ts` | create | Unit tests for all 4 popup UI states and interactions |

## 7. Contracts and data (if applicable)
- `renderPopup(container: HTMLElement, options?: { initialSearch?: string; onNavigate?: (url: string) => void })` exported from `src/popup/index.ts`.
- Query states supported: `?state=default`, `?state=no-selection`, `?state=progress`, `?state=restricted`.

## 8. UI details (if applicable)
- Exact popup width: `320px`, outer padding `12px`, card border-radius `10px` (`--radius-lg`), `<kbd>` badges `Alt+Shift+V`, `Alt+Shift+F`, `Alt+Shift+S`.
- Toggle switch `#toggle-highlight` uses `role="switch"` and `aria-checked="false"` by default.

## 9. Acceptance criteria
- [ ] TC-01: Default state (`popup.html` or `?state=default`) renders all 3 capture cards active, the image PPM hint strip, and the `#toggle-highlight` switch.
- [ ] TC-02: `?state=no-selection` renders `#btn-capture-selection` with `aria-disabled="true"` and helper text *"Zaznacz tekst na stronie lub użyj PPM"*.
- [ ] TC-03: `?state=progress` (or clicking `#btn-capture-fullpage`) displays `#scroll-progress-panel` with frame counter *"Klatka 3 z 8"*, progress fill bar, and working `#btn-cancel-scroll` button (`Escape` also cancels).
- [ ] TC-04: `?state=restricted` hides capture triggers and displays `#restricted-banner` with title **"Strona chroniona przez przeglądarkę"**.
- [ ] TC-05: Toggling `#toggle-highlight` flips `aria-checked` and passes the highlight flag when launching selection capture.
- [ ] TC-06: `npm run typecheck && npm test && npm run build` pass.

## 10. Tests to add or update
- `tests/unit/popup.test.ts`: Tests `default`, `no-selection`, `progress`, and `restricted` states, toggle switch click, fullpage progress cancel via button and `Escape`, and navigation callbacks to `editor.html`.

## 11. Verification
- Run from repository root:
  `npm run typecheck && npm test && npm run build`

## 12. Risks and notes
- Structure `src/popup/index.ts` cleanly so Milestone M02 can plug `chrome.storage.local` and `chrome.runtime.sendMessage` into the existing handlers without rewriting the DOM or CSS.
