# Task 014: Implement on-demand DOM measurement and temporary yellow selection highlight

## 1. Summary
- **Task:** 014 - Implement on-demand DOM measurement and temporary yellow selection highlight - Create src/content/capture-injected.ts with pure, self-contained functions that can run directly inside the target webpage via chrome.scripting.executeScript as specified in 02-General-PRD.md section 4.1 and 04-Interface-spec.md section 6.3. Implement measureSelectionInDom (reading window.getSelection().getRangeAt(0), scrolling partially offscreen ranges into view, measuring Range.getBoundingClientRect(), applying optional temporary [data-snapmark-highlight] yellow overlay divs rgba(255, 235, 59, 0.45) over range.getClientRects() while hiding native selection, and clamping with the 20px safety margin) and cleanupSelectionHighlightInDom (guaranteed removal of [data-snapmark-highlight] and restoration of native selection). The task is done when tests/unit/content-selection.test.ts verifies selection bounding rect extraction, 20px padding clamping, yellow highlight injection, and guaranteed DOM cleanup.
- **Milestone:** M03 - Core features: Contextual DOM captures (Selection, Image, Full-Page Scroll) (type: feature)
- **Type:** `integration`, `ui`
- **Depends on:** 007
- **Parallel:** `exclusive` — creates `src/content/capture-injected.ts` shared across tasks 014, 015, and 016
- **Sources:** `02-General-PRD.md §4.1 "Tryb 1: Zrzut zaznaczonego fragmentu tekstu"`, `02-General-PRD.md §7 "Edge Cases"`, `04-Interface-spec.md §6.3 "Ephemeral DOM Selection Highlight"`

## 2. Goal
Implement the on-demand DOM inspection and highlight helpers for **Tryb 1: Zaznaczony fragment tekstu**. When invoked via `chrome.scripting.executeScript`, it reads the active `Selection` range, centers it if partially outside the viewport, adds the `20 px` CSS safety margin clamped to `0..window.innerWidth` / `0..window.innerHeight`, optionally injects `[data-snapmark-highlight]` yellow overlays (`rgba(255, 235, 59, 0.45)`), and guarantees complete cleanup after the capture completes.

## 3. Scope
**In scope:**
- `src/content/capture-injected.ts`:
  - `SelectionMeasurementResult`: `{ hasSelection: boolean; selectedText: string; cropRectCss: CssRect | null; viewportWidthCss: number; viewportHeightCss: number; dpr: number; highlightApplied: boolean }`
  - `measureSelectionInDom(options?: { paddingPx?: number; applyHighlight?: boolean }): SelectionMeasurementResult`
  - `cleanupSelectionHighlightInDom(): number` removing all `[data-snapmark-highlight]` elements and temporary `<style data-snapmark-selection-style>` rules
- Unit tests in `tests/unit/content-selection.test.ts`

**Out of scope:**
- Image `<img>` measurement — task 015
- Full-page scroll DOM controller — task 016

## 4. Current state and prerequisites
- `CssRect` (`src/shared/types.ts`) and `clampRectWithPaddingToViewport` (`src/shared/dpi.ts`) exist from Milestones M01–M02.

## 5. Implementation steps
1. Create `src/content/capture-injected.ts` implementing self-contained `measureSelectionInDom` and `cleanupSelectionHighlightInDom`.
2. Ensure `measureSelectionInDom` checks `window.getSelection()`, reads `rangeCount > 0`, scrolls the range container into view if top < 0 or bottom > `window.innerHeight`, computes the padded and viewport-clamped `cropRectCss` (default `20px` padding), and when `applyHighlight === true`, creates `[data-snapmark-highlight]` overlay `<div>`s (`background: rgba(255, 235, 59, 0.45); border-radius: 2px; pointer-events: none; position: fixed; z-index: 2147483646;`) for each rect in `range.getClientRects()` plus a `<style data-snapmark-selection-style>::selection { background: transparent !important; }</style>` tag.
3. Implement `cleanupSelectionHighlightInDom()` to remove all `[data-snapmark-highlight]` nodes and `[data-snapmark-selection-style]` tags.
4. Create `tests/unit/content-selection.test.ts` testing empty selection, valid selection with 20px safety margin and viewport edge clamping, optional yellow highlight overlay creation, and cleanup restoration.

## 6. Files

| Path | Action (create / modify) | Purpose |
|---|---|---|
| `src/content/capture-injected.ts` | create | On-demand DOM helper for text selection measurement and temporary yellow highlighting |
| `tests/unit/content-selection.test.ts` | create | Unit tests for selection measurement, 20px margin clamping, and highlight cleanup |

## 7. Contracts and data (if applicable)
- `measureSelectionInDom(options?: { paddingPx?: number; applyHighlight?: boolean }): SelectionMeasurementResult`
- `cleanupSelectionHighlightInDom(): number`

## 8. UI details (if applicable)
- Ephemeral highlight divs use `data-snapmark-highlight="true"` and `background: rgba(255, 235, 59, 0.45)`.

## 9. Acceptance criteria
- [ ] TC-01: `measureSelectionInDom` returns `hasSelection: false` when no text is selected.
- [ ] TC-02: `measureSelectionInDom` adds a `20px` CSS margin around `Range.getBoundingClientRect()` and clamps it within `0..window.innerWidth` and `0..window.innerHeight`.
- [ ] TC-03: When `applyHighlight: true`, `[data-snapmark-highlight]` overlay divs are injected into `document.body`, and `cleanupSelectionHighlightInDom()` removes all of them cleanly.
- [ ] TC-04: `npm run typecheck && npm test` pass.

## 10. Tests to add or update
- `tests/unit/content-selection.test.ts`: Tests empty selection, padded bounding rect calculation, highlight overlay injection, and DOM cleanup.

## 11. Verification
- Run from repository root:
  `npm run typecheck && npm test`

## 12. Risks and notes
- All functions injected via `chrome.scripting.executeScript({ func })` must not rely on external module closures at runtime when executed inside a tab, or must be self-contained.
