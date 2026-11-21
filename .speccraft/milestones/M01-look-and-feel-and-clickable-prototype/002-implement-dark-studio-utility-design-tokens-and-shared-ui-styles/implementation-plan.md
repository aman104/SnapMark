# Task 002: Implement Dark Studio Utility design tokens and shared UI styles

## 1. Summary
- **Task:** 002 - Implement Dark Studio Utility design tokens and shared UI styles - Translate all colors, typography stacks, spacing, radii, elevation shadows and component classes from 03-Design.md into src/styles/tokens.css using CSS Custom Properties and zero external font or icon CDN calls. Include reusable primitives for button-primary (#FF3B30 with #22C55E success state), button-secondary, toolbar-tool-button, popup-action-card, kbd-badge, toggle switch, segmented pills and status banners, plus a unit test verifying token completeness. The task is done when tokens.css defines every token from 03-Design.md and passes automated verification.
- **Milestone:** M01 - Look & feel and clickable prototype (type: prototype)
- **Type:** `ui`, `prototype`
- **Depends on:** 001
- **Parallel:** `exclusive` — establishes global CSS Custom Properties and component classes in `src/styles/tokens.css` consumed by all UI tasks
- **Sources:** `03-Design.md (YAML front matter & Sections: Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts)`

## 2. Goal
Implement the complete **Dark Studio Utility** visual system in `src/styles/tokens.css` so both `popup.html` and `editor.html` share exact CSS custom properties (`--color-*`, `--font-*`, `--radius-*`, `--space-*`, `--shadow-*`) and reusable component classes (`btn-primary`, `btn-secondary`, `toolbar-tool-btn`, `popup-action-card`, `kbd-badge`, `toggle-switch`, `segmented-control`, `status-banner`).

## 3. Scope
**In scope:**
- Full `:root` CSS Custom Properties in `src/styles/tokens.css` matching every token in `03-Design.md` YAML front matter
- Base CSS reset (`box-sizing: border-box`, dark background `--color-canvas` `#0F1115`, system font stack `--font-sans`, focus-visible ring `2px solid var(--color-focus-ring)`)
- Reusable CSS component classes in `src/styles/tokens.css`:
  - `.btn-primary` (Signal Red `#FF3B30`, hover `#FF5147`, pressed `#E02E24`, and `.is-success` `#22C55E` variant for `"✓ Skopiowano!"`)
  - `.btn-secondary` (`--color-surface-2`, hairline border, disabled state `opacity: 0.4`)
  - `.btn-danger-ghost` (for deleting selected vector annotation)
  - `.toolbar-tool-btn` (with `.is-active` state featuring `--color-surface-elevated` background and `--color-primary` border/indicator)
  - `.popup-action-card` (with hover accent border and `.is-disabled` state)
  - `.kbd-badge` (monospace `11px`, `--radius-xs` `4px`)
  - `.toggle-switch` (`36px × 20px` pill switch)
  - `.segmented-control` & `.segmented-option` (for stroke width, underline/highlighter toggle, and text readability mode)
  - `.color-swatch-tray` & `.color-swatch` (`20px × 20px` circles with active outer ring)
  - `.status-banner` (`.is-warning` `#F59E0B` and `.is-danger` `#EF4444` variants)
- Unit test `tests/unit/tokens.test.ts` validating that every required color, radius, spacing, elevation, and component rule from `03-Design.md` is present and no external `http://` or `https://` font URLs exist.

**Out of scope:**
- Specific popup DOM structure and event handlers — task 004
- Specific editor toolbar DOM structure and canvas stage — tasks 005 and 006

## 4. Current state and prerequisites
- Task 001 completed: project builds with Vite and runs Vitest unit tests.

## 5. Implementation steps
1. Populate `src/styles/tokens.css` with `:root` custom properties for all 27 colors (`--color-primary: #FF3B30`, `--color-primary-hover: #FF5147`, `--color-primary-pressed: #E02E24`, `--color-on-primary: #FFFFFF`, `--color-secondary: #262B36`, `--color-accent: #3B82F6`, `--color-ink: #F3F4F6`, `--color-ink-muted: #9CA3AF`, `--color-ink-subtle: #6B7280`, `--color-canvas: #0F1115`, `--color-surface-1: #171A21`, `--color-surface-2: #1E222B`, `--color-surface-elevated: #262B36`, `--color-hairline: #2A303C`, `--color-hairline-strong: #3B4354`, `--color-focus-ring: #FF3B30`, `--color-success: #22C55E`, `--color-warning: #F59E0B`, `--color-danger: #EF4444`, `--color-info: #3B82F6`, plus all 6 annotation colors and `--color-selection-highlight: #FFEB3B`).
2. Define typography variables (`--font-sans`, `--font-mono`), spacing tokens (`--space-xxs: 2px` through `--space-section: 48px`), border radius tokens (`--radius-xs: 4px` through `--radius-pill: 9999px`), and elevation tokens (`--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`).
3. Implement the shared component classes (`.btn-primary`, `.btn-secondary`, `.btn-danger-ghost`, `.toolbar-tool-btn`, `.popup-action-card`, `.kbd-badge`, `.toggle-switch`, `.segmented-control`, `.color-swatch`, `.status-banner`) with keyboard `:focus-visible` outlines.
4. Create `tests/unit/tokens.test.ts` reading `src/styles/tokens.css` and asserting that all hex values, spacing tokens, elevation variables, and component classes from `03-Design.md` exist and zero external URLs (`@import`, `https://fonts.googleapis.com`) are referenced.

## 6. Files

| Path | Action (create / modify) | Purpose |
|---|---|---|
| `src/styles/tokens.css` | modify | Complete Dark Studio Utility design tokens and shared UI primitive classes |
| `tests/unit/tokens.test.ts` | create | Automated verification of all design tokens and zero-network-call rule |

## 7. Contracts and data (if applicable)
Not applicable (CSS design system layer).

## 8. UI details (if applicable)
- Exact colors: `--color-canvas: #0F1115`, `--color-surface-1: #171A21`, `--color-surface-2: #1E222B`, `--color-surface-elevated: #262B36`, `--color-primary: #FF3B30`, `--color-success: #22C55E`.
- System font stacks: `-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif` and `'SF Mono', 'JetBrains Mono', 'Cascadia Code', Consolas, monospace`.
- Accessible focus ring: `2px solid var(--color-focus-ring)` with `outline-offset: 2px`.

## 9. Acceptance criteria
- [ ] TC-01: `src/styles/tokens.css` defines all color, typography, radius, spacing, and elevation tokens specified in `03-Design.md`.
- [ ] TC-02: `src/styles/tokens.css` contains zero external network references (`http://` or `https://`).
- [ ] TC-03: Component classes for primary/secondary buttons, tool buttons, popup cards, `<kbd>` badges, color swatches, segmented pills, switches, and banners are styled for default, hover, active, focus-visible, and disabled states.
- [ ] TC-04: `npm test && npm run build` pass with exit code `0`.

## 10. Tests to add or update
- `tests/unit/tokens.test.ts`: Verifies presence of all required hex tokens (`#FF3B30`, `#0F1115`, `#171A21`, `#1E222B`, `#22C55E`, `#FFCC00`, `#34C759`, `#007AFF`, `#FFFFFF`, `#1C1C1E`), spacing/radius tokens, component selectors, and absence of remote font/CDN URLs.

## 11. Verification
- Run from repository root:
  `npm run typecheck && npm test && npm run build`

## 12. Risks and notes
- Never apply `border-radius` to `#editor-canvas` in the shared stylesheet (`03-Design.md` Do's and Don'ts).
