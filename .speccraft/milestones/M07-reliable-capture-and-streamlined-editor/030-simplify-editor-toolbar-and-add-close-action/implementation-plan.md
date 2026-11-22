# Task 030: Simplify editor toolbar and add close action

## 1. Summary
- **Task:** 030 - Simplify editor toolbar and add close action
- **Milestone:** M07 - Feature: Reliable capture and streamlined editor (feature)
- **Type:** integration, ui
- **Depends on:** none
- **Parallel:** exclusive — shared editor or browser environment; isolation not configured.
- **Sources:** `02-General-PRD.md` FR-02, FR-07; `04-Interface-spec.md` §5.2; `03-Design.md` toolbar; `05-Tech-Stack.md` M07; `07-feature-plan-editor-capture-improvements.md`.

## 2. Goal
Simplify editor toolbar and add close action for the approved M07 workflow while preserving existing capture and editor behavior.

## 3. Scope
**In scope:** Toolbar contains requested controls and closes the editor; no clipboard export is shown.
**Out of scope:** Other M07 tasks and new annotation tools.

## 4. Current state and prerequisites
Build on existing extension and earlier merged tasks; Node and Chromium are required. Review `.speccraft/progress.md` and the named modules before implementation.

## 5. Implementation steps
1. Inspect the named code and reproduce the behavior in the appropriate environment.
2. Remove filename/dimensions and clipboard export controls; retain automatic filenames, clipboard paste and annotation tools. Add accessible close control and responsive layout. Test narrow widths and keyboard activation.
3. Run the checks below and report results and limitations.

## 6. Files
| Path | Action | Purpose |
|---|---|---|
| `src/editor/index.ts` | modify | Implementation or verification |
| `src/styles/editor.css` | modify | Implementation or verification |
| `tests/unit/editor-toolbar.test.ts` | modify | Implementation or verification |
| `README.md` | modify | Implementation or verification |

## 7. Contracts and data
Preserve capture and annotation contracts, automatic filename and existing stored settings. Changes to Chrome permissions must be documented and tested.

## 8. UI details
Follow M07 override in interface and design documents; controls remain keyboard accessible and errors do not discard work.

## 9. Acceptance criteria
- [ ] TC-01: Toolbar contains requested controls and closes the editor; no clipboard export is shown.
- [ ] TC-02: Existing related workflows continue to work and failure paths preserve state.

## 10. Tests to add or update
Add targeted regression tests in the named files and a browser test where required by the task.

## 11. Verification
Run `npm run typecheck && npm test && npm run build`; also `npm run test:e2e && npm run package` for integration. Verify task-specific real Chromium behavior; do not claim mocked tests prove real browser behavior.

## 12. Risks and notes
Do not change other tasks' scope. Record actual Chromium availability, errors and deviations. Preserve user content on errors.
