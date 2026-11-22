import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  cleanupStaleCaptures,
  consumeCaptureSession,
  deleteCaptureSession,
  getCaptureSession,
  listCaptureSessionIds,
  saveCaptureSession,
  STALE_CAPTURE_TTL_MS,
} from '../../src/shared/db';
import type { CaptureSession } from '../../src/shared/types';

function createSampleSession(
  id: string,
  capturedAt: string = new Date().toISOString(),
): CaptureSession {
  const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const blob = new Blob([pngBytes], { type: 'image/png' });

  return {
    id,
    mode: 'viewport',
    sourceUrl: 'https://domena.pl/artykul',
    sourceDomain: 'domena-pl',
    capturedAt,
    dpr: 2,
    frames: [
      {
        blob,
        scrollYCss: 0,
        viewportWidthCss: 1440,
        viewportHeightCss: 900,
      },
    ],
    totalWidthCss: 1440,
    totalHeightCss: 900,
  };
}

describe('Task 009: IndexedDB Blob capture session store with automatic purge', () => {
  beforeEach(async () => {
    const ids = await listCaptureSessionIds();
    for (const id of ids) {
      await deleteCaptureSession(id);
    }
  });

  it('saves and retrieves a CaptureSession with a binary PNG Blob in SnapMarkDB', async () => {
    const session = createSampleSession('cap_test_save_1');
    await saveCaptureSession(session);

    const retrieved = await getCaptureSession('cap_test_save_1');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe('cap_test_save_1');
    expect(retrieved?.sourceDomain).toBe('domena-pl');
    expect(retrieved?.dpr).toBe(2);
    expect(retrieved?.frames.length).toBe(1);
    expect(retrieved?.frames[0]?.blob).toBeInstanceOf(Blob);
    expect(retrieved?.frames[0]?.blob.type).toBe('image/png');
    expect(retrieved?.frames[0]?.blob.size).toBe(8);
  });

  it('immediately deletes the temporary record from IndexedDB upon consumeCaptureSession', async () => {
    const session = createSampleSession('cap_test_consume_1');
    await saveCaptureSession(session);

    const consumed = await consumeCaptureSession('cap_test_consume_1');
    expect(consumed).not.toBeNull();
    expect(consumed?.id).toBe('cap_test_consume_1');
    expect(consumed?.frames[0]?.blob.size).toBe(8);

    // Record must be purged immediately so 0 MB lingers in IndexedDB
    const afterConsume = await getCaptureSession('cap_test_consume_1');
    expect(afterConsume).toBeNull();
    expect(await listCaptureSessionIds()).toEqual([]);

    // Second consume on already-purged id returns null cleanly
    expect(await consumeCaptureSession('cap_test_consume_1')).toBeNull();
  });

  it('cleans up orphaned records older than 15 minutes while preserving fresh captures', async () => {
    const nowMs = Date.parse('2026-11-21T14:30:00.000Z');
    const staleTimestamp = new Date(
      nowMs - STALE_CAPTURE_TTL_MS - 60_000,
    ).toISOString(); // 16 min ago
    const freshTimestamp = new Date(nowMs - 2 * 60_000).toISOString(); // 2 min ago

    await saveCaptureSession(createSampleSession('cap_stale_1', staleTimestamp));
    await saveCaptureSession(
      createSampleSession('cap_stale_2', 'invalid-date'),
    );
    await saveCaptureSession(createSampleSession('cap_fresh_1', freshTimestamp));

    const deletedCount = await cleanupStaleCaptures(
      STALE_CAPTURE_TTL_MS,
      nowMs,
    );
    expect(deletedCount).toBe(2);

    expect(await getCaptureSession('cap_stale_1')).toBeNull();
    expect(await getCaptureSession('cap_stale_2')).toBeNull();
    expect(await getCaptureSession('cap_fresh_1')).not.toBeNull();
  });
});
