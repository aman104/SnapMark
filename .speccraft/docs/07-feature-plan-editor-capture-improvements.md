# Feature Plan: Editor and full-page capture improvements

## 1. Overview

Request 2026-11-22: fix full-page capture starting at the current scroll position, simplify the editor toolbar, remove clipboard export, improve arrow rendering, close the editor after PNG download, provide a close button, allow deselecting arrows and lines, and fix text entry. The supplied screenshots show the current toolbar and the reported arrow appearance.

## 2. Impact analysis

- **Affected code:** `src/content/capture-injected.ts` (`prepareFullPageScrollInDom`, scrolling and restoration), `src/background/capture-orchestrator.ts` (`captureFullPageScroll`), `src/editor/index.ts` (toolbar, selection, text, download and close), `src/editor/canvas-stage.ts` (arrow rendering), `src/editor/text-overlay.ts`, `src/editor/exporter.ts`, `src/styles/editor.css`, `public/manifest.json` if download completion observation requires permission. Update relevant tests and `README.md`.
- **Current observations:** The full-page preparation already calls `scrollTo(0, 0)`, but the first frame is captured without checking that scrolling finished or confirming its actual position; smooth scrolling and page behavior need investigation. The text tool creates a textarea in code; reproduce the failure in an actual extension before choosing a fix. Arrow rendering draws a round-ended shaft through a filled triangular head; the screenshot is evidence of unsatisfactory appearance, not a verified desired design.
- **Data and schema changes:** none; retain existing annotation and capture contracts and automatic filename generation.
- **API / contract changes:** remove clipboard export from the editor UI; keep clipboard paste for the empty editor. Add a close action. If true browser download completion requires `chrome.downloads` and a new `downloads` permission, review and justify the permission; triggering an anchor download or generating a blob is not proof of completion. Keep the editor open and show an error if a download fails or is cancelled.
- **Risks:** full-page capture may duplicate/omit frames or fail to restore the source scroll and styles; cover smooth scroll, first frame, abort and restoration. Closing prematurely could lose edits; verify real completion and preserve the tab on failure/cancellation. Changes to hit testing must preserve drawing, selecting, dragging, handles, text entry, undo and export. Verify toolbar at narrow window widths and in a real Chromium extension, as existing E2E mocks Chrome APIs.

## 3. Specification changes

| Document | Section | Change |
|---|---|---|
| `02-General-PRD.md` | §4.4–4.5, §5–7, §9 | Require confirmed top-of-page first frame and restoration; define compact toolbar, recognizable arrow, deselection and working text; replace clipboard export with PNG download followed by closing only upon confirmed completion, plus explicit close action. Preserve automatic filenames and clipboard paste. Mark replaced clipboard export requirements superseded. |
| `04-Interface-spec.md` | full-page journey, §5.2 editor, export and interaction states | Update toolbar layout, arrow/line deselection, text editing, download success/failure and close behavior. |
| `03-Design.md` | toolbar and actions | Remove filename/dimensions display and clipboard CTA from toolbar; define compact layout, PNG primary action and accessible close button. |
| `05-Tech-Stack.md` | extension permissions and export architecture | Document download-completion strategy and any justified permission only if required. |

## 4. Implementation outline

1. Reproduce scrolling from a mid-page position in Chromium, including smooth scrolling; ensure first capture occurs at the actual top after rendering, subsequent positions are accurate, and original scroll and styles are restored even on cancellation or error.
2. Simplify toolbar: remove filename/dimensions and clipboard export, retain annotation tools and controls, promote PNG download, add an accessible close button, and adapt to narrower windows. Keep automatic filenames and clipboard paste.
3. Render a clearly recognizable arrow with connected shaft and proportional filled arrowhead, oriented in the direction of the drag, preserving selection handles and export fidelity. Screenshot shows the current complaint; use a conventional arrow unless the user requests a different shape.
4. Let a click on empty canvas deselect an existing arrow or line without accidentally creating a zero-length annotation; preserve normal click-and-drag drawing and allow reselection and editing.
5. Reproduce and fix text-tool entry in the actual extension: click canvas, focus and type, commit, edit and export, with correct overlay placement and keyboard behavior.
6. Close the editor only once the browser confirms the corresponding PNG download completed; keep it open on failure or cancellation. The separate close button closes the editor tab. Test the real browser lifecycle and communicate failures.
7. Cover regressions with unit and real Chromium extension tests, including full-page capture from mid-scroll, drawing and editing, text, PNG and tab closure. Run typecheck, unit suite, build, E2E and packaging.

## 5. Rollback and safety

No data migration or feature flag. Revert the milestone merge if necessary. Do not close the editor on export failure or cancellation; retain its annotations for retry. Restore page state after capture in all paths. Preserve clipboard paste independently of removing export.

## 6. Milestone(s)

Proposed **M07 — Feature: reliable capture and streamlined editor**, phase 8+ Evolution, after M06. Demo: start full-page capture halfway down a page; annotate with arrows, lines and text; deselect and reselect; download the PNG and confirm the editor closes; independently close another editor. Acceptance requires the requested behaviors and regression tests, including actual Chromium extension verification. No milestone is appended until the user approves this plan.
