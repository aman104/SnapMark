# Task 010 report: Complete Manifest V3 package, extension icons and multi-entry Vite build

## Changes
- `public/manifest.json`: added `background.service_worker = "background.js"`, `icons` & `action.default_icon` (`16`, `32`, `48`, `128 px`), and `commands` (`capture-viewport` `Alt+Shift+V`, `capture-fullpage` `Alt+Shift+F`, `capture-selection` `Alt+Shift+S`) while keeping permissions strictly limited to `activeTab`, `contextMenus`, `scripting`, `storage`.
- `public/icons/icon-16.png`, `icon-32.png`, `icon-48.png`, `icon-128.png`: created binary PNG icons with Signal Red (`#FF3B30`) brand color.
- `vite.config.ts`: added `background` Rollup input (`src/background/index.ts`) emitting `dist/background.js`.
- `src/background/index.ts`: created initial MV3 Service Worker entry module (expanded in Task 011).
- `tests/unit/smoke.test.ts`: verified Manifest V3 service worker, commands, icons, and valid PNG headers/dimensions.

## Verification
- `npm run typecheck` — passed.
- `npm test` — 11 test files passed (40 tests total).
- `npm run build` — emitted `dist/manifest.json`, `dist/background.js`, `dist/popup.html`, `dist/editor.html`, and `dist/icons/icon-*.png`.
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
- Task 011 will populate `src/background/index.ts` with context menu setup, `CaptureRateLimiter`, and `captureVisibleViewport`.
