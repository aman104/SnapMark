# Task 032 report: Repair interactive text annotations

## Changes
- Prevent default canvas mousedown focus handling while creating a text draft, so it cannot immediately blur the newly focused textarea.
- Added regression coverage for prevented default focus transfer, active textarea, input and commit; existing tests cover edit, move and undo.

## Verification
- `npm run typecheck`, `npm test` (118 tests), `npm run build` passed.
- Actual extension reproduction remains unverified: isolated Chrome for Testing failed to open the test editor before timeout. The operator explicitly accepted proceeding without that test for this task. Full browser integration remains task 034.

## Deviations from the plan
- Real extension reproduction and verification not completed, with operator acceptance.

## Spec impact
- None.

## Assumptions
- Focus transfer during mousedown is the suspected cause; real extension verification is still needed.

## Notes for next tasks
- Task 034 must verify creation, typing, edit and export in the actual extension.

## Review fixes
- Preserve canvas during double-click selection and defer toolbar refresh; cancel a pending refresh when another render or interaction starts.
- Commit on toolbar blur without replacing the clicked button; added full mouse-sequence regressions for editing and download.
- Round 2: defer pending selection refresh while a toolbar press is held, then refresh after the click/mouseup; synchronize history controls after text commit. Added regression tests for both sequences.
- Round 3: distinguish keyboard focus from held pointer; after keyboard blur, refresh toolbar and restore focus to the corresponding control. Added focus and history regression coverage.
- Round 4: preserve pending selection refresh on right-click and double-click outside text; added regression coverage.
- Round 5: replace delayed full rerender with an immediate toolbar-only refresh that retains the canvas and restores focused actions; added keyboard focus regression.
- Round 6: refresh only the toolbar after a toolbar-triggered commit, restoring the focused control; regression uses actual focus and completed mouse sequence.
- Round 7: restore focus by control identity after toolbar actions that rebuild the editor; added tool and color interaction regressions.
