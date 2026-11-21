# Task 003 report: Create shared types, constants and mock capture fixtures

## Changes
- `src/shared/types.ts`: defined core domain types (`CaptureMode`, `EditorTool`, `LineSubtype`, `TextStyleMode`, `StrokeWidth`, `AnnotationColor`, `ArrowAnnotation`, `LineAnnotation`, `TextAnnotation`, `AnnotationItem`, `CaptureSession`, `UserSettings`, `PopupPrototypeState`, `EditorPrototypeState`, `MockCaptureMetadata`).
- `src/shared/constants.ts`: defined `ANNOTATION_COLORS` (6 swatches starting with `#FF3B30`), `STROKE_WIDTHS` (`2`, `4`, `8`), `DEFAULT_USER_SETTINGS`, `SELECTION_PADDING_PX = 20`, `SCROLL_CAPTURE_THROTTLE_MS = 550`, `HIGHLIGHTER_ALPHA = 0.35`, `MAX_CANVAS_HEIGHT = 16384`.
- `src/shared/mock-captures.ts`: implemented URL state parsers (`parsePopupStateFromSearch`, `parseEditorStateFromSearch`), mock capture metadata (`getMockCaptureMetadata`), sample vector annotations (`getInitialMockAnnotations`), and deterministic 2D canvas screenshot generator (`renderMockScreenshotBackdrop`).
- `tests/unit/mock-captures.test.ts`: added unit tests for constants, defaults, URL state parsers, and mock capture fixtures.

## Verification
- `npm run typecheck` — passed.
- `npm test` — 3 test files passed (11 tests total).
- `npm run build` — passed.
- TC-01 … TC-05: met.

## Deviations from the plan
- none

## Spec impact
- none

## Review fixes
- none

## Assumptions
- none

## Notes for next tasks
- `src/popup/index.ts` (Task 004) should import `parsePopupStateFromSearch` from `src/shared/mock-captures.ts`.
- `src/editor/index.ts` and `src/editor/canvas-stage.ts` (Tasks 005–006) should import `parseEditorStateFromSearch`, `getMockCaptureMetadata`, `getInitialMockAnnotations`, and `renderMockScreenshotBackdrop` from `src/shared/mock-captures.ts`.
