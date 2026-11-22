# Tech Stack Plan: SnapMark

## 1. Executive summary

**SnapMark** should be built as a **zero-runtime-dependency, TypeScript-powered Chrome Extension (Manifest V3)** bundled with **Vite** into a self-contained `dist/` unpacked extension folder.

Instead of pulling in heavy UI frameworks (React/Vue) or heavyweight canvas engines (Fabric.js/Konva) for a single-toolbar utility, SnapMark uses **strict TypeScript + Vanilla DOM + native HTML5 2D `<canvas>`** styled with CSS Custom Properties mapped 1:1 from `.speccraft/docs/03-Design.md`. This architecture guarantees sub-50ms startup for `popup.html` and `editor.html`, zero external network requests, trivial compliance with Chrome Web Store Manifest V3 Content Security Policy (`script-src 'self'`), full control over physical Retina/4K DPI math (`window.devicePixelRatio`), and effortless binary `Blob` transfers between the Background Service Worker and the Vector Editor via **IndexedDB**.

---

## 2. Product signals extracted from PRD

- **Platform & Runtime**: Chromium Browser Extension targeting **Manifest V3** (Chrome 114+, Brave, Edge, Arc on macOS/Windows/Linux).
- **Strict Permission Footprint**: Only `"activeTab"`, `"contextMenus"`, `"downloads"`, `"scripting"`, and `"storage"` (no `<all_urls>` host permissions, no persistent background content scripts). `"downloads"` was added in M07 solely to observe the completion state of the editor's own PNG download.
- **4 Contextual Capture Modes**:
  1. **Text Selection Capture**: On-demand DOM injection (`chrome.scripting.executeScript`), `Range.getBoundingClientRect()`, automatic `20px` CSS safety margin clamped to viewport, optional temporary yellow highlight (`#FFEB3B` at `0.45` alpha) before capture.
  2. **Image Element Capture (`<img>`)**: Right-click context menu (`contexts: ["image"]`) measuring `img.getBoundingClientRect()` and cropping directly from `chrome.tabs.captureVisibleTab()` to bypass CORS and `AVIF`/`WebP` format friction.
  3. **Visible Viewport Capture**: Instant capture via toolbar popup, page context menu, or `Alt + Shift + V`.
  4. **Full-Page Scroll Capture**: Step-by-step `window.scrollTo` loop with `>= 550 ms` throttling (respecting Chrome's `MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND = 2`), hiding `position: fixed` and `position: sticky` elements after Frame #1, and stitching frames onto a single `<canvas>`.
- **HiDPI / Retina Precision**: Every CSS coordinate (`x, y, width, height`, padding) must be multiplied by `window.devicePixelRatio` before cropping or stitching physical bitmaps from `captureVisibleTab()`.
- **High-Capacity Local Image Transfer**: Full-page Retina captures easily exceed URL length limits and `chrome.storage.local` single-key ergonomics; raw `Blob` frames must be passed via **IndexedDB** (`SnapMarkDB`) and purged immediately once loaded onto the editor canvas.
- **Vector Annotation Layer (`editor.html`)**: Non-destructive `annotations[]` object list rendered at 60 FPS over the base bitmap:
  - **Vector Arrow** (default `#FF3B30`, thickness `2/4/8 px`, draggable endpoint handles `(x1, y1)` and `(x2, y2)` after drawing),
  - **2-in-1 Underline & Highlighter** (`Shift` locks horizontal axis `y2 = y1`; Highlighter uses `ctx.globalAlpha = 0.35`),
  - **Text Callout** (in-canvas `<textarea>` input, contrasting background pill mode or white/contrasting stroke outline via `ctx.strokeText`),
  - **Undo (`Ctrl+Z` / `Cmd+Z`) & Delete (`Delete` / `Backspace`)**,
  - **1-Click Export**: Flatten bitmap + vectors on export to **Download PNG** (`<domain>_YYYY-MM-DD_HH-mm.png`) or **Copy to Clipboard** (`navigator.clipboard.write` with `ClipboardItem({ 'image/png': blob })`).
- **100% Local & Offline Privacy**: Zero backend servers, zero accounts, zero telemetry, zero CDN font/icon requests.

---

## 3. Recommended stack

| Layer | Chosen technology | Why it fits | Notes |
|---|---|---|---|
| **Extension Runtime / Client Platform** | **Chrome Extension Manifest V3** (`chrome.tabs`, `chrome.scripting`, `chrome.contextMenus`, `chrome.commands`, `chrome.storage`, `chrome.action`) | Directly required by the PRD; uses on-demand script injection via `activeTab` + `scripting` to avoid `<all_urls>`. | Compatible with Chrome 114+, Edge, Brave, and Arc. |
| **Frontend (Popup & Editor UI)** | **TypeScript 5.x (Strict Mode) + Vanilla DOM + HTML5 2D `<canvas>` + CSS Custom Properties** | Zero framework overhead (`< 30 KB` total bundle); instant tab open (< 50 ms); full low-level control over HiDPI `<canvas>` backing stores, hit-testing geometry, and `requestAnimationFrame` redraw loops. | Design tokens from `03-Design.md` are implemented in `src/styles/tokens.css` and shared by `popup.html` and `editor.html`. |
| **Storage (Ephemeral Image Transfer)** | **Browser IndexedDB** (`SnapMarkDB`, store `captures`) | Shared across the extension origin (`chrome-extension://<id>/`) between the Background Service Worker and `editor.html`. Stores multi-megabyte raw `Blob` frames without Base64 serialization overhead or 10 MB session quota errors. | Record is deleted immediately after `editor.html` renders the bitmap onto `<canvas>`, plus TTL cleanup (> 15 min) on Service Worker startup. |
| **Storage (User Preferences)** | **`chrome.storage.local`** | Persists lightweight user settings (`highlightSelectionBeforeCapture`, `selectionPaddingPx`, `activeTool`, `activeColor`, `strokeWidth`, `textStyleMode`) across browser restarts. | Wrapped in a typed helper `src/shared/settings.ts` with schema defaults. |
| **Async / Background Jobs** | **MV3 Background Service Worker (`src/background/index.ts`)** | Orchestrates context menu triggers, keyboard commands, on-demand content script injection, rate-limited `captureVisibleTab()` calls (>= 550 ms interval + retry backoff), and IndexedDB session creation. | Uses event-driven state and `chrome.action.setBadgeText` for scroll progress when the popup is closed. |
| **Build & Packaging Tooling** | **Node.js 20+ & Vite 5.x** (multi-entry Rollup build for `popup.html`, `editor.html`, `background.js`, and self-contained `capture-injected.js`) | Compiles TypeScript, bundles modular shared utilities into clean MV3 entry points in `dist/`, copies `manifest.json` and static PNG icons, and packages a Chrome Web Store `.zip`. | Zero external runtime dependencies in `dependencies` — all tooling lives in `devDependencies`. |
| **Testing** | **Vitest** (Unit & Integration with `fake-indexeddb` + Canvas mock) + **Playwright (`@playwright/test`)** (Chromium Extension E2E) | Vitest verifies DPI crop math, filename generation, vector hit-testing, rate-limit throttling, and IndexedDB cleanup in milliseconds; Playwright launches a real Chromium instance with `--load-extension=./dist` to test the actual popup, editor canvas, and context flows. | Runs headless in CI and locally via `npm test` and `npm run test:e2e`. |
| **CI/CD** | **GitHub Actions** (`.github/workflows/ci.yml`) | Runs typecheck (`tsc --noEmit`), linter, unit tests, production build (`npm run build`), and Playwright extension verification on every push/PR. | Produces a downloadable `snapmark-extension.zip` build artifact. |

*(Note: Backend, Database, Authentication, Search, and Cloud Analytics layers are intentionally omitted because SnapMark is a 100% local-first, zero-server browser extension).*

---

## 4. Recommended architecture

### 4.1 Main Modules

1. **`src/background/` (MV3 Service Worker)**:
   - Registers the 3 `chrome.contextMenus` items (`capture-selection`, `capture-image`, `capture-viewport`) on `chrome.runtime.onInstalled`.
   - Listens to `chrome.contextMenus.onClicked`, `chrome.commands.onCommand`, and runtime messages from `popup.html`.
   - Injects `capture-injected.js` into the active tab via `chrome.scripting.executeScript({ target: { tabId } })`.
   - Executes rate-limited `chrome.tabs.captureVisibleTab(windowId, { format: 'png' })` calls wrapped in a `CaptureRateLimiter` (enforcing `>= 550 ms` between calls plus automatic retry with `600 ms` exponential backoff if Chrome throws a quota error).
   - Writes `CaptureSession` records containing raw `Blob` frames and CSS crop/stitch coordinates to IndexedDB (`SnapMarkDB`) and opens `chrome.tabs.create({ url: 'editor.html?captureId=<id>' })`.
2. **`src/content/` (On-Demand Injected Script — `capture-injected.ts`)**:
   - Injected only when a capture is triggered (no persistent `content_scripts` in `manifest.json`).
   - Records the last right-clicked `<img>` element or resolves it via `srcUrl` / `currentSrc` and `document.querySelectorAll('img')`.
   - Measures `Range.getBoundingClientRect()` (with `20px` CSS padding clamped to `window.innerWidth` / `window.innerHeight`) or `img.getBoundingClientRect()`, alongside `window.devicePixelRatio`.
   - Handles temporary yellow selection highlighting (`[data-snapmark-highlight]` overlay divs with `background: rgba(255, 235, 59, 0.45)`) and guaranteed restoration in a `finally` block.
   - Drives the full-page scroll state machine: measures total scroll height, hides scrollbars, scrolls to `(0, 0)` for Frame #1, hides all `getComputedStyle(el).position === 'fixed' | 'sticky'` elements before Frame #2, steps by `window.innerHeight`, and restores all DOM styles and original `(scrollX, scrollY)` upon completion or cancellation.
3. **`src/popup/` (Extension Action Popup — `popup.html` & `popup.ts`)**:
   - Queries active tab status (detects restricted `chrome://` / Web Store URLs and checks whether text is currently selected on the active tab).
   - Renders the 3 capture mode cards, keyboard shortcut badges, and the `highlightSelectionBeforeCapture` toggle switch.
   - Displays the live full-page scroll progress bar (`Klatka k z N`) and Cancel button (`Esc`).
4. **`src/editor/` (Vector Annotation Editor — `editor.html` & `editor.ts`)**:
   - **Bitmap Stage Loader (`canvas-stage.ts`)**: Reads `CaptureSession` from IndexedDB by `captureId`, crops (for `selection` / `image` modes using `coord * dpr`) or stitches (for `fullpage` mode across `frames[]` respecting `MAX_CANVAS_HEIGHT`) onto an offscreen source bitmap canvas, deletes the IndexedDB record immediately, and sizes `#editor-canvas` to physical pixels (`width = cssWidth * dpr`) with CSS display dimensions (`style.width = cssWidth + 'px'`).
   - **Vector Engine (`vector-engine.ts`)**: Maintains `annotations: AnnotationItem[]`, `historyStack: AnnotationItem[][]`, and `selectedAnnotationId`. Renders the base bitmap followed by all vector items (`arrow`, `line` with `underline`/`highlighter` subtypes, `text` with `background`/`outline`/`plain` modes) and selection handles (`(x1, y1)`, `(x2, y2)`) inside a 60 FPS `requestAnimationFrame` pipeline.
   - **Hit-Testing & Interaction Controller (`interaction.ts`)**: Performs point-to-endpoint, point-to-segment, and point-in-rect hit-testing; manages `Shift`-axis locking (`y2 = y1`) for underlines/highlighters; spawns the floating `<textarea>` for text entry/editing; handles `Ctrl+Z` / `Cmd+Z` undo and `Delete` / `Backspace`.
   - **Exporter (`exporter.ts`)**: Flattens the base bitmap and vector layer onto a clean export canvas (without selection handles), generates `Blob('image/png')`, writes to `navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])`, or triggers download with filename `<normalized-domain>_YYYY-MM-DD_HH-mm.png`.
5. **`src/shared/` (Shared Contracts & Utilities)**:
   - `types.ts`: Shared TypeScript interfaces (`CaptureSession`, `AnnotationItem`, `UserSettings`, message payloads).
   - `db.ts`: Promise-based IndexedDB wrapper (`saveCaptureSession`, `getCaptureSession`, `deleteCaptureSession`, `cleanupStaleCaptures`).
   - `dpi.ts`: Pure functions for converting CSS bounding rects + safety padding into clamped physical pixel crop rectangles (`multiplyRectByDpr`, `clampRectToViewport`).
   - `filename.ts`: Pure formatter producing `domena-pl_2026-11-21_14-10.png` from any URL and `Date`.

### 4.2 Data Flow

```text
[User Trigger: Context Menu / Popup / Shortcut]
       │
       ▼
[Background Service Worker (background.ts)]
       ├─► (If selection / image / fullpage) ──► chrome.scripting.executeScript(capture-injected.js)
       │                                              │
       │   ◄── Returns DOM Rect (CSS px), dpr, ───────┘
       │       or steps scrollTo(0, nextY) + hides fixed/sticky after Frame #1
       │
       ├─► Calls chrome.tabs.captureVisibleTab({ format: 'png' })
       │   (Throttled >= 550ms per frame in fullpage mode)
       │
       ├─► Converts DataURL -> Blob & saves CaptureSession to IndexedDB (SnapMarkDB.captures)
       │
       └─► Opens chrome.tabs.create({ url: 'editor.html?captureId=cap_...' })
                      │
                      ▼
       [Vector Editor (editor.ts)]
                      ├─► Reads CaptureSession from IndexedDB & IMMEDIATELY deletes record
                      ├─► Crops (selection/image * dpr) or Stitches (fullpage frames) onto Base Bitmap
                      ├─► Interactive Loop: User draws/moves Arrows, Underlines/Highlighters, Text
                      │   (Stored in annotations[] vector array; Undo via historyStack[])
                      └─► On Export ("Kopiuj do schowka" / "Pobierz PNG"):
                          Flattens Base Bitmap + annotations[] -> PNG Blob -> Clipboard / File Download
```

### 4.3 Security & Privacy Considerations

- **Least-Privilege Permissions**: `manifest.json` requests only `["activeTab", "contextMenus", "downloads", "scripting", "storage"]`. No `<all_urls>` host permission is ever declared. `"downloads"` grants no page access: it is used exclusively to read the state of downloads the editor itself starts.
- **Guaranteed Ephemeral Cleanup**: Temporary DOM highlights (`[data-snapmark-highlight]`) and temporary `visibility: hidden` overrides on `fixed`/`sticky` elements are always wrapped in `try / finally` blocks so the user's webpage is never left in a mutated state.
- **Immediate Storage Purge**: IndexedDB capture records are deleted as soon as `editor.html` decodes the image into canvas memory, plus a startup sweep removes any orphaned records older than 15 minutes.
- **Strict CSP**: `script-src 'self'; object-src 'self';` with zero external scripts, fonts, or telemetry endpoints.

---

## M07 download lifecycle — `editor-capture-improvements`

The editor closes only on confirmed successful completion of its own PNG download; failure or cancellation leaves it open. Blob creation or an anchor click alone is not completion. Existing clipboard paste remains supported.

**Resolved mechanism (M07):** the editor starts the export through `chrome.downloads.download()` and monitors `chrome.downloads.onChanged` for the `state` transition of that specific download id. `complete` closes the editor tab; `interrupted`, a cancellation or a failed `download()` call leaves the editor open with its annotations and an error message. This is why `"downloads"` is in the production permission list, and the permission tests assert the exact list. If the canvas changes while a download is in flight, or a drawing gesture is active, the editor does not close and asks the user to export again.

## 5. Key technical decisions

### Decision 1: Vanilla TypeScript + Native HTML5 2D Canvas instead of React + Fabric.js/Konva
- **Decision**: Build `popup.html` and `editor.html` using strict TypeScript, native DOM APIs, and a custom ~250-line HTML5 2D `<canvas>` vector renderer.
- **Rationale**: The editor intentionally has only 3 drawing primitives (Arrow with 2 draggable endpoints, Line/Highlighter with `Shift` horizontal lock and `globalAlpha = 0.35`, and Text with pill background or `strokeText` outline). Implementing these directly on native `CanvasRenderingContext2D` gives 100% control over physical Retina DPI scaling (`ctx.scale(dpr, dpr)`), keeps the entire extension under 30 KB, and opens the editor tab instantaneously.
- **Tradeoffs**: If SnapMark ever expanded into a full graphic design suite with hundreds of freeform bezier paths and group transforms, a scene-graph library would become helpful; for SnapMark's 4-tool scope, native 2D canvas is simpler, faster, and bug-free.

### Decision 2: IndexedDB (`SnapMarkDB`) for Transferring Raw `Blob` Captures to `editor.html`
- **Decision**: Store captured frame `Blob` objects in the extension origin's IndexedDB and pass only `?captureId=cap_<uuid>` in the `editor.html` URL.
- **Rationale**: Full-page scroll captures on 4K/Retina displays can produce 15–40 MB of uncompressed PNG frame data. Passing Base64 strings via URL parameters or `chrome.runtime.sendMessage` hits serialization bottlenecks and memory spikes, and `chrome.storage.session` is capped at 10 MB total. IndexedDB stores native binary `Blob` objects asynchronously without Base64 inflation and is accessible from both the Service Worker and `editor.html`.
- **Tradeoffs**: Requires a small asynchronous IndexedDB helper (`src/shared/db.ts`) and a garbage-collection sweep for tabs closed before loading completes.

### Decision 3: Cropping and Stitching Inside `editor.html` (with Offscreen/Canvas 2D)
- **Decision**: Have the Background Service Worker store the raw captured frame `Blob`(s) and CSS crop/scroll geometry in IndexedDB, and perform the final pixel-exact cropping or multi-frame stitching on the `<canvas>` inside `editor.html` during initial load.
- **Rationale**: In Manifest V3, Service Workers do not have access to DOM `HTMLCanvasElement` or `Image`, and large `OffscreenCanvas` allocations inside a short-lived Service Worker can increase memory pressure during a multi-frame scroll loop. Performing the final stitch/crop in `editor.html` uses standard, rock-solid `createImageBitmap(blob)` + `CanvasRenderingContext2D.drawImage()` and immediately hands the resulting canvas to the vector annotation stage.
- **Tradeoffs**: `editor.html` takes ~30–80 ms on initial open to stitch multi-frame scroll captures, which is imperceptible to the user.

### Decision 4: Two-Stage Right-Click `<img>` Resolution Without Persistent Content Scripts
- **Decision**: Resolve the clicked `<img>` element in `capture-injected.ts` using `info.srcUrl` matched against visible `<img>` elements (`img.currentSrc === info.srcUrl || img.src === info.srcUrl`) ranked by viewport visibility and proximity, supplemented by checking `document.activeElement` / hover state (`img:hover`).
- **Rationale**: Because we intentionally avoid `<all_urls>` and persistent content scripts that run on every page load, our script is injected *after* the user clicks *"Edytuj i pobierz obrazek"* in the native context menu. Matching `info.srcUrl` combined with `img:hover` and visible bounding rect dimensions reliably locates the target `<img>` while preserving a zero-permission-warning install experience.
- **Tradeoffs**: If a page contains two identical visible `<img>` tags with the exact same `srcUrl` and the user moves the mouse rapidly after clicking the context menu before `:hover` is evaluated, it defaults to the first visible matching image in the viewport.

---

## 6. Alternatives considered

| Alternative | Why it was not chosen as default |
|---|---|
| **React 18 + TailwindCSS + Fabric.js** | Adds ~200+ KB of JavaScript runtime to a 4-button toolbar and a 320px popup, slows down tab initialization, and complicates HiDPI Retina coordinate mapping between Fabric's virtual viewport and physical screenshot pixels. |
| **`chrome.storage.session` or `chrome.storage.local` for image transfer** | `chrome.storage.session` has a hard 10 MB quota across the entire extension and does not natively serialize `Blob` instances without converting to Base64 or `ArrayBuffer` arrays, which would fail on long Retina full-page captures. |
| **Persistent `content_scripts` with `"matches": ["<all_urls>"]`** | Triggers Chrome Web Store's scary *"Read and change all your data on all websites"* permission warning and slows down review. Using `activeTab` + `scripting` on demand achieves all 4 capture modes with zero scary permission prompts. |

---

## 7. Risks and constraints

1. **Chrome `MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND` Quota (2 calls/sec)**:
   - *Constraint*: Calling `captureVisibleTab` faster than twice per second throws a runtime error.
   - *Mitigation*: Enforce a strict `550 ms` minimum interval between frames in `CaptureRateLimiter` plus up to 3 automatic retries with `600 ms` backoff.
2. **Browser Maximum `<canvas>` Height Limits on Retina Displays**:
   - *Constraint*: Chromium enforces maximum canvas backing-store dimensions (typically `32,767 px` per axis or total pixel area limits).
   - *Mitigation*: Cap stitched physical height at `MAX_CANVAS_HEIGHT = 16384` (or `24000` physical pixels), stop the scroll loop cleanly when reached, and show the non-blocking warning banner specified in `04-Interface-spec.md`.
3. **Pages with Internal Scroll Containers (`overflow-y: auto` SPA shells)**:
   - *Constraint*: Standard `window.scrollTo` only scrolls the document root.
   - *Mitigation*: In v1, scroll the document root (`document.scrollingElement || document.documentElement`) and detect if `scrollY` failed to advance after step #1 so the loop finishes cleanly in 1 frame rather than repeating identical frames.
4. **Restricted Browser URLs (`chrome://`, `edge://`, `about:`, Chrome Web Store)**:
   - *Constraint*: Chrome blocks `captureVisibleTab` and `scripting.executeScript` on internal browser pages.
   - *Mitigation*: Validate tab URL scheme before injection and display the dedicated restricted-page danger banner in `popup.html`.

---

## 8. Suggested project structure

The product lives directly in the repository root alongside `.agents/`, `.claude/`, and `.speccraft/` (which remain untouched by product code and build output).

- **Working directory for all commands (`npm install`, `npm run dev`, `npm test`, `npm run build`, `npm run test:e2e`)**: Repository root (`/Users/pawellandingi/Documents/projects/SnapMark`).
- **Build output directory (Unpacked Chrome Extension root)**: `dist/` in the repository root.
- **Scaffolding in a non-empty repository root**: Create `package.json`, `tsconfig.json`, `vite.config.ts`, and `src/` directly (or initialize with `npm init -y`) rather than running destructive `npm create` generators that overwrite `.gitignore` or fail on existing `.speccraft/` / `.agents/` directories. Append `node_modules/`, `dist/`, `coverage/`, `playwright-report/`, and `test-results/` to `.gitignore`.

```text
SnapMark/
├── .agents/                          # SpecCraft skills (untouched)
├── .claude/                          # Claude symlink (untouched)
├── .speccraft/                       # SpecCraft docs, milestones, viewer (untouched)
├── .github/
│   └── workflows/
│       └── ci.yml                    # Typecheck, Vitest, Build, Playwright E2E
├── public/
│   ├── manifest.json                 # Chrome Extension Manifest V3 definition
│   └── icons/
│       ├── icon-16.png
│       ├── icon-32.png
│       ├── icon-48.png
│       └── icon-128.png
├── src/
│   ├── styles/
│   │   ├── tokens.css                # CSS Custom Properties from 03-Design.md
│   │   ├── popup.css                 # Styles for popup.html (320px dark launcher)
│   │   └── editor.css                # Styles for editor.html (56px top bar + stage)
│   ├── shared/
│   │   ├── types.ts                  # CaptureSession, AnnotationItem, Message types
│   │   ├── constants.ts              # Colors (#FF3B30), padding (20px), throttle (550ms)
│   │   ├── db.ts                     # IndexedDB (SnapMarkDB) Blob session storage
│   │   ├── settings.ts               # chrome.storage.local typed preferences wrapper
│   │   ├── dpi.ts                    # devicePixelRatio crop/clamp/stitch math
│   │   ├── filename.ts               # <domain>_YYYY-MM-DD_HH-mm.png generator
│   │   └── url-guard.ts              # Restricted URL detector (chrome://, Web Store)
│   ├── background/
│   │   ├── index.ts                  # MV3 Service Worker entry (menus, commands, messages)
│   │   ├── rate-limiter.ts           # >= 550ms captureVisibleTab scheduler + retry
│   │   └── capture-orchestrator.ts   # Coordinates 4 capture modes & opens editor.html
│   ├── content/
│   │   └── capture-injected.ts       # On-demand DOM helper (selection, img rect, scroll loop, fixed/sticky hiding, yellow highlight)
│   ├── popup/
│   │   └── index.ts                  # Popup controller (triggers, selection detection, progress bar, highlight switch)
│   └── editor/
│       ├── index.ts                  # Editor bootstrap, toolbar bindings, shortcuts
│       ├── canvas-stage.ts           # Loads Blob(s) from IndexedDB, crops/stitches at physical DPI, purges DB record
│       ├── vector-engine.ts          # Renders base bitmap + annotations[] (Arrow, Line/Highlighter, Text) + handles
│       ├── interaction.ts            # Mouse/keyboard hit-testing, endpoint dragging, Shift-axis lock, floating <textarea>
│       ├── history.ts                # Immutable undo stack (Ctrl+Z / Cmd+Z) & delete selected
│       └── exporter.ts               # Flattens bitmap + vectors -> Download PNG & Copy to Clipboard
├── tests/
│   ├── unit/
│   │   ├── dpi.test.ts               # Tests Retina DPR scaling & 20px safety padding
│   │   ├── filename.test.ts          # Tests domena-pl_YYYY-MM-DD_HH-mm.png formatting
│   │   ├── db.test.ts                # Tests IndexedDB Blob save, read & immediate purge
│   │   ├── rate-limiter.test.ts      # Tests >= 550ms spacing & retry backoff
│   │   └── vector-engine.test.ts     # Tests arrow/line/text geometry, hit-testing & Shift lock
│   └── e2e/
│       └── extension.spec.ts         # Playwright Chromium test loading ./dist extension
├── popup.html                        # Extension popup HTML entry point
├── editor.html                       # Vector annotation editor HTML entry point
├── package.json                      # Scripts: dev, build, test, test:e2e, typecheck
├── tsconfig.json                     # Strict TypeScript config with @types/chrome
├── vite.config.ts                    # Multi-entry build outputting unpacked extension to dist/
├── vitest.config.ts                  # Unit test runner configuration
├── playwright.config.ts              # E2E Chromium extension runner configuration
├── AGENTS.md                         # Shared agent instructions
└── CLAUDE.md
```

---

## 9. Delivery recommendation

1. **Must-Have Foundations (Phase 1 — Extension Shell, Design System & Core Utilities)**:
   - Project setup (`package.json`, TypeScript, Vite multi-entry build producing loadable `dist/manifest.json` with `activeTab`, `contextMenus`, `scripting`, `storage`).
   - Design system tokens (`src/styles/tokens.css`), UI shell for `popup.html` and `editor.html`, IndexedDB `Blob` transfer store (`src/shared/db.ts`), DPI math (`src/shared/dpi.ts`), and auto-filename generator (`src/shared/filename.ts`).
2. **Core Capture Modes (Phase 2 — 4 Contextual Capture Modes)**:
   - Visible Viewport capture (`Alt+Shift+V`, popup card, page context menu).
   - Text Selection capture (`Range.getBoundingClientRect()` + `20px` safety margin + `devicePixelRatio` crop + optional temporary yellow highlight).
   - Image Element capture (`contexts: ["image"]` right-click `<img>` crop from `captureVisibleTab`).
   - Full-Page Scroll capture (`window.scrollTo` loop, `>= 550 ms` throttling, hiding `fixed`/`sticky` elements after Frame #1, live progress bar/badge, multi-frame stitching).
3. **Vector Annotation Editor & Export (Phase 3 — Vector Tools, History & Export)**:
   - Interactive vector layer (`annotations[]`) with **Strzałka** (color, thickness, post-draw endpoint handle dragging), **Podkreślenie i zakreślacz** (`Shift` horizontal lock + `globalAlpha = 0.35`), and **Tekst** (contrasting background pill or white stroke outline).
   - Full `Ctrl+Z` / `Cmd+Z` undo stack, `Delete` selected object, **Pobierz PNG**, and **Kopiuj do schowka** (`✓ Skopiowano!`), plus fallback `Ctrl+V` paste in the editor empty state.
4. **Things to Postpone to v2**:
   - Blur/pixelate redaction tool, numbered step counters, internal `overflow-y: scroll` nested SPA container scrolling, and PDF export.

---

## 10. Assumptions and open questions

### Assumptions
- **Target Browser Baseline**: Chromium 114+ (supports Manifest V3 Service Workers, `OffscreenCanvas`, `createImageBitmap`, and `navigator.clipboard.write` with `image/png`).
- **Build Artifact Format**: Running `npm run build` outputs a complete, ready-to-load unpacked extension in `dist/` (which can be loaded directly via `chrome://extensions` → *Load unpacked* and tested automatically by Playwright).
- **Default Shortcut Bindings**: `manifest.json` defines `Alt+Shift+V` (Viewport), `Alt+Shift+F` (Full-Page Scroll), and `Alt+Shift+S` (Text Selection), while users can customize them at `chrome://extensions/shortcuts`.

### Open questions
- None blocking v1 implementation — all 4 capture modes, vector editor tools, Manifest V3 permissions, DPI scaling formulas, rate-limiting thresholds, and IndexedDB storage patterns are fully specified across `01-Idea.md` through `05-Tech-Stack.md`.
