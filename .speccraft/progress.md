# Progress: SnapMark

## Project state
- **Commands:** (working directory: repository root)
  - install: `npm install`
  - dev: `npm run dev`
  - typecheck: `npm run typecheck` (`tsc --noEmit`)
  - test: `npm test` (`vitest run`)
  - test:e2e: `npm run test:e2e` (`node scripts/run-e2e.mjs`)
  - build: `npm run build` (`tsc --noEmit && vite build`)
  - package: `npm run package` (`npm run build && node scripts/package-extension.mjs`)
- **Structure:**
  - `public/manifest.json` — Chrome Extension Manifest V3 declaration
  - `popup.html`, `editor.html` — HTML entry points
  - `src/styles/` — `tokens.css`, `popup.css`, `editor.css`
  - `src/popup/index.ts` — popup controller
  - `src/editor/index.ts` — vector annotation editor controller
  - `tests/unit/` — Vitest unit tests (JSDOM environment)
- **Key modules and helpers:**
  - `src/styles/tokens.css` — Dark Studio Utility CSS custom properties and shared UI component primitives (`.btn-primary`, `.btn-secondary`, `.btn-danger-ghost`, `.toolbar-tool-btn`, `.popup-action-card`, `.kbd-badge`, `.segmented-control`, `.color-swatch-tray`, `.toggle-switch`, `.status-banner`).
  - `src/shared/types.ts` & `src/shared/constants.ts` — Shared contracts (`CaptureSession`, `AnnotationItem`, `UserSettings`, `ANNOTATION_COLORS`, `STROKE_WIDTHS`, `DEFAULT_USER_SETTINGS`).
  - `src/shared/mock-captures.ts` — Prototype URL state parsers (`parsePopupStateFromSearch`, `parseEditorStateFromSearch`), mock HiDPI metadata (`getMockCaptureMetadata`), sample vector objects (`getInitialMockAnnotations`), and 2D backdrop drawer (`renderMockScreenshotBackdrop`).
  - `src/popup/index.ts` — `renderPopup()` controller for `popup.html` (all 4 states: `default`, `no-selection`, `progress`, `restricted`).
  - `src/editor/index.ts` & `src/editor/canvas-stage.ts` — `initEditor()` 56px 4-cluster toolbar controller and `renderCanvasStage()` HiDPI Retina `<canvas>` renderer + `buildSessionCompositePlacements()`.
  - `src/editor/vector-engine.ts`, `src/editor/history.ts`, `src/editor/text-overlay.ts` & `src/editor/exporter.ts` — Vector hit-testing (`hitTestEndpointHandle`, `hitTestAnnotationBody`), `Shift` horizontal lock (`applyShiftHorizontalLock`), immutable `UndoHistoryStack`, inline `<textarea>` overlay (`renderTextOverlayLayer`), and flattened HiDPI PNG / `ClipboardItem` exporter (`createFlattenedExportCanvas`, `exportFlattenedPngDownload`, `exportFlattenedToClipboard`).
  - `src/shared/dpi.ts`, `src/shared/filename.ts`, `src/shared/url-guard.ts` — DPR scaling & 20px viewport clamping (`clampRectWithPaddingToViewport`, `multiplyRectByDpr`, `computePhysicalCropRect`), `<domain>_YYYY-MM-DD_HH-mm.png` formatter (`formatCaptureFilename`), and restricted URL detector (`isRestrictedBrowserUrl`).
  - `src/shared/settings.ts` — Typed `chrome.storage.local` settings manager (`loadUserSettings`, `saveUserSettings`, `updateUserSettings`, `sanitizeUserSettings`).
  - `src/shared/db.ts` — IndexedDB (`SnapMarkDB.captures`) `Blob` session store (`saveCaptureSession`, `getCaptureSession`, `consumeCaptureSession` immediate purge, `cleanupStaleCaptures` 15-min TTL).
  - `src/background/rate-limiter.ts` & `src/background/capture-orchestrator.ts` — `CaptureRateLimiter` (`>= 550 ms` + `600 ms` retry backoff), context menu setup (`registerContextMenus`), `dataUrlToBlob`, `captureVisibleViewport`, `captureTextSelection`, `captureImageElement`, `captureFullPageScroll`, and `cancelActiveScrollCapture`.
  - `src/content/capture-injected.ts` — Self-contained on-demand DOM helpers injected via `chrome.scripting.executeScript`: `measureSelectionInDom`, `cleanupSelectionHighlightInDom`, `measureTargetImageInDom`, `computeFullPageFrameOffsets`, `prepareFullPageScrollInDom`, `hideFixedAndStickyElementsInDom`, `stepFullPageScrollInDom`, and `restoreFullPageScrollInDom`.
- **Conventions:**
  - Zero runtime dependencies (`dependencies` omitted); strict TypeScript (`strict: true`, `noUnusedLocals: true`).
  - Zero external network calls (no Google Fonts or remote icon CDNs).
  - Manifest V3 permissions restricted to `["activeTab", "contextMenus", "scripting", "storage"]`.
- **Environment:** Node.js 20+, npm, local browser / JSDOM for unit tests.
- **Parallel isolation:** not set up
- **Git:** base branch `main`, no active milestone branch

## Milestones
- [M01] `[x]` accepted (2026-11-21) — Look & feel and clickable prototype (6/6 tasks done)
- [M02] `[x]` accepted (2026-11-21) — Foundations: Manifest V3, IndexedDB transfer and Viewport capture (7/7 tasks done)
- [M03] `[x]` accepted (2026-11-21) — Core features: Contextual DOM captures (Selection, Image, Full-Page Scroll) (5/5 tasks done)
- [M04] `[x]` accepted (2026-11-21) — Complete features: Vector annotation editor, undo history and export (4/4 tasks done)
- [M05] `[x]` accepted (2026-11-21) — Quality and release: Playwright E2E tests, edge-case hardening and Web Store package (3/3 tasks done)
- [M06] `[x]` accepted — Feature: Interactive screen area selection overlay (Zaznacz fragment ekranu) (3/3 tasks done)

## Decisions and deviations
- none

## Open assumptions to review
- none

## Blocked
- [032] Tab to toolbar leaves undo/history stale — see task 032 blocker.md

## Log
- [001] [x] 2026-11-21 — Scaffolded TypeScript 5, Vite multi-entry build, Vitest JSDOM test runner, and Manifest V3 baseline.
- [002] [x] 2026-11-21 — Implemented Dark Studio Utility design tokens and shared UI component primitives in `src/styles/tokens.css`.
- [003] [x] 2026-11-21 — Created shared TypeScript domain types, default constants, and mock HiDPI capture fixtures.
- [004] [x] 2026-11-21 — Built clickable 320px extension popup prototype (`popup.html`) with all 4 UI states and unit tests.
- [005] [x] 2026-11-21 — Built 56px 4-cluster top toolbar in `editor.html` with contextual tool properties, keyboard shortcuts, and 2-second clipboard feedback.
- [006] [x] 2026-11-21 — Built HiDPI Retina canvas stage (`src/editor/canvas-stage.ts`), sample vector annotation renderer, `?state=empty` and `?state=max-height-warning` views, and `README.md`.
- [M01] [?] 2026-11-21 — Milestone M01 completed and ready for operator review.
- [M01] [x] 2026-11-21 — Milestone M01 accepted by operator and merged into `main`.
- [007] [x] 2026-11-21 — Implemented DPI crop math (`src/shared/dpi.ts`), filename formatter (`src/shared/filename.ts`), and restricted browser URL guard (`src/shared/url-guard.ts`).
- [008] [x] 2026-11-21 — Implemented persistent user settings wrapper for `chrome.storage.local` (`src/shared/settings.ts`).
- [009] [x] 2026-11-21 — Implemented IndexedDB `Blob` capture session store with immediate purge and 15-minute TTL cleanup (`src/shared/db.ts`).
- [010] [x] 2026-11-21 — Completed Manifest V3 package (`public/manifest.json`), extension icons (`16/32/48/128 px`), and multi-entry Vite build emitting `dist/background.js`.
- [011] [x] 2026-11-21 — Built MV3 Background Service Worker, `CaptureRateLimiter` (`>= 550 ms`), context menus, and end-to-end Visible Viewport Capture.
- [012] [x] 2026-11-21 — Connected `popup.html` to live `chrome.tabs.query`, `chrome.storage.local` settings, and `chrome.runtime.sendMessage` Viewport trigger.
- [013] [x] 2026-11-21 — Connected `editor.html` to IndexedDB `Blob` consumption (`consumeCaptureSession`) with immediate purge, settings persistence, and clipboard/file input.
- [M02] [?] 2026-11-21 — Milestone M02 completed and ready for operator review.
- [M02] [x] 2026-11-21 — Milestone M02 accepted by operator and merged into `main`.
- [014] [x] 2026-11-21 — Implemented on-demand DOM text selection measurement (+20 px margin) and temporary yellow highlight in `src/content/capture-injected.ts`.
- [015] [x] 2026-11-21 — Implemented on-demand `<img>` element resolution and bounding box extraction in `src/content/capture-injected.ts`.
- [016] [x] 2026-11-21 — Implemented full-page scroll DOM controller, `MAX_CANVAS_HEIGHT` cap, and `fixed`/`sticky` header suppression in `src/content/capture-injected.ts`.
- [017] [x] 2026-11-21 — Orchestrated Selection, Image, and Full-Page Scroll captures in Background Service Worker with `>= 550 ms` throttling and `finally` DOM cleanup.
- [018] [x] 2026-11-21 — Implemented physical DPI cropping (`cropRectCss * dpr`) and multi-frame scroll stitching (`buildSessionCompositePlacements`) in `src/editor/canvas-stage.ts`, live popup scroll progress/cancel controls, and `README.md` walkthrough.
- [M03] [?] 2026-11-21 — Milestone M03 completed and ready for operator review.
- [M03] [x] 2026-11-21 — Milestone M03 accepted by operator and merged into `main`.
- [019] [x] 2026-11-21 — Implemented vector geometry, endpoint handle hit-testing, `Shift` horizontal lock, and `UndoHistoryStack` (`src/editor/vector-engine.ts`, `src/editor/history.ts`).
- [020] [x] 2026-11-21 — Implemented interactive Arrow and 2-in-1 Line/Highlighter drawing, `Shift` horizontal locking, post-draw endpoint handle dragging, and body moving on `#editor-canvas`.
- [021] [x] 2026-11-21 — Implemented interactive in-canvas `<textarea>` overlay (`src/editor/text-overlay.ts`), `dblclick` editing, dragging, and 3 readability modes (`background`, `outline`, `plain`).
- [022] [x] 2026-11-21 — Implemented flattened HiDPI PNG download and `ClipboardItem` exporter (`src/editor/exporter.ts`) stripping selection handles (`selectedId = null`), and updated `README.md`.
- [M04] [?] 2026-11-21 — Milestone M04 completed and ready for operator review.
- [M04] [x] 2026-11-21 — Milestone M04 accepted by operator and merged into `main`.
- [023] [x] 2026-11-21 — Hardened PRD §7 edge cases (empty selection `'!'` warning badge, inner-container scroll termination) and added `tests/unit/security-privacy-audit.test.ts`.
- [024] [x] 2026-11-21 — Implemented end-to-end extension verification suite (`npm run test:e2e`, `tests/e2e/extension.spec.ts`, `playwright.config.ts`, `scripts/run-e2e.mjs`).
- [025] [x] 2026-11-21 — Added Chrome Web Store release packager (`npm run package` -> `snapmark-extension.zip`), GitHub Actions CI (`.github/workflows/ci.yml`), and final `README.md`.
- [M05] [?] 2026-11-21 — Milestone M05 completed and ready for operator review.
- [M05] [x] 2026-11-21 — Milestone M05 accepted by operator and merged into `main` (v1 complete).
- [026] [x] 2026-11-21 — Implemented on-demand interactive screen area selection overlay (`selectAreaOverlayInDom` in `src/content/capture-injected.ts`).

- [027] [x] 2026-11-22 — Orchestrated interactive area capture and preserved context-menu text selection.
- [028] [x] 2026-11-22 — Enabled interactive area selection in popup and verified release package.
- [M06] [?] 2026-11-22 — Ready for operator review; manual Chrome walkthrough pending.
- [M06] [x] 2026-11-22 — Accepted by operator and merged into main.

- [029] [x] 2026-11-22 — Stabilized full-page scroll capture; operator waived task-level real-extension verification.
- [030] [x] 2026-11-22 — Simplified editor toolbar, added accessible close and responsive action layout.
- [031] [x] 2026-11-22 — Improved arrowhead rendering, hit testing and click-to-deselect.
- [032] [!] 2026-11-22 — Third review found stale toolbar state after keyboard focus transition.
