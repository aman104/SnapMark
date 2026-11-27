# Implementation Plan: 035 - Hide viewport scrollbars on capture, remove popup yellow-highlight toggle, and set default thick stroke (8px) with reversed order (8/4/2)

- **Milestone**: M08 - Feature: Clean viewport capture, fit-to-width editor, crop, step badges and freehand pen
- **Task**: `035`
- **Spec References**: `02-General-PRD.md` (`FR-09`, `FR-14`, `FR-15`), `04-Interface-spec.md` (`§9`)

## Changes
1. `src/content/capture-injected.ts`: Add self-contained `hideViewportScrollbarInDom()` (injects `<style data-snapmark-viewport-scrollbar-style>` hiding scrollbars via `scrollbar-width: none !important` and `::-webkit-scrollbar { display: none !important; }` and waits 1 repaint frame) and `restoreViewportScrollbarInDom()` (removes that `<style>`).
2. `src/background/capture-orchestrator.ts`: In `captureVisibleViewport()`, call `hideViewportScrollbarInDom()` before `captureVisibleTab()` and `restoreViewportScrollbarInDom()` in `finally`. In `captureTextSelection()`, always pass `applyHighlight: false`.
3. `src/popup/index.ts`: Remove `<footer class="popup-footer">` (`#toggle-highlight` / `#label-toggle-highlight`).
4. `src/shared/constants.ts`: Reverse `STROKE_WIDTHS` to `[8, 4, 2]` (`Gruba (8px)`, `Średnia (4px)`, `Cienka (2px)`) and change `DEFAULT_USER_SETTINGS.strokeWidth` to `8`.
5. Update existing unit tests (`popup.test.ts`, `editor-toolbar.test.ts`, `settings.test.ts`, `editor-drawing.test.ts`, `background-contextual-captures.test.ts`) and add `tests/unit/viewport-scrollbar-and-defaults.test.ts`.
