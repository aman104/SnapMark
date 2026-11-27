# Task Report: 035 - Hide viewport scrollbars on capture, remove popup yellow-highlight toggle, and set default thick stroke (8px) with reversed order (8/4/2)

- **Milestone**: M08 - Feature: Clean viewport capture, fit-to-width editor, crop, step badges and freehand pen
- **Task**: `035`
- **Status**: Completed (`[~]` ready for review)

## Summary of Changes
1. **Clean Viewport Capture (`src/content/capture-injected.ts`, `src/background/capture-orchestrator.ts`)**: Added `hideViewportScrollbarInDom()` and `restoreViewportScrollbarInDom()` and wired them into `captureVisibleViewport()` with guaranteed restoration in `finally` (`FR-09`).
2. **Popup Cleanup (`src/popup/index.ts`, `tests/unit/popup.test.ts`)**: Removed the yellow text highlight footer toggle (`#toggle-highlight`) (`FR-15`).
3. **Default Thick Stroke (`src/shared/constants.ts`)**: Reversed `STROKE_WIDTHS` to `[8, 4, 2]` and set `DEFAULT_USER_SETTINGS.strokeWidth = 8` (`FR-14`).
4. **Tests (`tests/unit/viewport-scrollbar-and-defaults.test.ts`)**: Added 4 unit tests and updated stroke default assertions in existing tests.
