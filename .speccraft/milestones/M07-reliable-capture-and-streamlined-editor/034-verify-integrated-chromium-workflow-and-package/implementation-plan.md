# Task 034: Verify integrated Chromium workflow and package

## 1. Summary
- **Task:** 034 - Verify integrated Chromium workflow and package
- **Milestone:** M07 - Feature: Reliable capture and streamlined editor (feature)
- **Type:** integration, ui
- **Depends on:** 029, 030, 031, 032, 033
- **Parallel:** exclusive — shared editor or browser environment; isolation not configured.
- **Sources:** `02-General-PRD.md` FR-08; `04-Interface-spec.md` §5.2; `03-Design.md` toolbar; `05-Tech-Stack.md` M07; `07-feature-plan-editor-capture-improvements.md`.

## 2. Goal
Verify integrated Chromium workflow and package for the approved M07 workflow while preserving existing capture and editor behavior.

## 3. Scope
**In scope:** Real-browser regression passes and release checks pass; limitations are recorded honestly.
**Out of scope:** Other M07 tasks and new annotation tools.

## 4. Current state and prerequisites
Build on existing extension and earlier merged tasks; Node and Chromium are required. Review `.speccraft/progress.md` and the named modules before implementation.

## 5. Implementation steps
1. Inspect the named code and reproduce the behavior in the appropriate environment.
2. Exercise unpacked extension in real Chromium: mid-scroll capture, arrow/line/text editing, deselection, completed download and explicit close, and failure handling. Cover existing capture modes and clipboard paste; make test runner honestly distinguish real browser from mocks. Update README and package checks.
3. Run the checks below and report results and limitations.

## 6. Files
| Path | Action | Purpose |
|---|---|---|
| `tests/e2e/*` | modify | Implementation or verification |
| `scripts/run-e2e.mjs` | modify | Implementation or verification |
| `package.json` | modify | Implementation or verification |
| `README.md` | modify | Implementation or verification |

## 7. Contracts and data
Preserve capture and annotation contracts, automatic filename and existing stored settings. Changes to Chrome permissions must be documented and tested.

## 8. UI details
Follow M07 override in interface and design documents; controls remain keyboard accessible and errors do not discard work.

## 9. Acceptance criteria
- [ ] TC-01: Real-browser regression passes and release checks pass; limitations are recorded honestly.
- [ ] TC-02: Existing related workflows continue to work and failure paths preserve state.

## 10. Tests to add or update
Add targeted regression tests in the named files and a browser test where required by the task.

## 11. Verification
Run `npm run typecheck && npm test && npm run build`; also `npm run test:e2e && npm run package` for integration. Verify task-specific real Chromium behavior; do not claim mocked tests prove real browser behavior.

## 12. Risks and notes
Do not change other tasks' scope. Record actual Chromium availability, errors and deviations. Preserve user content on errors.
