# Report — Task 046: Single-click text commit and deselect

- **Status:** Completed
- **Branch:** `task/046-rework-m08-single-click-text-deselect`

## Summary of Changes

- Updated `commitActiveTextDraft()` in `src/editor/index.ts` so committing text via canvas click-off or `Enter` sets `state.selectedAnnotationId = null` (keeping selection only when committing via a toolbar control click), eliminating the need to click twice to deselect newly added or edited text.
- Updated `tests/unit/editor-text-tool.test.ts` to assert immediate deselection after text commit.

## Verification

- `npm run typecheck`: 0 errors
- `npm test`: 32 test files, 145 tests passed
- `npm run build`: passed
- `npm run test:e2e`: 4 Vitest E2E + 8 real Chromium workflows passed
- `npm run package`: `snapmark-extension.zip` (40 241 bytes)
