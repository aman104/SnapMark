# Task 009: Implement IndexedDB Blob capture session store with automatic purge

## 1. Summary
- **Task:** 009 - Implement IndexedDB Blob capture session store with automatic purge - Create src/shared/db.ts implementing the SnapMarkDB IndexedDB database (object store captures) as specified in 02-General-PRD.md sections 6.2, 6.3 and 10. Implement saveCaptureSession, getCaptureSession, consumeCaptureSession (which reads the CaptureSession and immediately deletes the temporary record from IndexedDB in a single workflow so zero temporary Blobs linger after loading onto the editor canvas) and cleanupStaleCaptures (deleting orphaned records older than 15 minutes). Add fake-indexeddb to devDependencies so IndexedDB Blob storage runs deterministically in Vitest. The task is done when tests/unit/db.test.ts proves raw Blob saving, immediate deletion upon consumption, and TTL garbage collection of stale captures.
- **Milestone:** M02 - Foundations: Manifest V3, IndexedDB transfer and Viewport capture (type: foundation)
- **Type:** `data`, `infra`
- **Depends on:** 003
- **Parallel:** `exclusive` — adds `fake-indexeddb` to `package.json` `devDependencies` and creates `src/shared/db.ts`
- **Sources:** `02-General-PRD.md §6.2 "Transfer obrazu do edytora"`, `02-General-PRD.md §6.3 "Data Model (CaptureSession)"`, `02-General-PRD.md §10 "Memory & Storage"`, `05-Tech-Stack.md §3 & §5 Decision 2`

## 2. Goal
Implement the high-capacity **IndexedDB** (`SnapMarkDB`, store `captures`) transfer layer that passes raw binary `Blob` screenshots between the Background Service Worker and `editor.html` without URL length limits or `chrome.storage` 10 MB quota bottlenecks, and guarantees **immediate deletion** of temporary data as soon as `editor.html` loads the capture (`consumeCaptureSession`) plus a 15-minute TTL sweep (`cleanupStaleCaptures`).

## 3. Scope
**In scope:**
- Adding `fake-indexeddb` to `devDependencies` in `package.json` for deterministic IndexedDB testing in Vitest
- `src/shared/db.ts`:
  - Database name `SNAPMARK_DB_NAME = 'SnapMarkDB'`, version `1`, object store `CAPTURES_STORE_NAME = 'captures'` with `keyPath: 'id'`
  - `STALE_CAPTURE_TTL_MS = 15 * 60 * 1000` (15 minutes)
  - `openSnapMarkDb(): Promise<IDBDatabase>`
  - `saveCaptureSession(session: CaptureSession): Promise<void>`
  - `getCaptureSession(id: string): Promise<CaptureSession | null>`
  - `deleteCaptureSession(id: string): Promise<void>`
  - `consumeCaptureSession(id: string): Promise<CaptureSession | null>` — reads the `CaptureSession` by `id` and **immediately deletes** the record from `SnapMarkDB.captures` before returning it
  - `cleanupStaleCaptures(maxAgeMs?: number, nowMs?: number): Promise<number>` — scans `SnapMarkDB.captures`, deletes any record whose `capturedAt` timestamp is older than `maxAgeMs` (default 15 minutes), and returns the number of deleted records
  - `listCaptureSessionIds(): Promise<string[]>` (helper for diagnostics and unit tests)
- Unit tests in `tests/unit/db.test.ts` verifying raw `Blob` persistence, immediate deletion on `consumeCaptureSession`, missing-id handling, and 15-minute TTL cleanup

**Out of scope:**
- Connecting `saveCaptureSession` in `background/` (task 011) and `consumeCaptureSession` in `editor/` (task 013)

## 4. Current state and prerequisites
- `CaptureSession` and `CaptureFrame` are defined in `src/shared/types.ts` (Task 003).

## 5. Implementation steps
1. Install `fake-indexeddb` in `devDependencies` (`npm install -D fake-indexeddb`).
2. Create `src/shared/db.ts` implementing `openSnapMarkDb`, `saveCaptureSession`, `getCaptureSession`, `deleteCaptureSession`, `consumeCaptureSession`, `cleanupStaleCaptures`, and `listCaptureSessionIds`.
3. Create `tests/unit/db.test.ts` importing `fake-indexeddb/auto` and testing:
   - saving a `CaptureSession` with a binary PNG `Blob` and reading it back intact;
   - `consumeCaptureSession(id)` returning the session and leaving `getCaptureSession(id) === null` and `listCaptureSessionIds()` empty (`Zero Storage Leak` KPI from `PRD §11`);
   - `cleanupStaleCaptures` deleting records older than 15 minutes while keeping recent records.

## 6. Files

| Path | Action (create / modify) | Purpose |
|---|---|---|
| `package.json` | modify | Add `fake-indexeddb` to `devDependencies` |
| `package-lock.json` | modify | Lockfile update for `fake-indexeddb` |
| `src/shared/db.ts` | create | IndexedDB (`SnapMarkDB`) `Blob` session storage with immediate purge and TTL cleanup |
| `tests/unit/db.test.ts` | create | Unit tests for `Blob` round-trip, `consumeCaptureSession` immediate deletion, and TTL cleanup |

## 7. Contracts and data (if applicable)
- `saveCaptureSession(session: CaptureSession): Promise<void>`
- `getCaptureSession(id: string): Promise<CaptureSession | null>`
- `deleteCaptureSession(id: string): Promise<void>`
- `consumeCaptureSession(id: string): Promise<CaptureSession | null>`
- `cleanupStaleCaptures(maxAgeMs?: number, nowMs?: number): Promise<number>`

## 8. UI details (if applicable)
Not applicable (IndexedDB persistence module).

## 9. Acceptance criteria
- [ ] TC-01: `saveCaptureSession` stores a `CaptureSession` containing `Blob` frames in IndexedDB (`SnapMarkDB.captures`).
- [ ] TC-02: `consumeCaptureSession(id)` returns the stored `CaptureSession` and immediately deletes it from IndexedDB so a subsequent `getCaptureSession(id)` returns `null`.
- [ ] TC-03: `cleanupStaleCaptures()` deletes records older than 15 minutes and leaves fresh records untouched.
- [ ] TC-04: `npm run typecheck && npm test && npm run build` pass with exit code `0`.

## 10. Tests to add or update
- `tests/unit/db.test.ts`: Tests `saveCaptureSession`, `getCaptureSession`, `consumeCaptureSession` immediate purge, and `cleanupStaleCaptures`.

## 11. Verification
- Run from repository root:
  `npm run typecheck && npm test && npm run build`

## 12. Risks and notes
- Close the `IDBDatabase` handle (`db.close()`) after each transaction completes so connections never block database upgrades or test cleanup.
