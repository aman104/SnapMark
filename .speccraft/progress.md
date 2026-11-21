# Progress: SnapMark

## Project state
- **Commands:** (working directory: repository root)
  - install: `npm install`
  - dev: `npm run dev`
  - typecheck: `npm run typecheck` (`tsc --noEmit`)
  - test: `npm test` (`vitest run`)
  - build: `npm run build` (`tsc --noEmit && vite build`)
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
  - `src/editor/index.ts` & `src/editor/canvas-stage.ts` — `initEditor()` 56px 4-cluster toolbar controller and `renderCanvasStage()` HiDPI Retina `<canvas>` renderer + `hitTestAnnotations()`.
  - `src/shared/dpi.ts`, `src/shared/filename.ts`, `src/shared/url-guard.ts` — DPR scaling & 20px viewport clamping (`clampRectWithPaddingToViewport`, `multiplyRectByDpr`, `computePhysicalCropRect`), `<domain>_YYYY-MM-DD_HH-mm.png` formatter (`formatCaptureFilename`), and restricted URL detector (`isRestrictedBrowserUrl`).
- **Conventions:**
  - Zero runtime dependencies (`dependencies` omitted); strict TypeScript (`strict: true`, `noUnusedLocals: true`).
  - Zero external network calls (no Google Fonts or remote icon CDNs).
  - Manifest V3 permissions restricted to `["activeTab", "contextMenus", "scripting", "storage"]`.
- **Environment:** Node.js 20+, npm, local browser / JSDOM for unit tests.
- **Parallel isolation:** not set up
- **Git:** base branch `main`, active milestone branch `milestone/M01-look-and-feel-and-clickable-prototype`

## Milestones
- [M01] `[x]` accepted (2026-11-21) — Look & feel and clickable prototype (6/6 tasks done)
- [M02] `[>]` in progress — Foundations: Manifest V3, IndexedDB transfer and Viewport capture (1/7 tasks done)

## Decisions and deviations
- none

## Open assumptions to review
- none

## Blocked
- none

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
