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
- **Conventions:**
  - Zero runtime dependencies (`dependencies` omitted); strict TypeScript (`strict: true`, `noUnusedLocals: true`).
  - Zero external network calls (no Google Fonts or remote icon CDNs).
  - Manifest V3 permissions restricted to `["activeTab", "contextMenus", "scripting", "storage"]`.
- **Environment:** Node.js 20+, npm, local browser / JSDOM for unit tests.
- **Parallel isolation:** not set up
- **Git:** base branch `main`, active milestone branch `milestone/M01-look-and-feel-and-clickable-prototype`

## Milestones
- [M01] `[>]` in progress — Look & feel and clickable prototype (3/6 tasks done)

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
