# M07 - Feature: Reliable capture and streamlined editor

[x] 029 - Fix full-page capture starting position - Reproduce capture from mid-page including smooth scrolling and ensure the first rendered frame is captured at the actual page top, as required by PRD FR-01. Preserve accurate subsequent frame positions and restore original position and styles on success, failure and cancellation. Add regression coverage and a real Chromium verification.

[x] 030 - Simplify editor toolbar and add close action - Implement PRD FR-02 and FR-07 with a compact responsive toolbar without filename, dimensions or clipboard export. Retain automatic PNG names, clipboard paste and annotation controls; add an accessible editor-tab close button. Verify layout, actions and existing editor states.

[x] 031 - Improve arrows and annotation deselection - Implement PRD FR-03 and FR-04 with a recognizable connected arrow shaft and filled arrowhead, oriented along the drag and faithfully exported. Clicking empty canvas deselects while dragging still draws; selecting, moving and editing handles remain functional. Add regression tests for appearance, interactions and export.

[x] 032 - Repair interactive text annotations - Reproduce the reported text entry failure in a real Chromium extension and correct focus, placement and input under PRD FR-05. Verify creating, committing, editing, moving and exporting text and preserve keyboard and other annotation behavior. Add a regression test that exercises the real user interaction.

[x] 033 - Close editor after confirmed PNG download - Implement PRD FR-06 using a browser-supported mechanism to identify and confirm completion of the editor's own PNG download. Close only on success; keep annotations and show feedback on failure or cancellation, documenting any required minimal permission. Verify successful and unsuccessful downloads and preserve automatic naming.

[ ] 034 - Verify integrated Chromium workflow and package - Exercise PRD FR-08 in a real Chromium extension: full-page capture from mid-scroll, annotation and deselection, text entry, PNG completion and both close paths. Verify unchanged capture modes and clipboard paste and update README and release checks. Run typecheck, unit tests, build, E2E and package and record any environment limitations honestly.
