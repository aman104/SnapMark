# Task 006: Build editor HiDPI canvas stage, sample vector preview and fallback states

## 1. Summary
- **Task:** 006 - Build editor HiDPI canvas stage, sample vector preview and fallback states - Implement the scrollable dark canvas workspace in src/editor/canvas-stage.ts and wire it into editor.html following 04-Interface-spec.md sections 5.2, 5.3, 7.4 and 8. Render the mock Retina screenshot on #editor-canvas with physical pixel backing dimensions (width = cssWidth * dpr), shadow-xl elevation and zero border-radius, overlay sample vector annotations (red arrow with draggable-style endpoint handles, semi-transparent highlighter stroke and outlined text callout) that react to toolbar property changes, and implement both the ?state=empty fallback card (with Wklej ze schowka Ctrl+V and Wczytaj plik buttons) and the ?state=max-height-warning dismissible banner. Document the prototype demo instructions in README.md. The task is done when all editor views and responsive toolbar behaviors (<1100px and >=1100px) work cleanly and npm run typecheck, npm test and npm run build pass.
- **Milestone:** M01 - Look & feel and clickable prototype (type: prototype)
- **Type:** `ui`, `prototype`
- **Depends on:** 001, 002, 003, 004, 005
- **Parallel:** `exclusive` — integrates `src/editor/canvas-stage.ts` into `src/editor/index.ts` and `src/styles/editor.css`, completes all M01 exit criteria, and writes `README.md`
- **Sources:** `04-Interface-spec.md §5.2 "B. Central Canvas Stage"`, `04-Interface-spec.md §5.3 "Screen 3: Editor Empty / Fallback State"`, `04-Interface-spec.md §7.4 "Max Canvas Height Reached"`, `04-Interface-spec.md §8 "HiDPI / Retina & OS Scaling"`, `03-Design.md Elevation & Shapes`

## 2. Goal
Complete the clickable prototype of `editor.html` by adding the scrollable dark studio canvas stage (`src/editor/canvas-stage.ts`) that renders the mock HiDPI (`@2x` Retina) screenshot and sample vector annotations (`arrow` with endpoint handles, `highlighter` with `globalAlpha = 0.35`, `text` with pill background or white stroke outline) reactive to toolbar controls, plus the `?state=empty` fallback card, the `?state=max-height-warning` dismissible warning banner, and full operator demo instructions in `README.md`.

## 3. Scope
**In scope:**
- `src/editor/canvas-stage.ts`:
  - Sizes `<canvas id="editor-canvas">` to physical pixels (`canvas.width = cssWidth * dpr`, `canvas.height = cssHeight * dpr`) and CSS display box (`style.width = cssWidth + 'px'`, `style.height = cssHeight + 'px'`), with `border-radius: 0px` and `--shadow-xl`
  - Renders the mock webpage screenshot (`renderMockScreenshotBackdrop`) and overlays all vector items in `annotations[]`:
    - `arrow`: vector line + proportional filled triangular arrowhead + two endpoint handles `(x1, y1)` and `(x2, y2)` (`radius: 5px`, white fill, `#3B82F6` stroke) when selected
    - `line`: `underline` (`globalAlpha = 1.0`) or `highlighter` (`globalAlpha = 0.35`, `24px` height scaled by `dpr`)
    - `text`: renders text at `20px * dpr` in `background` pill mode, `outline` white/contrasting stroke halo mode (`ctx.strokeText` + `ctx.fillText`), or `plain` mode
  - Allows clicking a sample annotation on the canvas (or changing color, stroke width, line subtype, or text readability mode in the toolbar) to immediately update and re-render the selected annotation on `#editor-canvas`, and clicking `#btn-download-png` to trigger a sample PNG download with the auto-generated filename `domena-pl_2026-11-21_14-10.png`
- Editor Empty / Fallback State (`?state=empty`, `04-Interface-spec.md §5.3`):
  - Renders `#editor-empty-state` card (`max-width: 440px`) with SnapMark icon, heading **"Brak aktywnego zrzutu na płótnie"**, privacy explanation, primary button `#btn-paste-clipboard` (**"Wklej ze schowka (Ctrl+V)"**), and secondary button `#btn-open-file` (**"Wczytaj plik PNG/JPG..."**) which loads a sample canvas when clicked in prototype mode
- Max Canvas Height Warning Banner (`?state=max-height-warning`, `04-Interface-spec.md §7.4`):
  - Renders `#max-height-banner` (`.status-banner.is-warning`) below the top toolbar: *"Osiągnięto maksymalną bezpieczną wysokość płótna w pełnej rozdzielczości Retina. Zrzut został zapisany do tej wysokości."* with a working dismiss button (`#btn-dismiss-warning`)
- `README.md` with step-by-step operator demo instructions covering `popup.html`, `editor.html`, and all query parameter states
- Unit tests in `tests/unit/editor-stage.test.ts`

**Out of scope:**
- Full freehand drag creation of new vector shapes and IndexedDB `Blob` loading — Milestones M02 and M04

## 4. Current state and prerequisites
- Tasks 001–005 completed (`popup.html` and `editor.html` toolbar working with `tokens.css` and `mock-captures.ts`).

## 5. Implementation steps
1. Update `src/styles/editor.css` with styles for `.editor-stage` (`flex: 1; overflow: auto; padding: 32px;` with 20px radial dot pattern `rgba(255, 255, 255, 0.04)`), `.canvas-wrapper`, `#editor-canvas` (`border-radius: 0px; box-shadow: var(--shadow-xl); display: block;`), `#editor-empty-state` card, and `#max-height-banner`.
2. Create `src/editor/canvas-stage.ts` implementing `renderCanvasStage(canvas: HTMLCanvasElement, metadata: MockCaptureMetadata, annotations: AnnotationItem[], selectedId: string | null)` that scales drawing operations by `metadata.dpr` and renders the base screenshot + vector annotations + selection endpoint handles.
3. Wire `src/editor/canvas-stage.ts` into `src/editor/index.ts`:
   - When `state === 'empty'`, hide `.canvas-wrapper` and show `#editor-empty-state`; clicking `#btn-paste-clipboard` or `#btn-open-file` transitions to the active canvas stage.
   - When `state === 'max-height-warning'`, display `#max-height-banner` above the stage with `#btn-dismiss-warning` hiding the banner.
   - Whenever toolbar properties (`activeColor`, `strokeWidth`, `lineSubtype`, `textStyleMode`), Undo (`Ctrl+Z`), or Delete (`Delete`/`#btn-delete-selected`) fire, update the active/selected annotation in `annotations[]` (pushing previous state to `historyStack[]`) and re-render `#editor-canvas`.
4. Write `README.md` documenting how to run `npm install && npm run dev` and inspect all prototype views and URL states from M01's Demo section.
5. Add unit tests in `tests/unit/editor-stage.test.ts` verifying HiDPI physical vs CSS canvas sizing (`width = cssWidth * dpr`, `style.width = cssWidth + 'px'`), `border-radius: 0px`, `?state=empty` fallback card, `?state=max-height-warning` banner dismissal, and vector annotation updates via toolbar controls and Undo/Delete.

## 6. Files

| Path | Action (create / modify) | Purpose |
|---|---|---|
| `src/editor/canvas-stage.ts` | create | HiDPI canvas stage renderer for mock screenshot, vector annotations, and endpoint handles |
| `src/editor/index.ts` | modify | Connect toolbar state changes, empty state, and max-height warning banner to canvas stage |
| `src/styles/editor.css` | modify | Stage dot-grid background, canvas shadow-xl, empty state card, and warning banner styles |
| `README.md` | create | Operator demo guide and verification commands for M01 |
| `tests/unit/editor-stage.test.ts` | create | Unit tests for HiDPI canvas dimensions, vector rendering, empty state, and warning banner |

## 7. Contracts and data (if applicable)
- `renderCanvasStage(canvas: HTMLCanvasElement, metadata: MockCaptureMetadata, annotations: AnnotationItem[], selectedId: string | null): void` exported from `src/editor/canvas-stage.ts`.

## 8. UI details (if applicable)
- `#editor-canvas` has `canvas.width = cssWidth * dpr`, `canvas.height = cssHeight * dpr`, `style.width = `${cssWidth}px``, `style.height = `${cssHeight}px``, `border-radius: 0px`, and `box-shadow: var(--shadow-xl)`.
- `.editor-stage` uses background `--color-canvas` (`#0F1115`) with a `20px × 20px` subtle radial dot pattern (`rgba(255, 255, 255, 0.04)`).

## 9. Acceptance criteria
- [ ] TC-01: `#editor-canvas` sets physical pixel attributes (`width = cssWidth * 2`, `height = cssHeight * 2` for `@2x`) while setting CSS dimensions to `cssWidth` and `cssHeight`, with `border-radius: 0px`.
- [ ] TC-02: Changing color, stroke width, line subtype, or text readability mode in the toolbar updates the selected vector annotation on the canvas and records an undoable entry in `historyStack` (reversible via `Ctrl+Z` / `#btn-undo`).
- [ ] TC-03: Opening `editor.html?state=empty` renders `#editor-empty-state` with **"Brak aktywnego zrzutu na płótnie"**, `#btn-paste-clipboard`, and `#btn-open-file`; clicking either button loads the sample capture onto the canvas stage.
- [ ] TC-04: Opening `editor.html?state=max-height-warning` displays `#max-height-banner` below the toolbar, and clicking `#btn-dismiss-warning` removes it.
- [ ] TC-05: `README.md` contains clear instructions for running the M01 demo and testing all URL states.
- [ ] TC-06: `npm run typecheck && npm test && npm run build` pass with exit code `0`.

## 10. Tests to add or update
- `tests/unit/editor-stage.test.ts`: Tests HiDPI canvas physical/CSS sizing across modes (`viewport`, `selection`, `image`, `fullpage`), `?state=empty` card rendering and recovery, `?state=max-height-warning` banner rendering and dismissal, and live annotation modification + undo/delete.

## 11. Verification
- Run from repository root:
  `npm run typecheck && npm test && npm run build`
- Manual check via `npm run dev`:
  - `http://localhost:5173/popup.html` (`?state=default`, `?state=no-selection`, `?state=progress`, `?state=restricted`)
  - `http://localhost:5173/editor.html` (`?state=default`, `?state=empty`, `?state=max-height-warning`)

## 12. Risks and notes
- In JSDOM unit tests, `HTMLCanvasElement.prototype.getContext('2d')` may return `null` unless mocked or guarded; provide a clean fallback/mock context in tests so canvas rendering logic is deterministically verified in Vitest.
