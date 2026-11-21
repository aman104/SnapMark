# Task 016: Implement full-page scroll DOM controller and fixed or sticky header suppression

## 1. Summary
- **Task:** 016 - Implement full-page scroll DOM controller and fixed or sticky header suppression - Extend src/content/capture-injected.ts with the full-page scroll DOM state machine as specified in 02-General-PRD.md section 4.4 and 7. Implement prepareFullPageScrollInDom (saving original scrollX/scrollY, scroll-behavior and overflow styles, hiding scrollbars, scrolling to (0, 0) for Frame #1, and computing total scroll height and viewport dimensions), hideFixedAndStickyElementsInDom (called after Frame #1 to detect all visible elements with getComputedStyle(el).position === 'fixed' or 'sticky' and temporarily set visibility: hidden !important while recording original inline styles), stepFullPageScrollInDom(targetScrollY), and restoreFullPageScrollInDom (restoring all hidden fixed/sticky elements, scrollbar styles, and original scrollX/scrollY in a finally block). The task is done when tests/unit/content-scroll.test.ts verifies Frame #1 header preservation, Frame #2+ fixed/sticky hiding, scroll stepping, and full DOM restoration.
- **Milestone:** M03 - Core features: Contextual DOM captures (Selection, Image, Full-Page Scroll) (type: feature)
- **Type:** `integration`, `ui`
- **Depends on:** 015
- **Parallel:** `exclusive` — extends `src/content/capture-injected.ts`
- **Sources:** `02-General-PRD.md §4.4 "Tryb 4: Zrzut całej strony ze scrollem"`, `02-General-PRD.md §7 "Edge Cases"`

## 2. Goal
Implement the DOM scroll state machine in `src/content/capture-injected.ts` for **Tryb 4: Cała strona ze scrollem**: preparing the document at `(0, 0)` for Frame #1 (so `position: fixed` and `position: sticky` headers appear once at the top of the capture), hiding all `fixed`/`sticky` elements before Frame #2 so they never duplicate on subsequent frames, stepping `window.scrollTo(0, targetY)` cleanly, and guaranteeing full restoration of all DOM styles and original scroll position in `restoreFullPageScrollInDom()`.

## 3. Scope
**In scope:**
- Extending `src/content/capture-injected.ts` with:
  - `FullPageScrollPlan`: `{ originalScrollX: number; originalScrollY: number; totalWidthCss: number; totalHeightCss: number; viewportWidthCss: number; viewportHeightCss: number; dpr: number; frameOffsetsY: number[]; exceededMaxHeight: boolean }`
  - `computeFullPageFrameOffsets(totalHeightCss: number, viewportHeightCss: number, dpr: number, maxPhysicalHeight?: number): { frameOffsetsY: number[]; cappedHeightCss: number; exceededMaxHeight: boolean }`
  - `prepareFullPageScrollInDom(maxPhysicalHeight?: number): FullPageScrollPlan`
  - `hideFixedAndStickyElementsInDom(): number` (marks elements where `getComputedStyle(el).position === 'fixed' || 'sticky'` with `data-snapmark-hidden-fixed="true"`, saves their original `style.getPropertyValue('visibility')` and priority in `data-snapmark-orig-visibility` / `data-snapmark-orig-visibility-priority`, and sets `el.style.setProperty('visibility', 'hidden', 'important')`)
  - `stepFullPageScrollInDom(targetScrollY: number): { actualScrollY: number; viewportWidthCss: number; viewportHeightCss: number }`
  - `restoreFullPageScrollInDom(originalScrollX?: number, originalScrollY?: number): void`
- Unit tests in `tests/unit/content-scroll.test.ts`

**Out of scope:**
- Multi-frame `captureVisibleTab` loop in Background Service Worker — task 017

## 4. Current state and prerequisites
- Tasks 014 and 015 (`src/content/capture-injected.ts`) completed.

## 5. Implementation steps
1. Implement `computeFullPageFrameOffsets` in `src/content/capture-injected.ts` calculating the exact `scrollY` stops from `0` to `cappedHeightCss - viewportHeightCss` and flagging `exceededMaxHeight` when `totalHeightCss * dpr > MAX_CANVAS_HEIGHT` (`16384px` physical).
2. Implement `prepareFullPageScrollInDom`, saving original `(window.scrollX, window.scrollY)` and root `<style data-snapmark-scroll-style>` hiding scrollbars (`scrollbar-width: none !important; scroll-behavior: auto !important;`), and scrolling to `(0, 0)` for Frame #1.
3. Implement `hideFixedAndStickyElementsInDom` to hide all `position: fixed` and `position: sticky` elements after Frame #1 while preserving their original inline `visibility` attributes.
4. Implement `stepFullPageScrollInDom(targetScrollY)` and `restoreFullPageScrollInDom()` restoring all hidden `fixed`/`sticky` elements, removing `[data-snapmark-scroll-style]`, and scrolling back to `(originalScrollX, originalScrollY)`.
5. Add unit tests in `tests/unit/content-scroll.test.ts` verifying frame offset calculation, `MAX_CANVAS_HEIGHT` capping, Frame #1 header visibility, Frame #2+ `fixed`/`sticky` suppression, and complete DOM restoration.

## 6. Files

| Path | Action (create / modify) | Purpose |
|---|---|---|
| `src/content/capture-injected.ts` | modify | Add full-page scroll state machine and `fixed`/`sticky` suppression & restoration |
| `tests/unit/content-scroll.test.ts` | create | Unit tests for scroll planning, `MAX_CANVAS_HEIGHT` cap, `fixed`/`sticky` hiding, and restoration |

## 7. Contracts and data (if applicable)
- `computeFullPageFrameOffsets(totalHeightCss: number, viewportHeightCss: number, dpr: number, maxPhysicalHeight?: number)`
- `prepareFullPageScrollInDom(maxPhysicalHeight?: number): FullPageScrollPlan`
- `hideFixedAndStickyElementsInDom(): number`
- `stepFullPageScrollInDom(targetScrollY: number): { actualScrollY: number; viewportWidthCss: number; viewportHeightCss: number }`
- `restoreFullPageScrollInDom(originalScrollX?: number, originalScrollY?: number): void`

## 8. UI details (if applicable)
Not applicable (target webpage DOM scroll controller).

## 9. Acceptance criteria
- [ ] TC-01: `prepareFullPageScrollInDom()` scrolls to `(0, 0)` for Frame #1 without hiding `fixed` or `sticky` elements yet.
- [ ] TC-02: `hideFixedAndStickyElementsInDom()` sets `visibility: hidden !important` on all elements with computed `position: fixed` or `position: sticky`.
- [ ] TC-03: `restoreFullPageScrollInDom()` restores the original `visibility` of every hidden element, removes the scrollbar-hiding style sheet, and scrolls back to `(originalScrollX, originalScrollY)`.
- [ ] TC-04: `computeFullPageFrameOffsets` caps physical height at `MAX_CANVAS_HEIGHT` (`16384` px) and sets `exceededMaxHeight: true` when a page exceeds the limit.
- [ ] TC-05: `npm run typecheck && npm test` pass.

## 10. Tests to add or update
- `tests/unit/content-scroll.test.ts`: Tests `computeFullPageFrameOffsets`, `prepareFullPageScrollInDom`, `hideFixedAndStickyElementsInDom`, `stepFullPageScrollInDom`, and `restoreFullPageScrollInDom`.

## 11. Verification
- Run from repository root:
  `npm run typecheck && npm test`

## 12. Risks and notes
- Store original scroll coordinates in `document.documentElement.dataset.snapmarkOrigScrollX` / `Y` so `restoreFullPageScrollInDom()` can always restore them even if called without arguments from a `finally` block.
