# Interface Specification

## 1. Executive Summary & UI Paradigm

**SnapMark** is a local-first Chrome Extension (Manifest V3) built around a **Zero-Friction, Capture-to-Canvas** UI paradigm. Instead of forcing the user through multi-screen dashboards, account walls, or nested settings panels, the entire product interface is split into three tightly focused interaction surfaces governed by the **Dark Studio Utility** design language (`03-Design.md`):

1. **OS / Browser Native Triggers (`chrome.contextMenus` & `chrome.commands`)**: Direct contextual actions inside the active webpage (right-clicking a text selection, right-clicking an `<img>` element, or pressing global keyboard shortcuts).
2. **Compact Extension Action Popup (`popup.html`)**: A `320px`-wide dark launcher sheet anchored to the browser toolbar icon for triggering Viewport, Full-Page Scroll, or Selection captures, monitoring multi-frame scroll capture progress, and toggling the pre-capture yellow text highlight preference.
3. **Full-Viewport Vector Annotation Editor (`editor.html`)**: A distraction-free dark studio (`{colors.canvas}` `#0F1115`) with a single fixed `56px` top toolbar (`{colors.surface-1}` `#171A21`) housing all 4 core tools (**Strzałka**, **Podkreślenie i zakreślacz**, **Tekst**, **Cofnij / Eksport**) and a central scrollable `<canvas>` workspace that maintains non-destructive vector objects (`annotations[]`) above the HiDPI screenshot bitmap until export.

---

## 2. Information Architecture (Sitemap)

Because SnapMark is a browser extension operating under its own `chrome-extension://<extension-id>/` origin without external servers, its information architecture maps every entry point, extension view, and temporary on-page DOM layer:

- **Native Browser Surface (Host Browser UI)**
  - `contextMenus["selection"]` → **„Zrób screena zaznaczenia”**
  - `contextMenus["image"]` → **„Edytuj i pobierz obrazek”**
  - `contextMenus["page"]` → **„Zrób zrzut widocznego ekranu”**
  - `commands` (Keyboard Shortcuts):
    - `Alt + Shift + V` (`capture-viewport`)
    - `Alt + Shift + F` (`capture-fullpage`)
    - `Alt + Shift + S` (`capture-selection`)
  - `chrome.action` Badge (`setBadgeText` / `setBadgeBackgroundColor`) → Live frame progress indicator during full-page scroll capture (e.g., `1/6`, `3/6`).
- **On-Demand Target Page DOM Overlay (Ephemeral via `chrome.scripting`)**
  - `[data-snapmark-highlight]` → Ephemeral yellow highlight rects (`rgba(255, 235, 59, 0.45)`) rendered over selected text for `< 80ms` during capture when `highlightSelectionBeforeCapture === true`, then immediately cleaned up.
- **`chrome-extension://<id>/popup.html` (Extension Toolbar Popup)**
  - State A: Default Ready Launcher (3 capture mode cards + highlight toggle + image right-click hint)
  - State B: Active Full-Page Scroll Progress View (live frame counter, progress bar, cancel button)
  - State C: Restricted Page Notice (`chrome://`, `edge://`, Chrome Web Store, etc.)
- **`chrome-extension://<id>/editor.html?captureId=<id>` (Vector Annotation Editor)**
  - Primary View: Fixed Top Toolbar (`56px`) + Scrollable HiDPI Vector Canvas Workspace
  - Sub-State: In-Canvas Floating `<textarea>` Overlay (when creating or editing a `text` annotation)
  - Sub-State: Vector Selection & Draggable Endpoint Handles (`(x1, y1)` and `(x2, y2)`)
  - Fallback View (`editor.html` without valid `captureId`): Empty State Card with Clipboard Paste (`Ctrl+V`) and Local Image File Loader

---

## 3. Core User Flows

### Flow 1: Contextual Text Selection Capture → Arrow & Highlighter Annotation → Copy to Clipboard
1. **Trigger**: User selects a paragraph of text on an article (`https://domena.pl/artykul`), right-clicks the selection, and clicks **„Zrób screena zaznaczenia”** (or presses `Alt + Shift + S`).
2. **DOM Measurement & Optional Highlight**:
   - Injected script reads `window.getSelection().getRangeAt(0)`.
   - If the *„Podświetl zaznaczony tekst na żółto”* setting (`highlightSelectionBeforeCapture`) is `true`, the script renders temporary `<div data-snapmark-highlight>` boxes (`{colors.selection-highlight}` `#FFEB3B` at `0.45` opacity) over each `range.getClientRects()` box and temporarily hides the browser's blue selection highlight.
   - Script calculates `Range.getBoundingClientRect()`, expands it by `selectionPaddingPx` (`20px` CSS on top, right, bottom, left, clamped to `0..window.innerWidth` and `0..window.innerHeight`), multiplies `(x, y, width, height)` by `window.devicePixelRatio`, and returns the geometry to `background.js`.
3. **Capture & Cleanup**:
   - `background.js` calls `chrome.tabs.captureVisibleTab({ format: 'png' })`, crops the physical pixel region onto an `OffscreenCanvas` (or passes the frame + crop rect), removes any temporary highlight DOM nodes, writes the `CaptureSession` `Blob` to IndexedDB (`SnapMarkDB.captures`), and opens `editor.html?captureId=cap_<timestamp>` in a new active tab.
4. **Immediate Vector Drawing**:
   - `editor.html` loads the `Blob` onto the `<canvas>`, immediately deletes the temporary record from IndexedDB, and defaults to the **Strzałka** tool with `{colors.annotation-red}` (`#FF3B30`) and `4px` stroke width.
   - User drags across the canvas to draw a red vector arrow pointing at a sentence. Two draggable white/blue endpoint handles appear at `(x1, y1)` and `(x2, y2)` so the user can fine-tune the arrowhead position.
   - User clicks **Podkreślenie / Zakreślacz** in the top toolbar, selects the **Zakreślacz** sub-mode, holds `Shift` (locking `y2 = y1`), and drags across a line of text to apply a semi-transparent (`globalAlpha = 0.35`) marker highlight.
5. **1-Click Clipboard Export**:
   - User clicks the primary CTA **„Kopiuj do schowka”** (`{components.button-primary}`).
   - Editor composites the base screenshot bitmap and the `annotations[]` vector array onto an offscreen export canvas at full physical resolution, writes the `image/png` `Blob` to `navigator.clipboard.write()`, and transitions the button to `{colors.success}` (`#22C55E`) with label **„✓ Skopiowano!”** for `2000ms`.

### Flow 2: Right-Click Image Capture (`<img>`) → Text Callout with Outline → Download PNG
1. **Trigger**: User right-clicks directly on an `<img>` element on any webpage (even if served as `AVIF`/`WebP` or protected by CORS) and clicks **„Edytuj i pobierz obrazek”**.
2. **Coordinate Extraction**:
   - Injected script locates the target `<img>` element (recorded from the last `contextmenu` event target or matched via `srcUrl`/`currentSrc`), scrolls it fully into view if partially clipped (`scrollIntoView({ block: 'nearest', behavior: 'instant' })`), waits one animation frame, reads `img.getBoundingClientRect()`, and multiplies by `window.devicePixelRatio`.
3. **Crop & Editor Launch**:
   - `background.js` captures the visible tab, crops the exact `<img>` bounding box, stores the `Blob` in IndexedDB, and opens `editor.html`.
4. **Text Annotation with Readability Outline**:
   - User selects the **Tekst** tool (`T`) in the top toolbar and chooses the **Obrys (Biały)** readability mode (or **Tło (Kontrast)** pill mode).
   - User clicks on the image. An in-canvas `<textarea>` overlay spawns at `(x, y)` with `{typography.canvas-annotation}` styling. User types a comment and presses `Enter` (or clicks outside) to commit the text object to `annotations[]`.
5. **Auto-Named PNG Download**:
   - User clicks **„Pobierz PNG”** (`{components.button-secondary}`).
   - Browser downloads `domena-pl_2026-11-21_14-10.png` at full Retina resolution.

### Flow 3: Full-Page Scroll Capture with Fixed/Sticky Header Suppression
1. **Trigger**: User opens `popup.html` (or presses `Alt + Shift + F`) and clicks **„Cała strona ze scrollem”**.
2. **Scroll Loop & Throttling**:
   - Popup switches to the **Active Scroll Capture Progress State** (`Przechwytywanie: klatka 1 z N...`, progress bar `{colors.accent}`). Extension icon badge displays `1/N`.
   - Injected controller saves original `(scrollX, scrollY)`, hides scrollbars, scrolls to `(0, 0)`, and captures **Frame #1** (preserving top `fixed`/`sticky` headers on the first frame only).
   - Before **Frame #2**, the script queries all DOM elements where `getComputedStyle(el).position` is `'fixed'` or `'sticky'` and applies temporary `visibility: hidden !important`.
   - The loop steps downward by `window.innerHeight`, waiting **>= 550 ms** between each `chrome.tabs.captureVisibleTab()` call to respect Chrome's `MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND` rate limit.
3. **Restoration & Stitching**:
   - After the final frame (or if the user clicks **„Anuluj (Esc)”**), a `finally` block restores all `fixed`/`sticky` elements, scrollbars, and the original scroll position.
   - Frames are stitched onto a single `<canvas>` in `editor.html` (accounting for the partial `deltaY` offset of the last frame and `devicePixelRatio`), ready for annotation and export.

---

## 4. Global UI Elements

Because `popup.html` and `editor.html` are separate extension documents, they share a common CSS token stylesheet (`styles/tokens.css`) implementing `03-Design.md`:

- **Shared Brand Header Badge**:
  - SnapMark logomark: a `24px × 24px` rounded square (`{rounded.sm}` `6px`, background `{colors.primary}` `#FF3B30`) containing a crisp white viewfinder-plus-arrow vector SVG icon, paired with the **SnapMark** wordmark (`{typography.heading-md}` `15px`, weight `600`, `{colors.ink}`).
- **Keyboard Shortcut Badges (`<kbd>`)**:
  - Styled via `{components.kbd-badge}` (`{colors.surface-2}` `#1E222B`, border `1px solid {colors.hairline-strong}`, `{typography.code}` `11px`, `{rounded.xs}` `4px`, padding `2px 6px`). Used across both the popup cards and editor tooltips.
- **Toast / Status Banner Region**:
  - Top-centered floating banner (`z-index: 200`, `{rounded.lg}` `10px`, `{elevation.shadow-lg}`) inside `editor.html` for non-blocking warnings (e.g., max canvas height reached) or errors (e.g., clipboard permission fallback).

---

## 5. Screen Specifications

### 5.1 Screen 1: Extension Action Popup (`popup.html`)

- **Purpose**: Provide instant 1-click access to the capture modes, display active keyboard shortcuts, show real-time progress during full-page scroll capture, and let the user toggle pre-capture yellow text highlighting.
- **Layout Structure**:
  - Fixed-width popover container: `width: 320px`, `background: {colors.canvas}` (`#0F1115`), `color: {colors.ink}`, outer padding `{spacing.md}` (`12px`), vertical flex stack (`gap: 12px`).
- **Data Mapping**:
  - `activeTabStatus` (detected via lightweight `chrome.tabs.query` + `chrome.scripting.executeScript` check on popup open):
    - `isRestrictedUrl`: `boolean` (`true` for `chrome://`, `edge://`, `about:`, Chrome Web Store).
    - `hasTextSelection`: `boolean` (`true` if `window.getSelection().toString().trim().length > 0`).
    - `selectedTextPreview`: `string` (truncated to 36 chars if selection exists).
  - `userSettings` (from `chrome.storage.local`):
    - `highlightSelectionBeforeCapture`: `boolean` (default `false`).
  - `scrollCaptureProgress` (live message stream during full-page capture):
    - `currentFrame`: `number`, `totalFrames`: `number`, `statusText`: `string`.
- **UI Sections & Elements**:
  1. **Popup Header Bar (`height: 28px`, flex row, `justify-content: space-between`, `align-items: center`)**:
     - Left: SnapMark brand icon (`20px × 20px`) + title **"SnapMark"** (`{typography.heading-md}`).
     - Right: Privacy status pill (`{rounded.pill}`, background `{colors.surface-2}`, text `{colors.ink-muted}`, `{typography.caption}` `11px`): `Lokalny • MV3`.
  2. **Primary Capture Mode Stack (Vertical flex list, `gap: 8px`)**:
     - **Card 1 — Widoczny ekran (Viewport)** (`#btn-capture-viewport`, `{components.popup-action-card}`):
       - Left icon: `20px × 20px` monitor/viewport frame SVG (`{colors.ink}`).
       - Center column: Title **"Widoczny ekran"** (`{typography.button}`, `{colors.ink}`) + subtitle *"Natychmiastowy zrzut aktualnego widoku"* (`{typography.caption}`, `{colors.ink-muted}`).
       - Right: `<kbd>` badge `Alt+Shift+V`.
     - **Card 2 — Cała strona ze scrollem** (`#btn-capture-fullpage`, `{components.popup-action-card}`):
       - Left icon: `20px × 20px` vertical scroll page SVG (`{colors.ink}`).
       - Center column: Title **"Cała strona ze scrollem"** (`{typography.button}`, `{colors.ink}`) + subtitle *"Skleja klatki i ukrywa pływające nagłówki"* (`{typography.caption}`, `{colors.ink-muted}`).
       - Right: `<kbd>` badge `Alt+Shift+F`.
     - **Card 3 — Zaznacz fragment ekranu** (`#btn-capture-selection`, `{components.popup-action-card}` — updated by `07-feature-plan-interactive-area-selection`):
       - Left icon: `20px × 20px` crosshair / crop area selection SVG.
       - Center column: Title **"Zaznacz fragment ekranu"** (`{typography.button}`) + subtitle *"Włącz celownik i zaznacz kawałek strony"* (`{typography.caption}`, `{colors.ink-muted}`). Always enabled on regular web pages; clicking it closes the popup and launches the in-page crosshair area selector (`[data-snapmark-area-overlay]`).
       - Right: `<kbd>` badge `Alt+Shift+S`.
  3. **Contextual Image Hint Strip (`background: {colors.surface-1}`, `border: 1px dashed {colors.hairline-strong}`, `{rounded.md}`, `padding: 8px 10px`)**:
     - Flex row with `16px` image icon + `{typography.caption}` text in `{colors.ink-muted}`:
       *"Wskazówka: Kliknij **PPM na dowolnym obrazku**, aby wyciąć go z pominięciem blokad CORS i WebP/AVIF."*
  4. **Settings Footer (`border-top: 1px solid {colors.hairline}`, `padding-top: 10px`)**:
     - Flex row (`justify-content: space-between`, `align-items: center`):
       - Label (`<label for="toggle-highlight">`, `{typography.body-sm}` `12px`, `{colors.ink}`): **"Podświetl zaznaczony tekst na żółto"** + sub-caption *"Tymczasowy marker przed zrzutem"*.
       - Switch (`#toggle-highlight`, `role="switch"`): `36px × 20px` pill switch (`{colors.surface-2}` unchecked → `{colors.primary}` checked).
- **Interactions & Transitions**:
  - Clicking **Widoczny ekran** or **Zaznaczony fragment tekstu** immediately triggers the capture in `background.js` and closes the popup as the new `editor.html` tab takes focus.
  - Clicking **Cała strona ze scrollem** transitions the popup in-place into the **Scroll Capture Progress State** (Section 7.3) so the user can watch frame assembly or cancel it.
  - Toggling `#toggle-highlight` immediately persists `{ highlightSelectionBeforeCapture: boolean }` to `chrome.storage.local`.

---

### 5.2 Screen 2: Vector Annotation Editor (`editor.html`)

- **Purpose**: Allow the user to annotate the captured screenshot with vector arrows, underlines, semi-transparent highlighter strokes, and readable text callouts, undo any step with `Ctrl+Z`, and export in 1 click to Clipboard or an auto-named PNG file.
- **Layout Structure**:
  - Full-window app shell (`width: 100vw; height: 100vh; display: flex; flex-direction: column; background: {colors.canvas}; overflow: hidden`).
  - **Top Region**: Fixed Top Toolbar (`<header class="editor-toolbar">`, `height: 56px`, `flex-shrink: 0`, `background: {colors.surface-1}`, `border-bottom: 1px solid {colors.hairline}`, `{elevation.shadow-md}`).
  - **Main Region**: Scrollable Canvas Stage (`<main class="editor-stage">`, `flex: 1`, `overflow: auto`, `padding: 32px`, subtle radial dot background pattern, flex-centering the `<div class="canvas-container">`).
- **Data Mapping**:
  - Loaded from IndexedDB (`SnapMarkDB.captures.get(captureId)`):
    - `sourceDomain` (e.g., `domena-pl`), `capturedAt` (ISO timestamp), `mode` (`selection | image | viewport | fullpage`), `dpr` (`number`), `frames` / cropped image `Blob`.
    - Computed auto-filename: `<sourceDomain>_<YYYY-MM-DD>_<HH-mm>.png` (e.g., `domena-pl_2026-11-21_14-10.png`).
    - Computed dimensions badge: `<cssWidth> × <cssHeight> px (@<dpr>x)`.
  - Editor Reactive State:
    - `activeTool`: `'arrow' | 'line' | 'text'` (default: `'arrow'`).
    - `lineSubtype`: `'underline' | 'highlighter'` (default: `'highlighter'`).
    - `activeColor`: `'#FF3B30' | '#FFCC00' | '#34C759' | '#007AFF' | '#FFFFFF' | '#1C1C1E'` (default: `'#FF3B30'`).
    - `strokeWidth`: `2 | 4 | 8` (default: `4`).
    - `textStyleMode`: `'background' | 'outline' | 'plain'` (default: `'background'`).
    - `annotations`: `AnnotationItem[]` (vector objects array).
    - `historyStack`: `AnnotationItem[][]` (snapshots for `Ctrl+Z`).
    - `selectedAnnotationId`: `string | null`.
- **UI Sections & Elements**:

  #### A. Top Toolbar (`56px` height, 4 horizontal clusters separated by `1px × 24px` `{colors.hairline}` dividers)

  1. **Cluster 1 — Brand & Capture Metadata (Left)**:
     - SnapMark `24px` icon + **"SnapMark"** title (`{typography.heading-md}`).
     - Filename & Resolution Pill (`background: {colors.surface-2}`, `{rounded.md}`, `padding: 4px 10px`, flex row, `gap: 8px`):
       - Monospace filename preview (`#meta-filename`, `{typography.code}`, `{colors.ink}`): e.g., `domena-pl_2026-11-21_14-10.png`.
       - Resolution badge (`#meta-dimensions`, `{typography.code}`, `{colors.ink-muted}`): e.g., `1280×800 • @2x`.

  2. **Cluster 2 — Primary Vector Tools (Center-Left, `gap: 6px`)**:
     - **Tool 1: Strzałka (Vector Arrow)** (`#tool-arrow`, `{components.toolbar-tool-button}`, active by default):
       - Diagonal arrow SVG icon + label **"Strzałka"** + `<kbd>1</kbd>`.
     - **Tool 2: Podkreślenie i zakreślacz (2-in-1 Line & Highlighter)** (`#tool-line`, `{components.toolbar-tool-button}`):
       - Highlighter/underline SVG icon + label **"Linia / Marker"** + `<kbd>2</kbd>`.
     - **Tool 3: Tekst (Text Callout)** (`#tool-text`, `{components.toolbar-tool-button}`):
       - `T` typography SVG icon + label **"Tekst"** + `<kbd>3</kbd>`.

  3. **Cluster 3 — Contextual Style & Property Controls (Center-Right, `gap: 12px`)**:
     - **Color Swatch Tray (`#color-picker`, always visible)**:
       - 6 circular buttons (`20px × 20px`, `{rounded.pill}`) inside a `{colors.surface-2}` pill tray (`padding: 4px 8px`, `gap: 6px`):
         1. Signal Red `#FF3B30` (default active, white outer ring)
         2. Vivid Yellow `#FFCC00`
         3. Emerald Green `#34C759`
         4. Electric Blue `#007AFF`
         5. Pure White `#FFFFFF`
         6. Carbon Dark `#1C1C1E`
     - **Contextual Sub-Control A — When `activeTool === 'arrow'`**:
       - **Grubość (Stroke Width Segmented Pill, `#stroke-width-picker`)**: 3 segments inside `{colors.surface-2}` (`{rounded.md}`):
         - `Cienka (2px)`
         - `Średnia (4px)` (default active)
         - `Gruba (8px)`
     - **Contextual Sub-Control B — When `activeTool === 'line'` (Podkreślenie i zakreślacz)**:
       - **2-in-1 Mode Segmented Toggle (`#line-subtype-picker`)**:
         - Segment 1: **"Podkreślenie"** (solid crisp line underneath text, `globalAlpha = 1.0`, respects `strokeWidth` `2px / 4px / 8px`).
         - Segment 2: **"Zakreślacz"** (semi-transparent marker ribbon, `globalAlpha = 0.35`, tall marker nib `24px` CSS scaled by `dpr`).
       - **Shift Hint Badge**: Compact pill `<kbd>Shift</kbd> = poziom` (`{typography.caption}`, `{colors.ink-muted}`).
     - **Contextual Sub-Control C — When `activeTool === 'text'`**:
       - **Readability Style Segmented Toggle (`#text-style-picker`)**:
         - Segment 1: **"Tło"** (`styleMode: 'background'` — draws a high-contrast rounded pill box behind the text: dark `#1C1C1E` pill for light/colored text, or colored pill with white/dark text).
         - Segment 2: **"Obrys"** (`styleMode: 'outline'` — draws a thick contrasting white `#FFFFFF` or dark `#1C1C1E` stroke halo `lineWidth = 4px * dpr` around every glyph via `ctx.strokeText()` before `ctx.fillText()`, ensuring instant legibility over both dark and bright photographic backgrounds).
         - Segment 3: **"Czysty"** (`styleMode: 'plain'` — solid fill glyphs only).

  4. **Cluster 4 — History & Export Actions (Right, `gap: 8px`)**:
     - **Cofnij (`Ctrl+Z`)** (`#btn-undo`, `{components.button-secondary}`):
       - Undo curved-arrow SVG icon + label **"Cofnij"** + `<kbd>Ctrl+Z</kbd>` + badge count of undoable steps. Disabled (`opacity: 0.4`) when `historyStack.length === 0`.
     - **Usuń zaznaczony (`Delete`)** (`#btn-delete-selected`, ghost danger icon button):
       - Trash SVG icon (`34px × 34px`), enabled only when `selectedAnnotationId !== null` (`title="Usuń zaznaczony obiekt (Delete / Backspace)"`).
     - **Pobierz PNG** (`#btn-download-png`, `{components.button-secondary}`):
       - Download tray SVG icon + label **"Pobierz PNG"**.
     - **Kopiuj do schowka** (`#btn-copy-clipboard`, `{components.button-primary}`):
       - Clipboard SVG icon + label **"Kopiuj do schowka"** (primary Signal Red `#FF3B30` CTA; switches to `#22C55E` **"✓ Skopiowano!"** for `2000ms` on click).

  #### B. Central Canvas Stage (`<main class="editor-stage">`)
  - **`<div class="canvas-wrapper" style="position: relative;">`**:
    - Holds `<canvas id="editor-canvas">` sized to physical pixels (`canvas.width = physicalWidth`, `canvas.height = physicalHeight`) and styled to CSS dimensions (`style.width = cssWidth + 'px'`, `style.height = cssHeight + 'px'`), with `{elevation.shadow-xl}` and `border-radius: 0px`.
    - Holds `<div id="text-overlay-layer">` positioned `absolute; inset: 0; pointer-events: none;` for spawning the interactive `<textarea>` when placing or editing a text object.

- **Interactions & Transitions**:
  - **Hit-Testing & Selection on Vector Layer**:
    - Pressing `mousedown` on the canvas first performs hit-testing against existing items in `annotations[]` (in reverse draw order, top-most first):
      - **Arrow endpoints**: Distance check `<= 10px` CSS to `(x1, y1)` or `(x2, y2)`. Dragging an endpoint handle updates only that endpoint in real time (`requestAnimationFrame` redraw loop) and pushes a snapshot to `historyStack` on `mouseup`.
      - **Arrow shaft / Line segment**: Point-to-segment distance check `<= max(8px, strokeWidth / 2 + 4px)`. Clicking selects the object (`selectedAnnotationId = item.id`), shows its two endpoint handles, and allows dragging the entire vector object across the canvas.
      - **Text bounding box**: Point-in-rect check against the text object's measured bounding box (`x, y, width, height`). Single-clicking selects and allows dragging to reposition; double-clicking re-opens the in-canvas `<textarea>` to edit the text content.
    - Clicking an empty area of the canvas when a tool is active starts creating a new annotation of `activeTool`.
    - When `selectedAnnotationId !== null`, clicking a color swatch, stroke width, or text style mode in the top toolbar updates the selected object immediately AND updates the active default for the next object.
  - **Keyboard Shortcuts in `editor.html`**:
    - `Ctrl + Z` / `Cmd + Z`: Undo last operation (`annotations` restored from `historyStack.pop()`).
    - `Delete` / `Backspace` (when not typing inside the `<textarea>`): Delete the currently selected annotation (`selectedAnnotationId`).
    - `Shift` (held during `mousemove` with **Podkreślenie / Zakreślacz**): Locks `y2 = y1` for a strictly horizontal line (or `x2 = x1` if vertical delta exceeds horizontal delta by 3:1, with horizontal prioritized for text underlining/highlighting).
    - `1`, `2`, `3` (when not typing inside `<textarea>`): Quick-switch between **Strzałka** (`1`), **Podkreślenie / Zakreślacz** (`2`), and **Tekst** (`3`).
    - `Escape`: Deselects current vector object or cancels active `<textarea>` input.

---

### 5.3 Screen 3: Editor Empty / Fallback State (`editor.html` without active `captureId`)

- **Purpose**: Handle direct navigation to `editor.html` (or page reload after the temporary IndexedDB record was already purged) gracefully without a broken blank canvas.
- **Layout Structure**:
  - Centered card (`{components.card}`, `max-width: 440px`, `padding: 24px`, `border: 1px solid {colors.hairline-strong}`, `{elevation.shadow-lg}`) inside `.editor-stage`.
- **UI Sections & Elements**:
  - Icon: `40px × 40px` SnapMark viewfinder icon in `{colors.primary}`.
  - Heading: **"Brak aktywnego zrzutu na płótnie"** (`{typography.heading-lg}`).
  - Description (`{typography.body}`, `{colors.ink-muted}`): *"Zrzuty tymczasowe są usuwane z pamięci zaraz po wczytaniu dla ochrony prywatności. Wykonaj nowy zrzut z menu kontekstowego (PPM), popupu wtyczki lub wklej obraz bezpośrednio ze schowka."*
  - Action Row (flex row, `gap: 10px`, `margin-top: 16px`):
    - Primary Button (`{components.button-primary}`, `#btn-paste-clipboard`): **"Wklej ze schowka (Ctrl+V)"**.
    - Secondary Button (`{components.button-secondary}`, `#btn-open-file`): **"Wczytaj plik PNG/JPG..."** (triggers hidden `<input type="file" accept="image/*">`).

---

## 6. Modals, Drawers & Overlays

1. **In-Canvas Floating Text Input (`#active-text-input`)**:
   - **Trigger**: Clicking on the `<canvas>` while `activeTool === 'text'`, or double-clicking an existing vector text annotation.
   - **Layout & Styling**: An auto-expanding `<textarea>` positioned at `(x, y)` CSS coordinates relative to `.canvas-wrapper`, `z-index: 10`, font `{typography.canvas-annotation}` (`20px`, weight `600`), text color matching `activeColor` (or contrasting ink when in background-pill mode), `border: 1.5px dashed {colors.accent}`, `{rounded.sm}` (`6px`), `padding: 4px 8px`, `min-width: 120px`.
   - **Commit & Dismiss Behavior**:
     - Pressing `Enter` (without `Shift`) or clicking outside (`blur`) commits non-empty text into `annotations[]` as `{ id, type: 'text', x, y, text, color, fontSize: 20, styleMode }` and removes the DOM `<textarea>`.
     - Pressing `Shift + Enter` inserts a newline.
     - Pressing `Escape` cancels creation (or reverts edits) and removes the DOM `<textarea>`.

2. **Vector Endpoint & Bounding Handles (Canvas Overlay Graphics)**:
   - **Trigger**: Drawn automatically on the `<canvas>` interaction overlay pass whenever `selectedAnnotationId` matches an `arrow`, `line`, or `text` object (and immediately after finishing an arrow drag so the user sees right away that its endpoints can be adjusted).
   - **Visual Spec**:
     - For `arrow` and `line`: Two circular handles (`radius: 5px` CSS, fill `#FFFFFF`, stroke `2px solid {colors.accent}` `#3B82F6`) rendered at `(x1, y1)` and `(x2, y2)`. Hovering an endpoint changes the cursor to `crosshair` / `grab`; hovering the shaft changes the cursor to `move`.
     - For `text`: A dashed `{colors.accent}` selection rectangle (`4px` padding around measured text box) with `move` cursor.

3. **Ephemeral DOM Selection Highlight (`[data-snapmark-highlight]`)**:
   - **Trigger**: Injected into the target webpage only when `mode === 'selection'` (PPM context menu text capture) and `highlightSelectionBeforeCapture === true`.
   - **Visual Spec**: Fixed/absolute overlay `<div>` elements matching each client rect of `range.getClientRects()` with `background: rgba(255, 235, 59, 0.45); border-radius: 2px; pointer-events: none; z-index: 2147483646;`. Removed in a `finally` block immediately after `captureVisibleTab()` returns.

4. **Interactive In-Page Screen Area Selection Overlay (`[data-snapmark-area-overlay]` — `07-feature-plan-interactive-area-selection`)**:
   - **Trigger**: Clicking **„Zaznacz fragment ekranu”** (`#btn-capture-selection`) in `popup.html` or pressing `Alt + Shift + S`.
   - **Visual Spec**: Full-viewport overlay (`position: fixed; inset: 0; z-index: 2147483647; cursor: crosshair; user-select: none;`) with top helper pill (*„Przeciągnij myszą, aby zaznaczyć fragment ekranu • Esc anuluje”*), a dragging selection box (`border: 2px solid #FF3B30; box-shadow: 0 0 0 9999px rgba(15, 17, 21, 0.48);`), and a live dimension badge (`W × H px`). Removed completely from DOM before `captureVisibleTab()` fires.

---

## 7. Common UI Patterns & States

### 7.1 Controls & Immediate Feedback
- All toolbar controls in `editor.html` operate with **zero modal dialogs** and **instant synchronization**: changing color, line thickness, or text readability mode immediately updates the active tool state in `chrome.storage.local` and live-rerenders any currently selected vector object on the `<canvas>`.

### 7.2 Empty States
- **Popup without Active Text Selection**: Card #3 (**Zaznaczony fragment tekstu**) stays visible so the user learns the feature exists, but renders in a muted disabled state with helper text *"Najpierw zaznacz tekst na stronie lub użyj PPM"* and badge `Alt+Shift+S`.
- **Editor without Capture Data**: Displays the Fallback Empty State Card (Section 5.3) with `Ctrl+V` clipboard paste support.

### 7.3 Loading States (Full-Page Scroll Capture Progress)
- **Strict Non-Pollution Rule**: Never render a persistent progress bar inside the captured webpage DOM while `captureVisibleTab()` is firing.
- **Popup Progress View (`#scroll-progress-panel`)**:
  - Replaces the 3 action cards inside `popup.html` while full-page scroll capture is running:
    - Animated status header: **"Przechwytywanie całej strony..."** (`{typography.heading-sm}`, `{colors.ink}`).
    - Sub-detail (`#scroll-progress-text`, `{typography.caption}`, `{colors.ink-muted}`): *"Klatka 3 z 8 • Ukrywanie pływających nagłówków (fixed/sticky)..."*
    - Progress Track (`height: 6px`, `{rounded.pill}`, background `{colors.surface-2}`): Fill bar (`background: {colors.accent}`, width `(currentFrame / totalFrames) * 100%`, `transition: width 200ms ease`).
    - Cancel Button (`#btn-cancel-scroll`, `{components.button-secondary}`, full width): **"Anuluj i zatrzymaj (Esc)"**.
- **Extension Badge Progress (When triggered via `Alt + Shift + F` shortcut with popup closed)**:
  - `background.js` updates `chrome.action.setBadgeBackgroundColor({ color: '#FF3B30' })` and `chrome.action.setBadgeText({ text: '3/8' })` after each frame (~550 ms interval), clearing the badge (`text: ''`) as soon as `editor.html` opens.

### 7.4 Error & Warning Handling
- **Restricted Browser Pages (`chrome://`, `edge://`, `about:blank`, Chrome Web Store)**:
  - Opening `popup.html` on a restricted tab hides the active capture triggers and renders a clean danger banner (`background: rgba(239, 68, 68, 0.12)`, `border: 1px solid {colors.danger}`, `{rounded.lg}`, `padding: 12px`):
    - Title: **"Strona chroniona przez przeglądarkę"**
    - Message: *"Ze względów bezpieczeństwa Chrome blokuje wykonywanie zrzutów na stronach systemowych (chrome://) oraz w Chrome Web Store. Otwórz dowolną zwykłą stronę WWW."*
- **Max Canvas Height Reached During Scroll Capture**:
  - If a very tall page on a Retina screen exceeds the safe physical `<canvas>` height limit (`MAX_CANVAS_HEIGHT`, e.g., `16384px` or `32000px` physical pixels), the capture loop stops cleanly at the maximum safe frame, opens `editor.html` with all captured frames stitched, and displays a dismissible warning banner (`{colors.warning}`) below the toolbar:
    *"Osiągnięto maksymalną bezpieczną wysokość płótna w pełnej rozdzielczości Retina. Zrzut został zapisany do tej wysokości."*
- **Rate-Limit Backoff (`MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND`)**:
  - Handled transparently in `background.js` (550 ms base delay + automatic 600 ms retry on quota error) without interrupting the user's capture flow.

---

## 8. Responsive & Platform Specifics

- **HiDPI / Retina & OS Scaling (`window.devicePixelRatio` = `1.0`, `1.25`, `1.5`, `2.0`, `3.0`)**:
  - **Capture Cropping**: Every DOM coordinate from `Range.getBoundingClientRect()`, `img.getBoundingClientRect()`, and the `20px` CSS safety margin is multiplied by `window.devicePixelRatio` before slicing the bitmap from `chrome.tabs.captureVisibleTab()`.
  - **Editor Canvas Display vs Physical Backing Store**:
    - `<canvas id="editor-canvas">` sets `canvas.width = physicalWidth` and `canvas.height = physicalHeight`, while its CSS box is set to `style.width = (physicalWidth / dpr) + 'px'` and `style.height = (physicalHeight / dpr) + 'px'`.
    - All vector rendering in `editor.js` scales stroke widths (`2px`, `4px`, `8px`), highlighter thickness (`24px`), arrowhead geometry, and font size (`20px`) by `dpr` so annotations look identical in proportion on 1080p (`1x`) and 4K/Retina (`2x+`) displays, and export at full physical pixel fidelity.
- **Desktop Viewport Breakpoints (`editor.html`)**:
  - **Wide Desktop (`>= 1100px`)**: Single-row `56px` top toolbar showing full Polish text labels + `<kbd>` shortcut hints on all tool and export buttons.
  - **Compact Window (`< 1100px`)**: Toolbar automatically hides `<kbd>` shortcut badges inside buttons and compacts metadata filename length (`max-width: 160px; text-overflow: ellipsis`) so all 4 clusters remain on a single row without horizontal overflow.
- **Cross-OS Keyboard Shortcut Parity (macOS vs Windows/Linux)**:
  - The editor listens for `(event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z'` so both `Ctrl + Z` (Windows/Linux) and `Cmd + Z` (macOS) trigger Undo seamlessly.
