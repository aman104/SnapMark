# Task 007: Implement DPI crop math, filename formatter and restricted URL guard

## 1. Summary
- **Task:** 007 - Implement DPI crop math, filename formatter and restricted URL guard - Create the core pure utility modules src/shared/dpi.ts, src/shared/filename.ts and src/shared/url-guard.ts as specified in 02-General-PRD.md sections 4.1, 6.2, 7 and 9 and 05-Tech-Stack.md section 8. Implement multiplyRectByDpr and clampRectWithPaddingToViewport (multiplying CSS coordinates and 20px safety margin by window.devicePixelRatio and clamping to viewport bounds), formatCaptureFilename (generating <normalized-domain>_YYYY-MM-DD_HH-mm.png such as domena-pl_2026-11-21_14-10.png), and isRestrictedBrowserUrl (detecting chrome://, edge://, about:, chrome-extension:// and Chrome Web Store URLs). The task is done when unit tests in tests/unit/dpi.test.ts, tests/unit/filename.test.ts and tests/unit/url-guard.test.ts cover all standard and edge cases and pass.
- **Milestone:** M02 - Foundations: Manifest V3, IndexedDB transfer and Viewport capture (type: foundation)
- **Type:** `data`, `infra`
- **Depends on:** 003
- **Parallel:** `safe` — touches only `src/shared/dpi.ts`, `src/shared/filename.ts`, `src/shared/url-guard.ts` and their dedicated unit test files
- **Sources:** `02-General-PRD.md §4.1, §6.2, §7, §9`, `05-Tech-Stack.md §4.1 & §8`

## 2. Goal
Implement the foundational pure calculation and validation helpers required across all capture modes: physical pixel Retina/4K DPI scaling (`multiplyRectByDpr`, `clampRectWithPaddingToViewport`), automatic domain + timestamp PNG filename formatting (`formatCaptureFilename`), and restricted browser URL detection (`isRestrictedBrowserUrl`).

## 3. Scope
**In scope:**
- `src/shared/dpi.ts`:
  - `normalizeDpr(dpr: number): number` (ensures positive finite DPR, defaulting to `1` if invalid/<=0)
  - `clampRectWithPaddingToViewport(rect: CssRect, viewportWidth: number, viewportHeight: number, paddingPx?: number): CssRect` (adds `paddingPx` default `20px` on all 4 sides and clamps within `0..viewportWidth` and `0..viewportHeight`)
  - `multiplyRectByDpr(rect: CssRect, dpr: number): CssRect` (computes `{ x: Math.round(rect.x * dpr), y: Math.round(rect.y * dpr), width: Math.max(1, Math.round(rect.width * dpr)), height: Math.max(1, Math.round(rect.height * dpr)) }`)
  - `computePhysicalCropRect(rect: CssRect, viewportWidth: number, viewportHeight: number, dpr: number, paddingPx?: number): CssRect` (combines clamping with padding in CSS space followed by physical DPR multiplication)
- `src/shared/filename.ts`:
  - `normalizeDomainForFilename(urlOrHostname: string): string` (extracts hostname, strips leading `www.`, replaces dots and non-alphanumeric characters with single hyphens `-`, defaults to `'strona'` for invalid/empty URLs; e.g., `https://domena.pl/artykul` -> `'domena-pl'`, `https://app.github.com/issues` -> `'app-github-com'`, `http://localhost:3000` -> `'localhost'`)
  - `formatCaptureFilename(sourceUrl: string, date?: Date): string` (produces `<normalized-domain>_YYYY-MM-DD_HH-mm.png` in local time; e.g., `domena-pl_2026-11-21_14-10.png`)
- `src/shared/url-guard.ts`:
  - `isRestrictedBrowserUrl(url: string | undefined | null): boolean` (returns `true` for empty/missing URLs, `chrome://`, `edge://`, `brave://`, `arc://`, `vivaldi://`, `opera://`, `about:`, `chrome-extension://`, `devtools://`, `view-source:`, and Chrome Web Store domains `chromewebstore.google.com` / `chrome.google.com/webstore`; returns `false` for normal `http://` and `https://` web pages)
- Unit tests in `tests/unit/dpi.test.ts`, `tests/unit/filename.test.ts`, and `tests/unit/url-guard.test.ts`

**Out of scope:**
- DOM `Range.getBoundingClientRect()` injection — Milestone M03

## 4. Current state and prerequisites
- `src/shared/types.ts` (`CssRect`) and `src/shared/constants.ts` (`SELECTION_PADDING_PX = 20`) exist from Milestone M01.

## 5. Implementation steps
1. Create `src/shared/dpi.ts` implementing `normalizeDpr`, `clampRectWithPaddingToViewport`, `multiplyRectByDpr`, and `computePhysicalCropRect`.
2. Create `src/shared/filename.ts` implementing `normalizeDomainForFilename` and `formatCaptureFilename`.
3. Create `src/shared/url-guard.ts` implementing `isRestrictedBrowserUrl`.
4. Create `tests/unit/dpi.test.ts`, `tests/unit/filename.test.ts`, and `tests/unit/url-guard.test.ts` covering all standard, Retina (`dpr = 1, 1.25, 1.5, 2, 3`), edge-clamping, and restricted URL cases.

## 6. Files

| Path | Action (create / modify) | Purpose |
|---|---|---|
| `src/shared/dpi.ts` | create | Physical pixel DPR scaling and 20px viewport-clamped padding math |
| `src/shared/filename.ts` | create | Auto-filename generator `<domain>_YYYY-MM-DD_HH-mm.png` |
| `src/shared/url-guard.ts` | create | Restricted browser and Chrome Web Store URL detector |
| `tests/unit/dpi.test.ts` | create | Unit tests for DPI math and viewport boundary clamping |
| `tests/unit/filename.test.ts` | create | Unit tests for domain normalization and timestamp filename formatting |
| `tests/unit/url-guard.test.ts` | create | Unit tests for restricted vs allowed URLs |

## 7. Contracts and data (if applicable)
- `clampRectWithPaddingToViewport(rect: CssRect, viewportWidth: number, viewportHeight: number, paddingPx = 20): CssRect`
- `multiplyRectByDpr(rect: CssRect, dpr: number): CssRect`
- `formatCaptureFilename(sourceUrl: string, date = new Date()): string`
- `isRestrictedBrowserUrl(url: string | undefined | null): boolean`

## 8. UI details (if applicable)
Not applicable (pure shared utility modules).

## 9. Acceptance criteria
- [ ] TC-01: `clampRectWithPaddingToViewport` adds `20px` padding on all 4 sides and clamps `x >= 0`, `y >= 0`, `x + width <= viewportWidth`, and `y + height <= viewportHeight` when the selection is near the edge of the screen (`PRD §7`).
- [ ] TC-02: `multiplyRectByDpr` accurately scales CSS coordinates by `1`, `1.25`, `1.5`, `2`, and `3` and rounds to integer physical pixels (`PRD §6.2`).
- [ ] TC-03: `formatCaptureFilename('https://domena.pl/artykul/test', new Date(2026, 10, 21, 14, 10))` returns `'domena-pl_2026-11-21_14-10.png'` (`PRD §9.1`).
- [ ] TC-04: `isRestrictedBrowserUrl` returns `true` for `chrome://extensions`, `edge://settings`, `about:blank`, `https://chromewebstore.google.com/detail/xyz`, and `https://chrome.google.com/webstore/category/extensions`, and `false` for `https://domena.pl` and `http://localhost:3000`.
- [ ] TC-05: `npm run typecheck && npm test` pass with exit code `0`.

## 10. Tests to add or update
- `tests/unit/dpi.test.ts`: Tests `clampRectWithPaddingToViewport`, `multiplyRectByDpr`, `computePhysicalCropRect`.
- `tests/unit/filename.test.ts`: Tests `normalizeDomainForFilename` and `formatCaptureFilename` across domains, subdomains, `www.`, `localhost`, and invalid URLs.
- `tests/unit/url-guard.test.ts`: Tests restricted schemes, Web Store URLs, and allowed HTTP/HTTPS URLs.

## 11. Verification
- Run from repository root:
  `npm run typecheck && npm test`

## 12. Risks and notes
- Always format the timestamp in `formatCaptureFilename` using local year/month/day/hours/minutes (zero-padded to 2 digits) so the filename matches the user's wall-clock time as shown in `02-General-PRD.md §9.1`.
