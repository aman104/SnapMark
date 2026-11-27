# SnapMark

![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?style=flat-square&logo=googlechrome&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=flat-square&logo=vite&logoColor=white)
![HTML5 Canvas](https://img.shields.io/badge/HTML5-2D_Canvas-E34F26?style=flat-square&logo=html5&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-Unit_Tests-6E9F18?style=flat-square&logo=vitest&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-Chromium_E2E-2EAD33?style=flat-square&logo=playwright&logoColor=white)
![Privacy](https://img.shields.io/badge/Privacy-100%25_Local_%7C_Zero_Network-FF3B30?style=flat-square)

**Fast contextual screenshots with a lightweight, privacy-first vector annotation editor — built as a Chrome Extension (Manifest V3).**

SnapMark turns the multi-step routine of capturing, cropping, annotating, and exporting screenshots into a single local workflow. Capture a clean visible viewport (without browser scrollbars), an interactive screen area with adjustable handles, a full scrolling page with floating headers hidden, a right-clicked `<img>` bypassing CORS/AVIF/WebP blocks, or a text selection — then annotate at full Retina DPI and export a crisp PNG in one click.

---

## Highlights

- **100% Local & Privacy-First** — Zero external network requests, zero telemetry, zero remote fonts or CDNs. Captures are transferred via IndexedDB (`Blob`) and purged immediately once loaded onto the editor canvas.
- **Least-Privilege Manifest V3** — Uses only `activeTab`, `contextMenus`, `downloads`, `scripting`, and `storage`. Never requests `<all_urls>` or `host_permissions`.
- **Retina / HiDPI Native** — Every capture, crop, vector annotation, and exported PNG preserves full physical `devicePixelRatio` resolution.
- **Fit-to-Width Dark Studio Editor** — Clean dark workspace with automatic fit-to-width preview (no horizontal scrollbars) and zero canvas jump while drawing.

---

## Capture Modes

1. **Visible Screen (`Viewport`)**
   - Instant capture of the current viewport via popup, context menu, or keyboard shortcut.
   - Automatically hides browser scrollbars during capture and restores them immediately afterward.
2. **Full Page Scroll (`Full-Page`)**
   - Scrolls and stitches the entire page from the top with Chrome rate-limit throttling (`>= 550 ms` between frames).
   - Automatically hides `position: fixed` and `position: sticky` headers/banners after Frame #1 so they never repeat at seams, and restores original scroll position and DOM styles on completion, cancellation (`Esc`), or error.
3. **Select Screen Area (`Area Selection`)**
   - Full-screen interactive crosshair overlay on the webpage.
   - Drag to draw a selection rectangle, then fine-tune it with **8 resize handles** (corners & edges), **drag inside to move**, live pixel dimensions (`W × H px`), and floating **Cancel / Apply** buttons (or `Enter` / `Esc`).
4. **Right-Click Contextual Captures**
   - **Edit and download image** (`<img>`): measures the clicked element's bounding box and crops directly from `captureVisibleTab`, bypassing CORS, hotlink protection, and WebP/AVIF save restrictions.
   - **Capture text selection**: captures the selected text with a `20 px` safety margin scaled by `devicePixelRatio`.
5. **Clipboard Paste & Local File**
   - Open `editor.html` directly and paste an image (`Ctrl+V` / `Cmd+V`) or open a local PNG/JPG file.

---

## Vector Annotation Editor

Every annotation is stored as an editable vector object (not baked into the image until export) with full multi-step **Undo (`Ctrl+Z` / `Cmd+Z`)** and **Delete (`Delete` / `Backspace`)**:

- **Arrow (`1`)** — Proportional filled arrowhead, default thick (`8 px`) Signal Red (`#FF3B30`), with post-draw draggable start & end handles.
- **Line & Highlighter (`2`)** — Two-in-one mode:
  - **Underline** (solid, default medium `4 px`, `8 / 4 / 2 px` options).
  - **Highlighter** (translucent `0.35` alpha marker).
  - Hold `Shift` while drawing or dragging endpoints to lock a perfectly horizontal line.
- **Text (`3`)** — In-canvas text input aligned directly with the rendered text (no position shift on commit), double-click to re-edit, single click-off to commit and deselect, and 3 readability styles: **Plain** (default), **Background**, and **Outline**.
- **Numbered Step Badges (`4`)** — Click to place auto-incrementing circular step markers (`1`, `2`, `3`, …) in your chosen background color with automatic contrasting digit color. Edit any step's number via the toolbar (`− / input / +`) or double-click.
- **Freehand Pen (`5`)** — Smooth freehand drawing with endpoint selection handles, recoloring, thickness switching (`8 / 4 / 2 px`), and dragging.
- **Interactive Crop (`C`)** — Drag to crop, resize with **8 corner/edge handles**, drag inside to reposition, view live pixel dimensions, confirm via floating **Apply / Cancel** buttons (`Enter` / `Esc`), and undo crops with `Ctrl+Z` / `Cmd+Z`.
- **One-Click PNG Export** — Exports a flattened HiDPI PNG named `<domain>_YYYY-MM-DD_HH-mm.png` and automatically closes the editor tab once Chrome confirms the download completed.

---

## Installation (Load Unpacked in Chrome / Brave / Edge / Arc)

### Prerequisites

- **Node.js 20+**
- **npm 10+**

### Build & Load

```bash
git clone <your-repo-url>
cd SnapMark
npm install
npm run build
```

1. Open `chrome://extensions` in your Chromium browser.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the generated `dist/` directory.
4. *(Optional)* Verify or customize global capture shortcuts at `chrome://extensions/shortcuts`.

---

## Keyboard Shortcuts

| Shortcut | Context | Action |
|---|---|---|
| `Ctrl + Shift + V` *(macOS)* / `Alt + Shift + V` *(Win/Linux)* | Global (Chrome) | Capture visible screen (Viewport) |
| `Ctrl + Shift + F` *(macOS)* / `Alt + Shift + F` *(Win/Linux)* | Global (Chrome) | Capture full page with scrolling |
| `Ctrl + Shift + S` *(macOS)* / `Alt + Shift + S` *(Win/Linux)* | Global (Chrome) | Interactive screen area selection |
| `Enter` / `Esc` | Area Selection / Crop | Apply selection / Cancel |
| `1` / `2` / `3` / `4` / `5` / `C` | Editor | Switch tool: **Arrow**, **Line/Highlighter**, **Text**, **Step numbers**, **Pen**, **Crop** |
| `Shift` *(hold)* | Editor | Lock horizontal axis when drawing or adjusting Arrow/Line |
| `Ctrl + Z` / `Cmd + Z` | Editor | Undo last action (including crop & step edits) |
| `Delete` / `Backspace` | Editor | Delete selected annotation |
| `Esc` | Editor | Deselect active annotation / clear crop box |
| `Ctrl + V` / `Cmd + V` | Editor (empty state) | Paste image from clipboard |

---

## Development & Testing

```bash
# Start local Vite dev server for popup.html and editor.html
npm run dev

# Type-check with TypeScript (strict mode)
npm run typecheck

# Run unit & integration tests (Vitest + JSDOM)
npm test

# Build production extension into ./dist
npm run build

# Install Chromium once for real browser E2E tests
npx playwright install chromium

# Run E2E suite (Vitest E2E + real Chromium extension workflow)
npm run test:e2e

# Build and package Chrome Web Store release archive (snapmark-extension.zip)
npm run package
```

Full verification pipeline:

```bash
npm run typecheck && npm test && npm run build && npm run test:e2e && npm run package
```

---

## Tech Stack

- **Runtime:** Chrome Extension Manifest V3
- **Language:** TypeScript 5.x (Strict Mode)
- **UI & Rendering:** Vanilla DOM + HTML5 2D `<canvas>` + CSS Custom Properties
- **Storage:** IndexedDB (`SnapMarkDB` for transient raw `Blob` transfer) + `chrome.storage.local`
- **Build & Packaging:** Vite 5.x + Rollup multi-entry bundle
- **Testing:** Vitest (unit/integration) + Playwright Chromium (real extension E2E)

---

## Project Structure

```text
SnapMark/
├── public/
│   ├── manifest.json             # Chrome Extension Manifest V3 declaration
│   └── icons/                    # Extension icons (16, 32, 48, 128 px)
├── src/
│   ├── background/
│   │   ├── index.ts              # Service worker listeners (menus, commands, messages)
│   │   ├── capture-orchestrator.ts # Capture pipelines & IndexedDB session handoff
│   │   └── rate-limiter.ts       # >= 550 ms captureVisibleTab throttling
│   ├── content/
│   │   └── capture-injected.ts   # Self-contained on-demand DOM scripts (area, scroll, image, selection)
│   ├── popup/
│   │   └── index.ts              # Extension popup controller (320 px)
│   ├── editor/
│   │   ├── index.ts              # Editor toolbar, interactions, crop, and keyboard shortcuts
│   │   ├── canvas-stage.ts       # HiDPI canvas renderer & fit-to-width scaling
│   │   ├── vector-engine.ts      # Vector hit-testing, endpoint handles, movement
│   │   ├── text-overlay.ts       # In-canvas text input overlay
│   │   ├── history.ts            # Multi-step undo history stack
│   │   └── exporter.ts           # Flattened HiDPI PNG export & download tracking
│   ├── shared/
│   │   ├── types.ts              # Shared TypeScript interfaces
│   │   ├── constants.ts          # Colors, stroke widths, defaults
│   │   ├── db.ts                 # IndexedDB Blob transfer store with immediate purge
│   │   ├── dpi.ts                # Physical pixel & crop math
│   │   ├── filename.ts           # Automatic <domain>_YYYY-MM-DD_HH-mm.png formatter
│   │   ├── settings.ts           # User settings helpers
│   │   └── url-guard.ts          # Restricted browser URL detection (chrome://, Web Store)
│   └── styles/
│       ├── tokens.css            # Dark Studio Utility design tokens
│       ├── popup.css             # Popup styles
│       └── editor.css            # Editor toolbar & stage styles
├── tests/
│   ├── unit/                     # Vitest unit & integration test suites
│   └── e2e/                      # Vitest E2E + real Chromium extension workflow
├── scripts/
│   └── package-extension.mjs     # Chrome Web Store .zip packager
├── popup.html
├── editor.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```
