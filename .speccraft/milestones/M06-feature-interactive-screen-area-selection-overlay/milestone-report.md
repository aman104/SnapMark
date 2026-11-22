# Milestone M06: Interactive screen area selection

## Summary
Popup and Alt+Shift+S now start interactive area selection. The selected area is opened in the editor at device pixel ratio; the context menu retains text selection capture. Switching active tabs before capture cancels the capture.

## What you can see now
The third popup card is “Zaznacz fragment ekranu”. Dragging shows a crosshair, red outline, dimmed surroundings and dimensions. Phase 8+ — Evolution.

## How to review
1. Run `npm run build`, open `chrome://extensions`, enable developer mode, load or reload the unpacked `dist/` directory.
2. Open a normal website, click SnapMark → “Zaznacz fragment ekranu”, drag a rectangle and check that the editor opens with the selected area.
3. Repeat with Alt+Shift+S; verify Escape and a tiny drag cancel. Select text and use the right-click capture menu to verify the original flow.
4. Test on a high-DPI display and confirm the output retains physical resolution.

Code: `milestone/M06-feature-interactive-screen-area-selection-overlay`; use `git diff main...milestone/M06-feature-interactive-screen-area-selection-overlay` to inspect changes.

## Exit criteria
- Popup card enabled without text selection: **MET in automated tests** (`tests/unit/popup.test.ts`); actual Chrome walkthrough pending.
- Drag, Escape and overlay cleanup: **MET in unit tests** (`tests/unit/content-area-overlay.test.ts`); actual Chrome walkthrough pending.
- Retina crop and editor: **MET in simulated E2E** (`tests/e2e/extension.spec.ts`); actual Chrome walkthrough pending.
- Regression checks: **MET** — typecheck, 97 unit tests, build, 4 simulated E2E tests and release package passed.

## Tasks
- 026 — approved and merged: selection overlay.
- 027 — approved and merged: background orchestration and active-tab check.
- 028 — approved and merged: popup, tests and documentation.

## Assumptions to review
None recorded.

## Known limitations and deviations
The E2E runner uses JSDOM and mocked Chrome APIs; the real extension and demo have not been manually verified in Chrome. No screenshots were captured.

## Spec changes
None recorded; review the feature plan against the actual implementation during acceptance.

## Operator decision
- Accept M06 with `08-planning-tasks` after reviewing the demo.
- Or request changes and describe what should be corrected.
