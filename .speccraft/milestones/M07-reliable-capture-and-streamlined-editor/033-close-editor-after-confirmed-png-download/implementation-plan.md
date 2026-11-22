# Task 033: Close editor after confirmed PNG download

## 1. Summary
- **Task:** 033 - Close editor after confirmed PNG download
- **Milestone:** M07 - Feature: Reliable capture and streamlined editor (feature)
- **Type:** integration, ui
- **Depends on:** 032
- **Parallel:** exclusive — shared editor or browser environment; isolation not configured.
- **Sources:** `02-General-PRD.md` FR-06; `04-Interface-spec.md` §5.2; `03-Design.md` toolbar; `05-Tech-Stack.md` M07; `07-feature-plan-editor-capture-improvements.md`.

## 2. Goal
Close editor after confirmed PNG download for the approved M07 workflow while preserving existing capture and editor behavior.

## 3. Scope
**In scope:** Success closes only after completed; interrupted, cancelled and failed downloads leave the editor open with feedback.
**Out of scope:** Other M07 tasks and new annotation tools.

## 4. Current state and prerequisites
Build on existing extension and earlier merged tasks; Node and Chromium are required. Review `.speccraft/progress.md` and the named modules before implementation.

## 5. Implementation steps
1. Inspect the named code and reproduce the behavior in the appropriate environment.
2. Use chrome.downloads API and the minimal downloads permission to observe the exact download id until completed or interrupted; handle immediate completion races via search and cleanup listeners. Keep the blob URL alive until safe to release, close editor only on completed, and show actionable errors while preserving state on interrupted/cancelled or API failure. Retain auto filename and clipboard paste.
3. Run the checks below and report results and limitations.

## 6. Files
| Path | Action | Purpose |
|---|---|---|
| `src/editor/index.ts` | modify | Implementation or verification |
| `src/editor/exporter.ts` | modify | Implementation or verification |
| `src/background/index.ts` | modify | Implementation or verification |
| `public/manifest.json` | modify | Implementation or verification |
| `tests/unit/editor-exporter.test.ts` | modify | Implementation or verification |
| `tests/unit/editor-toolbar.test.ts` | modify | Implementation or verification |
| `README.md` | modify | Implementation or verification |

## 7. Contracts and data
Preserve capture and annotation contracts, automatic filename and existing stored settings. Changes to Chrome permissions must be documented and tested.

## 8. UI details
Follow M07 override in interface and design documents; controls remain keyboard accessible and errors do not discard work.

## 9. Acceptance criteria
- [ ] TC-01: Success closes only after completed; interrupted, cancelled and failed downloads leave the editor open with feedback.
- [ ] TC-02: Existing related workflows continue to work and failure paths preserve state.

## 10. Tests to add or update
Add targeted regression tests in the named files and a browser test where required by the task.

## 11. Verification
Run `npm run typecheck && npm test && npm run build`; also `npm run test:e2e && npm run package` for integration. Verify task-specific real Chromium behavior; do not claim mocked tests prove real browser behavior.

## 12. Risks and notes
Do not change other tasks' scope. Record actual Chromium availability, errors and deviations. Preserve user content on errors.
