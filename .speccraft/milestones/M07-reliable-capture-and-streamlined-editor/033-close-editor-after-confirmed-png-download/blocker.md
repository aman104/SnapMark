# Task 033 blocked: Close editor after confirmed PNG download

## Reason
The third review found that editing remains possible while Chrome processes tab removal, and an in-progress drawing before annotation creation is not included in the close guard. Edits could be lost.

## What was tried
Added confirmed download monitoring, preserved edits made during download, avoided resetting active text selection, and rechecked after delayed tab lookup. Typecheck, 125 tests and build pass.

## What is needed
Tell the agent to unblock task 033 or change `[!]` to `[ ]`; then block editing during tab removal, restore it on failure and cover active drawing with regression tests.

## Impact
Task 034 depends on task 033 and cannot start until it passes review.

## How to resume
Unblock task 033 and resume `10-execution-tasks`; partial work is on `task/033-close-editor-after-confirmed-png-download`.
