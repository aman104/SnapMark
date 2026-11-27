# Implementation Plan: 039 - Update E2E tests, README and verify full build, unit, E2E and Chrome Web Store package

- **Milestone**: M08 - Feature: Clean viewport capture, fit-to-width editor, crop, step badges and freehand pen
- **Task**: `039`
- **Spec References**: `02-General-PRD.md` (`FR-09`–`FR-15`)

## Changes
1. Update `tests/e2e/extension.spec.ts` to cover the removed popup highlight toggle, default `8px` thick stroke, Step badges (`1, 2, 3`), Freehand Pen, and Crop flow.
2. Update `README.md` with M08 features and updated shortcuts table (`4 = Kroki`, `5 = Pisak`, `C = Kadruj`).
3. Verify `npm run typecheck && npm test && npm run build && npm run test:e2e && npm run package`.
