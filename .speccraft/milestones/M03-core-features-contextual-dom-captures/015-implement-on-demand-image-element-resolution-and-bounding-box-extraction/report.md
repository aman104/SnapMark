# Task 015 report: Implement on-demand image element resolution and bounding box extraction

## Changes
- `src/content/capture-injected.ts`: added `measureTargetImageInDom(targetSrcUrl?: string)` locating the clicked `<img>` element by `srcUrl`/`currentSrc`, viewport visibility, and hover/focus priority, scrolling partially clipped images into view (`scrollIntoView`), and returning the exact viewport-clamped `cropRectCss` and `window.devicePixelRatio` without network fetches.
- `tests/unit/content-image.test.ts`: added unit tests verifying `srcUrl` matching, duplicate image disambiguation, offscreen scrolling + edge clamping, and no-image fallback.

## Verification
- `npm run typecheck` — passed.
- `npm test` — 16 test files passed (59 tests total).
- `npm run build` — passed.
- TC-01 … TC-04: met.

## Deviations from the plan
- none

## Spec impact
- none

## Review fixes
- none

## Assumptions
- none

## Notes for next tasks
- Task 016 extends `src/content/capture-injected.ts` with the full-page scroll state machine and `position: fixed / sticky` header suppression.
