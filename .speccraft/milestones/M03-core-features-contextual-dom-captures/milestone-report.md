# Milestone Report: M03 - Core features: Contextual DOM captures (Selection, Image, Full-Page Scroll)

- **Milestone**: `M03` — Core features: Contextual DOM captures (Selection, Image, Full-Page Scroll)
- **Phase**: 4 — Core features
- **Type**: feature
- **Status**: `[?]` Ready for operator review
- **Branch**: `milestone/M03-core-features-contextual-dom-captures`

## Summary of Delivered Capabilities

1. **Tryb 1: Zaznaczony fragment tekstu (`selection`)** (`src/content/capture-injected.ts`, `src/background/capture-orchestrator.ts`, `src/editor/canvas-stage.ts`):
   - Self-contained DOM measurement function `measureSelectionInDom` injected on demand via `chrome.scripting.executeScript`.
   - Reads `window.getSelection().getRangeAt(0)`, scrolls partially offscreen text selections into view (`block: 'center'`), measures `Range.getBoundingClientRect()`, and adds the automatic **20 px CSS safety margin** (`selectionPaddingPx`) clamped to the visible viewport.
   - When `highlightSelectionBeforeCapture` is enabled, injects temporary yellow marker overlays (`[data-snapmark-highlight]`, `rgba(255, 235, 59, 0.45)`) over `range.getClientRects()` and hides the native blue browser selection for the duration of `captureVisibleTab()`, with guaranteed cleanup (`cleanupSelectionHighlightInDom`) in a `finally` block.
   - Crops the captured Retina frame in `editor.html` using `multiplyRectByDpr(session.cropRectCss, dpr)`.

2. **Tryb 2: Wybrany obrazek `<img>` (`image`)** (`src/content/capture-injected.ts`, `src/background/capture-orchestrator.ts`):
   - Triggered from context menu item **„Edytuj i pobierz obrazek”** (`contexts: ["image"]`).
   - `measureTargetImageInDom(srcUrl)` locates the target `<img>` in the live DOM by matching `info.srcUrl` against `currentSrc` / `src` (prioritizing `:hover` and viewport center proximity), scrolls partially clipped images into view (`block: 'nearest'`), and returns `img.getBoundingClientRect()` clamped to the viewport.
   - Crops directly from the `captureVisibleTab()` screen buffer without any network `fetch(srcUrl)`, completely bypassing CORS/hotlink blocks and converting `AVIF`/`WebP` images into an editable PNG canvas.

3. **Tryb 4: Cała strona ze scrollem (`fullpage`)** (`src/content/capture-injected.ts`, `src/background/capture-orchestrator.ts`, `src/editor/canvas-stage.ts`, `src/popup/index.ts`):
   - `prepareFullPageScrollInDom` saves original `scrollX`/`scrollY` and inline `overflow`/`scroll-behavior` styles, hides scrollbars, scrolls to `(0, 0)` for Frame #1, and computes scroll step offsets capped at `MAX_CANVAS_HEIGHT_PHYSICAL_PX = 16384`.
   - After Frame #1 is captured, `hideFixedAndStickyElementsInDom` detects all visible elements with `getComputedStyle(el).position === 'fixed' || 'sticky'` and sets `visibility: hidden !important` so sticky navbars and cookie banners appear only once at the top of the stitched image.
   - Enforces `>= 550 ms` throttling between `captureVisibleTab` calls via `CaptureRateLimiter` (`MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND` safety), broadcasts `SNAPMARK_SCROLL_PROGRESS` messages to `popup.html` and updates `chrome.action.setBadgeText('k/N')`.
   - Supports instant user cancellation via `#btn-cancel-scroll` or `Escape` (`SNAPMARK_CANCEL_SCROLL_CAPTURE`) and always restores all hidden `fixed`/`sticky` elements, scrollbars, and original scroll position via `restoreFullPageScrollInDom` in a `finally` block.
   - Seamlessly stitches multi-frame captures onto `#editor-canvas` in `src/editor/canvas-stage.ts` (`buildSessionCompositePlacements`), slicing only the newly exposed bottom pixels on partial final scroll steps and showing `#max-height-banner` when `exceededMaxHeight` is `true`.

## Completed Tasks

- `[x]` **014** — Implement on-demand DOM measurement and temporary yellow selection highlight (`src/content/capture-injected.ts`, `tests/unit/content-selection.test.ts`)
- `[x]` **015** — Implement on-demand image element resolution and bounding box extraction (`src/content/capture-injected.ts`, `tests/unit/content-image.test.ts`)
- `[x]` **016** — Implement full-page scroll DOM controller and fixed or sticky header suppression (`src/content/capture-injected.ts`, `tests/unit/content-scroll.test.ts`)
- `[x]` **017** — Orchestrate Selection, Image and Full-Page Scroll captures in Background Service Worker (`src/background/capture-orchestrator.ts`, `src/background/index.ts`, `tests/unit/background-contextual-captures.test.ts`)
- `[x]` **018** — Implement physical DPI cropping and multi-frame scroll stitching in editor canvas stage (`src/editor/canvas-stage.ts`, `src/editor/index.ts`, `src/popup/index.ts`, `tests/unit/editor-crop-stitch.test.ts`, `README.md`)

## Exit Criteria Verification

- [x] Tryb 1 (Zaznaczony tekst) wycina zaznaczenie z marginesem `20 px` CSS przeliczonym przez `window.devicePixelRatio` oraz poprawnie nakłada i usuwa tymczasowe żółte podświetlenie, gdy opcja jest włączona (`tests/unit/content-selection.test.ts`, `tests/unit/background-contextual-captures.test.ts`, `tests/unit/editor-crop-stitch.test.ts`).
- [x] Tryb 2 (Wybrany obrazek `<img>`) wycina dokładny prostokąt `img.getBoundingClientRect() * dpr` z `captureVisibleTab` bez wykonywania zapytań sieciowych `fetch` (`tests/unit/content-image.test.ts`, `tests/unit/background-contextual-captures.test.ts`).
- [x] Tryb 4 (Cała strona ze scrollem) zachowuje odstęp `>= 550 ms` między klatkami, ukrywa elementy `fixed`/`sticky` po pierwszej klatce, skleja klatki bez szwów/duplikacji na ostatniej klatce i zawsze przywraca oryginalny stan DOM oraz pozycję scrolla strony (`tests/unit/content-scroll.test.ts`, `tests/unit/background-contextual-captures.test.ts`, `tests/unit/editor-crop-stitch.test.ts`).
- [x] Użytkownik może anulować trwający zrzut ze scrollem przyciskiem w popupie lub klawiszem `Esc`, co natychmiast przywraca stronę do stanu początkowego (`tests/unit/background-contextual-captures.test.ts`).
- [x] Testy jednostkowe i integracyjne dla wycinania DPI, ukrywania `fixed`/`sticky` oraz sklejania klatek przechodzą: `npm run typecheck && npm test && npm run build` (19 plików testowych, 69 testów na zielono).

## Spec Changes

- None — implementation matches `.speccraft/docs/02-General-PRD.md`, `.speccraft/docs/04-Interface-spec.md`, and `.speccraft/docs/05-Tech-Stack.md`.
