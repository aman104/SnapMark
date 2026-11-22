## Round 1 — changes requested — 2026-11-22

Typecheck, 122 tests and build passed. Edits during a pending download may be lost when the tab closes; preserve them. A failure rerender resets textarea cursor/selection; update feedback without disrupting active text. Add regressions.

## Round 2 — changes requested — 2026-11-22

Typecheck, 124 tests and build passed. Edits can occur while waiting for chrome.tabs.getCurrent after download completion; recheck directly before tab removal and test delayed lookup.
