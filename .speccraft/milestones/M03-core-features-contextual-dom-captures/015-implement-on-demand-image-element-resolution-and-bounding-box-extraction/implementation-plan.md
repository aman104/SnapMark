# Task 015: Implement on-demand image element resolution and bounding box extraction

## 1. Summary
- **Task:** 015 - Implement on-demand image element resolution and bounding box extraction - Extend src/content/capture-injected.ts with measureTargetImageInDom(srcUrl?: string) as specified in 02-General-PRD.md section 4.2 and 05-Tech-Stack.md section 5 Decision 4. Locate the target <img> element in the webpage DOM by matching info.srcUrl against img.currentSrc or img.src, prioritizing hovered/focused and visible viewport images, scroll partially clipped images into view (scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })), measure img.getBoundingClientRect() clamped to the visible viewport, and return the CSS crop rectangle and window.devicePixelRatio without performing any network fetch. The task is done when tests/unit/content-image.test.ts verifies exact <img> resolution by srcUrl/hover, offscreen scrolling, and viewport clamping.
- **Milestone:** M03 - Core features: Contextual DOM captures (Selection, Image, Full-Page Scroll) (type: feature)
- **Type:** `integration`, `ui`
- **Depends on:** 014
- **Parallel:** `exclusive` — extends `src/content/capture-injected.ts`
- **Sources:** `02-General-PRD.md §4.2 "Tryb 2: Zrzut wybranego obrazka"`, `02-General-PRD.md §7 "Edge Cases"`, `05-Tech-Stack.md §5 Decision 4`

## 2. Goal
Implement on-demand `<img>` element lookup and viewport bounding-rect measurement (`measureTargetImageInDom`) for **Tryb 2: Wybrany obrazek `<img>`**, allowing SnapMark to crop any rendered image directly from `captureVisibleTab()` without network fetches, bypassing CORS blocks and `AVIF`/`WebP` file format issues.

## 3. Scope
**In scope:**
- Extending `src/content/capture-injected.ts` with:
  - `ImageMeasurementResult`: `{ found: boolean; cropRectCss: CssRect | null; viewportWidthCss: number; viewportHeightCss: number; dpr: number; matchedSrc: string | null }`
  - `measureTargetImageInDom(targetSrcUrl?: string): ImageMeasurementResult`
  - Resolution priority:
    1. Visible `<img>` matching `targetSrcUrl` (comparing exact `currentSrc`, `src`, `getAttribute('src')`, or filename suffix) that is currently `:hover` or nearest the viewport center
    2. Currently hovered `img:hover` or focused `<img>` when `targetSrcUrl` is omitted or `blob:`/`data:`
    3. Largest visible `<img>` in the current viewport as final fallback
  - Scrolls partially clipped `<img>` elements into view (`scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })`) and clamps the measured `getBoundingClientRect()` to `0..window.innerWidth` and `0..window.innerHeight`
- Unit tests in `tests/unit/content-image.test.ts`

**Out of scope:**
- Full-page scroll DOM controller — task 016

## 4. Current state and prerequisites
- Task 014 (`src/content/capture-injected.ts`) completed.

## 5. Implementation steps
1. Add `ImageMeasurementResult` and `measureTargetImageInDom(targetSrcUrl?: string)` to `src/content/capture-injected.ts`.
2. Implement candidate scoring across `Array.from(document.querySelectorAll('img'))` checking `img.currentSrc`, `img.src`, `img.getAttribute('src')`, `img.matches(':hover')`, and non-zero `getBoundingClientRect()`.
3. Scroll partially clipped target images into the viewport and clamp the returned `cropRectCss` to `0..window.innerWidth` and `0..window.innerHeight`.
4. Add unit tests in `tests/unit/content-image.test.ts` testing exact `srcUrl` match, duplicate `srcUrl` disambiguation by viewport visibility, partially clipped image clamping, and missing image handling.

## 6. Files

| Path | Action (create / modify) | Purpose |
|---|---|---|
| `src/content/capture-injected.ts` | modify | Add `measureTargetImageInDom` for `<img>` resolution and bounding box extraction |
| `tests/unit/content-image.test.ts` | create | Unit tests for `<img>` matching, scrolling into view, and viewport clamping |

## 7. Contracts and data (if applicable)
- `measureTargetImageInDom(targetSrcUrl?: string): ImageMeasurementResult`

## 8. UI details (if applicable)
Not applicable (DOM geometry extraction).

## 9. Acceptance criteria
- [ ] TC-01: `measureTargetImageInDom(srcUrl)` locates the matching `<img>` in the DOM and returns its exact `getBoundingClientRect()` clamped to the visible viewport without making any network `fetch` calls.
- [ ] TC-02: When multiple `<img>` tags share the same `srcUrl`, `measureTargetImageInDom` prefers the one visible in the current viewport (`width > 0`, `height > 0`, within `0..innerHeight`).
- [ ] TC-03: When no visible `<img>` exists on the page, `measureTargetImageInDom` returns `{ found: false, cropRectCss: null }`.
- [ ] TC-04: `npm run typecheck && npm test` pass.

## 10. Tests to add or update
- `tests/unit/content-image.test.ts`: Tests `srcUrl` matching, viewport visibility preference, edge clamping, and no-image fallback.

## 11. Verification
- Run from repository root:
  `npm run typecheck && npm test`

## 12. Risks and notes
- Never add padding to `<img>` captures (unlike text selections which get `20px` padding); `<img>` captures must match the exact pixel bounds of the image element (`02-General-PRD.md §4.2`).
