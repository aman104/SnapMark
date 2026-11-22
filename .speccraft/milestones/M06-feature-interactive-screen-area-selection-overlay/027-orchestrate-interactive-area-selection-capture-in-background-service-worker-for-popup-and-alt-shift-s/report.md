# Task Report: 027 - Orchestrate interactive area selection capture in Background Service Worker for popup and Alt+Shift+S

- **Milestone**: M06 - Feature: Interactive screen area selection overlay (Zaznacz fragment ekranu)
- **Task**: `027` - Orchestrate interactive area selection capture in Background Service Worker for popup and Alt+Shift+S
- **Status**: Completed (`[~]` ready for review)
- **Branch**: `task/027-orchestrate-interactive-area-selection-capture-in-background-service-worker-for-popup-and-alt-shift-s`

## Summary of Changes

1. **Interactive Screen Area Orchestration (`src/background/capture-orchestrator.ts`)**:
   - Implemented `captureInteractiveArea(providedTab, rateLimiter, now)` which injects `selectAreaOverlayInDom` on the active tab, handles user cancellation (`Escape` / `< 8×8 px` drag) cleanly without opening `editor.html`, captures the visible tab via `CaptureRateLimiter`, stores the `CaptureSession` with `cropRectCss` in IndexedDB (`SnapMarkDB.captures`), and opens `editor.html?captureId=<id>`.
   - Extended `handleCaptureTrigger` with `{ interactiveArea?: boolean }` so popup triggers and `Alt+Shift+S` run `captureInteractiveArea`, while PPM context menu triggers on selected text (`contexts: ["selection"]`) continue running `captureTextSelection`.
2. **Background Listeners (`src/background/index.ts`, `src/shared/types.ts`)**:
   - Wired `Alt+Shift+S` (`command: 'capture-selection'`) and runtime `SNAPMARK_TRIGGER_CAPTURE` (`mode: 'selection'`) to pass `interactiveArea: true`.
3. **Unit Tests (`tests/unit/background-area-capture.test.ts`)**:
   - Verified interactive area capture orchestration, IndexedDB `cropRectCss` storage, `editor.html` launch, clean cancellation handling, and context-menu text selection routing (3/3 tests passing).

## Verification

- `npm run typecheck`: 0 errors
- `npm test`: 95/95 tests passed, including 3 area capture tests
- `npm run build`: passed
