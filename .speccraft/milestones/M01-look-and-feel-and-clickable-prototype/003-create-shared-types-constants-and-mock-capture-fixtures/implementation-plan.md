# Task 003: Create shared types, constants and mock capture fixtures

## 1. Summary
- **Task:** 003 - Create shared types, constants and mock capture fixtures - Define the core TypeScript contracts in src/shared/types.ts and src/shared/constants.ts (CaptureSession, AnnotationItem for arrow, line and text, UserSettings, tool defaults and 6-color palette from 02-General-PRD.md section 6.3 and 8). Implement a deterministic mock capture and state fixture module in src/shared/mock-captures.ts that generates a synthetic HiDPI (@2x Retina) sample screenshot canvas with demo vector annotations and parses URL query parameters (?state=default|no-selection|progress|restricted|empty|max-height-warning). The task is done when typed fixtures and URL state parsing helpers are covered by passing unit tests in Vitest.
- **Milestone:** M01 - Look & feel and clickable prototype (type: prototype)
- **Type:** `data`, `prototype`
- **Depends on:** 001
- **Parallel:** `safe` — touches only `src/shared/*` and `tests/unit/mock-captures.test.ts`, isolated from CSS and view files
- **Sources:** `02-General-PRD.md §6.3 "Data Model"`, `02-General-PRD.md §8 "User Settings"`, `04-Interface-spec.md §5.1, §5.2, §5.3, §7`, `03-Design.md Colors`

## 2. Goal
Provide the canonical TypeScript domain types (`CaptureSession`, `AnnotationItem`, `UserSettings`, UI prototype states), default constants (6 annotation colors, stroke widths, default tool/settings), and realistic mock HiDPI screenshot fixtures so `popup.html` and `editor.html` can run as an interactive prototype and demonstrate every UI state via URL query parameters.

## 3. Scope
**In scope:**
- `src/shared/types.ts` defining:
  - `CaptureMode`: `'selection' | 'image' | 'viewport' | 'fullpage'`
  - `EditorTool`: `'arrow' | 'line' | 'text'`
  - `LineSubtype`: `'underline' | 'highlighter'`
  - `TextStyleMode`: `'background' | 'outline' | 'plain'`
  - `StrokeWidth`: `2 | 4 | 8`
  - `AnnotationColor`: `'#FF3B30' | '#FFCC00' | '#34C759' | '#007AFF' | '#FFFFFF' | '#1C1C1E'`
  - `ArrowAnnotation`, `LineAnnotation`, `TextAnnotation`, and union `AnnotationItem` (`PRD §6.3`)
  - `CssRect`, `CaptureFrame`, `CaptureSession` (`PRD §6.3`)
  - `UserSettings` (`PRD §8`)
  - `PopupPrototypeState`: `'default' | 'no-selection' | 'progress' | 'restricted'`
  - `EditorPrototypeState`: `'default' | 'empty' | 'max-height-warning'`
- `src/shared/constants.ts` defining:
  - `ANNOTATION_COLORS` array (6 swatches with Polish labels and hex codes, starting with `#FF3B30`)
  - `STROKE_WIDTHS` (`2`, `4`, `8` with labels `Cienka (2px)`, `Średnia (4px)`, `Gruba (8px)`)
  - `DEFAULT_USER_SETTINGS` (`highlightSelectionBeforeCapture: false`, `selectionPaddingPx: 20`, `activeTool: 'arrow'`, `activeColor: '#FF3B30'`, `strokeWidth: 4`, `textStyleMode: 'background'`)
  - `SCROLL_CAPTURE_THROTTLE_MS = 550`, `HIGHLIGHTER_ALPHA = 0.35`, `MAX_CANVAS_HEIGHT = 16384`
- `src/shared/mock-captures.ts` providing:
  - `parsePopupStateFromSearch(search: string): PopupPrototypeState`
  - `parseEditorStateFromSearch(search: string): { state: EditorPrototypeState; mode: CaptureMode }`
  - `getMockCaptureMetadata(mode: CaptureMode)` returning realistic domain (`domena-pl`), timestamp (`2026-11-21T14:10:00.000Z`), filename (`domena-pl_2026-11-21_14-10.png`), CSS dimensions (e.g., `1280×800` for viewport, `640×220` for selection, `720×480` for image, `1280×2400` for fullpage), and `dpr: 2`
  - `getInitialMockAnnotations(mode: CaptureMode): AnnotationItem[]` returning sample vector items (1 Signal Red arrow `#FF3B30`, 1 semi-transparent yellow highlighter `#FFCC00` with `alpha: 0.35`, 1 text callout)
  - `renderMockScreenshotBackdrop(ctx: CanvasRenderingContext2D, cssWidth: number, cssHeight: number, dpr: number, mode: CaptureMode)` drawing a crisp, realistic mock webpage/article/image onto the canvas at physical Retina resolution
- Unit tests in `tests/unit/mock-captures.test.ts`

**Out of scope:**
- Real IndexedDB persistence (`src/shared/db.ts`) and `chrome.storage.local` bindings — Milestone M02

## 4. Current state and prerequisites
- Task 001 completed (`tsconfig.json`, `vitest.config.ts`).

## 5. Implementation steps
1. Create `src/shared/types.ts` with all interfaces from `02-General-PRD.md §6.3 & §8` and `04-Interface-spec.md §5`.
2. Create `src/shared/constants.ts` with `ANNOTATION_COLORS`, `STROKE_WIDTHS`, `DEFAULT_USER_SETTINGS`, and capture constants.
3. Create `src/shared/mock-captures.ts` implementing query parameter parsers (`parsePopupStateFromSearch`, `parseEditorStateFromSearch`), mock capture metadata per mode, sample vector annotations (`getInitialMockAnnotations`), and a deterministic 2D canvas drawing helper (`renderMockScreenshotBackdrop`).
4. Create `tests/unit/mock-captures.test.ts` testing default settings, color palette order, query parameter parsing (including invalid query fallbacks to `'default'`), mock metadata per capture mode, and initial vector annotations.

## 6. Files

| Path | Action (create / modify) | Purpose |
|---|---|---|
| `src/shared/types.ts` | create | Shared TypeScript interfaces for captures, vector annotations, settings, and UI states |
| `src/shared/constants.ts` | create | Default tool settings, 6-color palette, stroke widths, and rate/canvas constants |
| `src/shared/mock-captures.ts` | create | Prototype fixtures, URL state parsers, and synthetic Retina screenshot generator |
| `tests/unit/mock-captures.test.ts` | create | Unit tests for shared constants, fixtures, and URL state parsers |

## 7. Contracts and data (if applicable)
- `AnnotationItem` discriminated union by `type: 'arrow' | 'line' | 'text'`.
- `UserSettings` matches `02-General-PRD.md §8` table exactly.
- `parsePopupStateFromSearch('?state=progress') === 'progress'`; unknown values fall back to `'default'`.
- `parseEditorStateFromSearch('?state=empty&mode=selection')` returns `{ state: 'empty', mode: 'selection' }`.

## 8. UI details (if applicable)
Not applicable (data contract & fixture layer consumed by tasks 004, 005, 006).

## 9. Acceptance criteria
- [ ] TC-01: `DEFAULT_USER_SETTINGS` sets `activeTool: 'arrow'`, `activeColor: '#FF3B30'`, `strokeWidth: 4`, `selectionPaddingPx: 20`, `highlightSelectionBeforeCapture: false`, `textStyleMode: 'background'`.
- [ ] TC-02: `parsePopupStateFromSearch` recognizes `default`, `no-selection`, `progress`, and `restricted`, defaulting safely to `default`.
- [ ] TC-03: `parseEditorStateFromSearch` recognizes `default`, `empty`, and `max-height-warning` plus capture modes `selection`, `image`, `viewport`, `fullpage`.
- [ ] TC-04: `getInitialMockAnnotations` returns valid `arrow`, `line` (with `alpha: 0.35`), and `text` vector items.
- [ ] TC-05: `npm run typecheck && npm test` pass with exit code `0`.

## 10. Tests to add or update
- `tests/unit/mock-captures.test.ts`: Tests `DEFAULT_USER_SETTINGS`, `ANNOTATION_COLORS`, `parsePopupStateFromSearch`, `parseEditorStateFromSearch`, `getMockCaptureMetadata`, and `getInitialMockAnnotations`.

## 11. Verification
- Run from repository root:
  `npm run typecheck && npm test`

## 12. Risks and notes
- Keep `src/shared/types.ts` and `src/shared/constants.ts` clean of prototype-only DOM logic so Milestones M02–M04 use them directly in production code.
