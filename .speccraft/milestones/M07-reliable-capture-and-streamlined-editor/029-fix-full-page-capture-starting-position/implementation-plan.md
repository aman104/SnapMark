# Task 029: Fix full-page capture starting position

## 1. Summary
- **Task:** 029 - Fix full-page capture starting position
- **Milestone:** M07 - Feature: Reliable capture and streamlined editor (feature)
- **Type:** integration, ui
- **Depends on:** none
- **Parallel:** exclusive — shared editor or browser environment; isolation not configured.
- **Sources:** `02-General-PRD.md` FR-01; `04-Interface-spec.md` §5.2; `03-Design.md` toolbar; `05-Tech-Stack.md` M07; `07-feature-plan-editor-capture-improvements.md`.

## 2. Goal
Fix full-page capture starting position for the approved M07 workflow while preserving existing capture and editor behavior.

## 3. Scope
**In scope:** First frame is visibly page top; restoration works after success, error and cancellation.
**Out of scope:** Other M07 tasks and new annotation tools.

## 4. Current state and prerequisites
Build on existing extension and earlier merged tasks; Node and Chromium are required. Review `.speccraft/progress.md` and the named modules before implementation.

## 5. Implementation steps
1. Inspect the named code and reproduce the behavior in the appropriate environment.
2. Reproduce mid-page and smooth-scroll capture in Chromium. Ensure prepare/step waits for a rendered top frame and verifies actual scroll position before capture; handle failure and restore original position and styles in finally. Cover subsequent offsets and cancellation.
3. Run the checks below and report results and limitations.

## 6. Files
| Path | Action | Purpose |
|---|---|---|
| `src/content/capture-injected.ts` | modify | Implementation or verification |
| `src/background/capture-orchestrator.ts` | modify | Implementation or verification |
| `tests/unit/content-scroll.test.ts` | modify | Implementation or verification |
| `tests/unit/background-contextual-captures.test.ts` | modify | Implementation or verification |

## 7. Contracts and data
Preserve capture and annotation contracts, automatic filename and existing stored settings. Changes to Chrome permissions must be documented and tested.

## 8. UI details
Follow M07 override in interface and design documents; controls remain keyboard accessible and errors do not discard work.

## 9. Acceptance criteria
- [ ] TC-01: First frame is visibly page top; restoration works after success, error and cancellation.
- [ ] TC-02: Existing related workflows continue to work and failure paths preserve state.

## 10. Tests to add or update
Add targeted regression tests in the named files and a browser test where required by the task.

## 11. Verification
Run `npm run typecheck && npm test && npm run build`; also `npm run test:e2e && npm run package` for integration. Verify task-specific real Chromium behavior; do not claim mocked tests prove real browser behavior.

## 12. Risks and notes
Do not change other tasks' scope. Record actual Chromium availability, errors and deviations. Preserve user content on errors.
