# Task 002 report: Implement Dark Studio Utility design tokens and shared UI styles

## Changes
- `src/styles/tokens.css`: implemented all 27 color tokens (`#FF3B30`, `#0F1115` → `#262B36`, 6 annotation colors, `#FFEB3B` selection highlight), system font stacks (`--font-sans`, `--font-mono`), radius tokens (`--radius-xs` to `--radius-pill`), 4px spacing scale (`--space-xxs` to `--space-section`), elevation shadows (`--shadow-sm` to `--shadow-xl`), and shared UI component classes (`.btn-primary` with `.is-success`, `.btn-secondary`, `.btn-danger-ghost`, `.toolbar-tool-btn`, `.popup-action-card`, `.kbd-badge`, `.segmented-control`, `.color-swatch-tray`, `.toggle-switch`, `.card`, `.status-banner`).
- `tests/unit/tokens.test.ts`: added unit tests verifying every token and component class from `03-Design.md` and enforcing zero external network calls (`http://` / `https://` / `@import`).

## Verification
- `npm run typecheck` — passed.
- `npm test` — 2 test files passed (6 tests total).
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
- Use `.btn-primary`, `.btn-primary.is-success`, `.btn-secondary`, `.btn-danger-ghost`, `.toolbar-tool-btn`, `.popup-action-card`, `.kbd-badge`, `.segmented-control`, `.segmented-option`, `.color-swatch-tray`, `.color-swatch`, `.toggle-switch`, `.status-banner.is-warning`, and `.status-banner.is-danger` directly in `popup.html` (Task 004) and `editor.html` (Tasks 005–006).
