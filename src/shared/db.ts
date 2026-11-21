import type { CaptureFrame, CaptureSession } from './types';

export const SNAPMARK_DB_NAME = 'SnapMarkDB';
export const SNAPMARK_DB_VERSION = 1;
export const CAPTURES_STORE_NAME = 'captures';
export const STALE_CAPTURE_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface StoredCaptureFrame extends Omit<CaptureFrame, 'blob'> {
  blob?: Blob;
  blobBytes?: ArrayBuffer;
  blobType?: string;
}

interface StoredCaptureSession extends Omit<CaptureSession, 'frames'> {
  frames: StoredCaptureFrame[];
}

const inMemoryFallbackCaptures = new Map<string, CaptureSession>();

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

function isJsdomEnvironment(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    /jsdom/i.test(navigator.userAgent ?? '')
  );
}

async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') {
    return await blob.arrayBuffer();
  }
  return await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () =>
      reject(reader.error ?? new Error('Failed to read Blob as ArrayBuffer'));
    reader.readAsArrayBuffer(blob);
  });
}

async function serializeSessionForIdb(
  session: CaptureSession,
): Promise<StoredCaptureSession> {
  // In real Chromium IndexedDB, raw Blob instances are stored natively via structured clone.
  // In JSDOM + fake-indexeddb, JSDOM's Blob wrapper is not recognized by Node's structuredClone,
  // so we also attach the underlying ArrayBuffer bytes in JSDOM.
  if (!isJsdomEnvironment()) {
    return session as unknown as StoredCaptureSession;
  }

  const frames: StoredCaptureFrame[] = await Promise.all(
    session.frames.map(async (frame) => {
      const blobBytes = await blobToArrayBuffer(frame.blob);
      return {
        scrollYCss: frame.scrollYCss,
        viewportWidthCss: frame.viewportWidthCss,
        viewportHeightCss: frame.viewportHeightCss,
        blobBytes,
        blobType: frame.blob.type || 'image/png',
      };
    }),
  );

  return {
    ...session,
    frames,
  };
}

function deserializeSessionFromIdb(
  stored: StoredCaptureSession | null | undefined,
): CaptureSession | null {
  if (!stored) {
    return null;
  }

  const frames: CaptureFrame[] = (stored.frames ?? []).map((frame) => {
    if (frame.blob instanceof Blob) {
      return {
        blob: frame.blob,
        scrollYCss: frame.scrollYCss,
        viewportWidthCss: frame.viewportWidthCss,
        viewportHeightCss: frame.viewportHeightCss,
      };
    }

    const bytes = frame.blobBytes ?? new ArrayBuffer(0);
    const blob = new Blob([bytes], {
      type: frame.blobType || 'image/png',
    });

    return {
      blob,
      scrollYCss: frame.scrollYCss,
      viewportWidthCss: frame.viewportWidthCss,
      viewportHeightCss: frame.viewportHeightCss,
    };
  });

  return {
    ...stored,
    frames,
  };
}

export function openSnapMarkDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDb()) {
      reject(new Error('IndexedDB is not available in this environment'));
      return;
    }

    const request = indexedDB.open(SNAPMARK_DB_NAME, SNAPMARK_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CAPTURES_STORE_NAME)) {
        db.createObjectStore(CAPTURES_STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error('Failed to open SnapMarkDB'));
    };
  });
}

export async function saveCaptureSession(
  session: CaptureSession,
): Promise<void> {
  if (!hasIndexedDb()) {
    inMemoryFallbackCaptures.set(session.id, session);
    return;
  }

  const recordToStore = await serializeSessionForIdb(session);
  const db = await openSnapMarkDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CAPTURES_STORE_NAME, 'readwrite');
      const store = tx.objectStore(CAPTURES_STORE_NAME);
      store.put(recordToStore);

      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error('Failed to save CaptureSession'));
      tx.onabort = () =>
        reject(tx.error ?? new Error('Save CaptureSession aborted'));
    });
  } finally {
    db.close();
  }
}

export async function getCaptureSession(
  id: string,
): Promise<CaptureSession | null> {
  if (!hasIndexedDb()) {
    return inMemoryFallbackCaptures.get(id) ?? null;
  }

  const db = await openSnapMarkDb();
  try {
    const raw = await new Promise<StoredCaptureSession | null>(
      (resolve, reject) => {
        const tx = db.transaction(CAPTURES_STORE_NAME, 'readonly');
        const store = tx.objectStore(CAPTURES_STORE_NAME);
        const req = store.get(id);

        req.onsuccess = () => {
          resolve((req.result as StoredCaptureSession | undefined) ?? null);
        };
        req.onerror = () =>
          reject(req.error ?? new Error('Failed to read CaptureSession'));
      },
    );
    return deserializeSessionFromIdb(raw);
  } finally {
    db.close();
  }
}

export async function deleteCaptureSession(id: string): Promise<void> {
  if (!hasIndexedDb()) {
    inMemoryFallbackCaptures.delete(id);
    return;
  }

  const db = await openSnapMarkDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CAPTURES_STORE_NAME, 'readwrite');
      const store = tx.objectStore(CAPTURES_STORE_NAME);
      store.delete(id);

      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error('Failed to delete CaptureSession'));
    });
  } finally {
    db.close();
  }
}

/**
 * Reads the CaptureSession by id and immediately deletes the temporary record
 * in the same readwrite transaction so zero temporary Blobs linger in IndexedDB.
 */
export async function consumeCaptureSession(
  id: string,
): Promise<CaptureSession | null> {
  if (!hasIndexedDb()) {
    const existing = inMemoryFallbackCaptures.get(id) ?? null;
    inMemoryFallbackCaptures.delete(id);
    return existing;
  }

  const db = await openSnapMarkDb();
  try {
    const raw = await new Promise<StoredCaptureSession | null>(
      (resolve, reject) => {
        const tx = db.transaction(CAPTURES_STORE_NAME, 'readwrite');
        const store = tx.objectStore(CAPTURES_STORE_NAME);
        const getReq = store.get(id);
        let record: StoredCaptureSession | null = null;

        getReq.onsuccess = () => {
          record = (getReq.result as StoredCaptureSession | undefined) ?? null;
          if (record) {
            store.delete(id);
          }
        };

        tx.oncomplete = () => resolve(record);
        tx.onerror = () =>
          reject(tx.error ?? new Error('Failed to consume CaptureSession'));
        tx.onabort = () =>
          reject(tx.error ?? new Error('Consume CaptureSession aborted'));
      },
    );
    return deserializeSessionFromIdb(raw);
  } finally {
    db.close();
  }
}

export async function listCaptureSessionIds(): Promise<string[]> {
  if (!hasIndexedDb()) {
    return Array.from(inMemoryFallbackCaptures.keys());
  }

  const db = await openSnapMarkDb();
  try {
    return await new Promise<string[]>((resolve, reject) => {
      const tx = db.transaction(CAPTURES_STORE_NAME, 'readonly');
      const store = tx.objectStore(CAPTURES_STORE_NAME);
      const req = store.getAllKeys();

      req.onsuccess = () => {
        resolve((req.result as IDBValidKey[]).map((key) => String(key)));
      };
      req.onerror = () =>
        reject(req.error ?? new Error('Failed to list CaptureSession keys'));
    });
  } finally {
    db.close();
  }
}

export async function cleanupStaleCaptures(
  maxAgeMs: number = STALE_CAPTURE_TTL_MS,
  nowMs: number = Date.now(),
): Promise<number> {
  if (!hasIndexedDb()) {
    let deletedCount = 0;
    for (const [id, session] of inMemoryFallbackCaptures.entries()) {
      const capturedMs = Date.parse(session.capturedAt);
      if (!Number.isFinite(capturedMs) || nowMs - capturedMs > maxAgeMs) {
        inMemoryFallbackCaptures.delete(id);
        deletedCount += 1;
      }
    }
    return deletedCount;
  }

  const db = await openSnapMarkDb();
  try {
    return await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(CAPTURES_STORE_NAME, 'readwrite');
      const store = tx.objectStore(CAPTURES_STORE_NAME);
      const getAllReq = store.getAll();
      let deletedCount = 0;

      getAllReq.onsuccess = () => {
        const records = (getAllReq.result as StoredCaptureSession[]) ?? [];
        for (const session of records) {
          const capturedMs = Date.parse(session.capturedAt);
          if (!Number.isFinite(capturedMs) || nowMs - capturedMs > maxAgeMs) {
            store.delete(session.id);
            deletedCount += 1;
          }
        }
      };

      tx.oncomplete = () => resolve(deletedCount);
      tx.onerror = () =>
        reject(tx.error ?? new Error('Failed to cleanup stale captures'));
    });
  } finally {
    db.close();
  }
}
