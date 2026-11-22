## Round 1 — changes requested — 2026-11-22

Typecheck, 110 tests and build passed. Canvas replacement after first click prevents a real double-click to edit text; preserve the target through the click sequence. Blur commits rebuild the toolbar before mouseup/click and swallow the first action; preserve the clicked target and test complete event sequences.

## Round 2 — changes requested — 2026-11-22

Typecheck, 112 tests and build passed. A delayed selection refresh can replace a toolbar button while held; cancel or defer it during pointer interaction. Text commit on toolbar blur can leave history and selection controls stale; refresh after the click completes.
