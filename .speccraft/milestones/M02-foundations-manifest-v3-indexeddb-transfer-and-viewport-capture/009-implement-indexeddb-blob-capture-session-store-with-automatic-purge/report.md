# Task 009 report: Implement IndexedDB Blob capture session store with automatic purge

## Changes
- `package.json` & `package-lock.json`: added `fake-indexeddb` to `devDependencies`.
- `src/shared/db.ts`: implemented `openSnapMarkDb`, `saveCaptureSession`, `getCaptureSession`, `deleteCaptureSession`, `consumeCaptureSession` (single-transaction read + immediate delete), `listCaptureSessionIds`, and `cleanupStaleCaptures` (15-minute TTL garbage collection), with native `Blob` structured clone in Chromium and seamless `ArrayBuffer` bridge in JSDOM + `fake-indexeddb`.
- `tests/unit/db.test.ts`: added unit tests verifying binary PNG `Blob` round-trip, immediate record purge on `consumeCaptureSession`, and 15-minute TTL cleanup.

## Verification
- `npm run typecheck` — passed.
- `npm test` — 11 test files passed (39 tests total).
- `npm run build` — passed.
- TC-01 … TC-04: met.

## Deviations from the plan
- none

## Spec impact
- none

## Review fixes
- none

## Assumptions
- none

## Notes for next tasks
- Task 011 (`src/background/capture-orchestrator.ts`) uses `saveCaptureSession` and `cleanupStaleCaptures`.
- Task 013 (`src/editor/index.ts`) uses `consumeCaptureSession(captureId)` to load and immediately delete temporary captures.
