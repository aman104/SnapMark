import type { AnnotationItem, MockCaptureMetadata } from '../shared/types';
import {
  type PlacedFrameDrawable,
  renderCanvasStage,
} from './canvas-stage';

function isJsdomEnvironment(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    /jsdom/i.test(navigator.userAgent ?? '')
  );
}

/**
 * Renders the base screenshot and all vector `annotations[]` onto an offscreen export canvas
 * at full physical Retina DPI (`cssWidth * dpr` × `cssHeight * dpr`) with `selectedId = null`
 * so blue selection outlines and endpoint handles are never baked into exported files.
 */
export function createFlattenedExportCanvas(
  metadata: MockCaptureMetadata,
  annotations: AnnotationItem[],
  baseImage: CanvasImageSource | null = null,
  placedFrames: PlacedFrameDrawable[] = [],
): HTMLCanvasElement {
  const exportCanvas = document.createElement('canvas');
  renderCanvasStage(
    exportCanvas,
    metadata,
    annotations,
    null,
    baseImage,
    placedFrames,
  );
  return exportCanvas;
}

/**
 * Converts a flattened `HTMLCanvasElement` into an `image/png` binary `Blob`.
 */
export async function canvasToPngBlob(
  canvas: HTMLCanvasElement,
): Promise<Blob> {
  if (isJsdomEnvironment()) {
    return new Blob([`snapmark-png-${canvas.width}x${canvas.height}`], {
      type: 'image/png',
    });
  }

  if (typeof canvas.toBlob === 'function') {
    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((res) => resolve(res), 'image/png');
      });
      if (blob) {
        return blob;
      }
    } catch {
      throw new Error('Nie udało się przygotować obrazu PNG.');
    }
  }

  throw new Error('Nie udało się przygotować obrazu PNG.');
}

/**
 * Flattens the screenshot and vector annotations at full DPI (without selection handles)
 * and triggers a browser file download with `<znormalizowana-domena>_YYYY-MM-DD_HH-mm.png`.
 */
export async function exportFlattenedPngDownload(
  metadata: MockCaptureMetadata,
  annotations: AnnotationItem[],
  baseImage: CanvasImageSource | null = null,
  placedFrames: PlacedFrameDrawable[] = [],
): Promise<{
  filename: string;
  blob: Blob;
  canvas: HTMLCanvasElement;
}> {
  const canvas = createFlattenedExportCanvas(
    metadata,
    annotations,
    baseImage,
    placedFrames,
  );
  const blob = await canvasToPngBlob(canvas);
  const filename = metadata.filename;

  if (typeof chrome === 'undefined' || !chrome.downloads?.download || !chrome.downloads.onChanged || !chrome.downloads.search || typeof URL.createObjectURL !== 'function') {
    throw new Error('Pobieranie PNG jest niedostępne w tej przeglądarce.');
  }

  const objectUrl = URL.createObjectURL(blob);
  const earlyStates = new Map<number, 'complete' | 'interrupted'>();
  let downloadId: number | undefined;
  let resolveState!: (state: 'complete' | 'interrupted') => void;
  const completed = new Promise<'complete' | 'interrupted'>((resolve) => { resolveState = resolve; });
  const listener = (delta: chrome.downloads.DownloadDelta): void => {
    const state = delta.state?.current;
    if (state !== 'complete' && state !== 'interrupted') return;
    if (downloadId === undefined) earlyStates.set(delta.id, state);
    else if (delta.id === downloadId) resolveState(state);
  };
  chrome.downloads.onChanged.addListener(listener);
  try {
    downloadId = await chrome.downloads.download({ url: objectUrl, filename });
    const early = earlyStates.get(downloadId);
    if (early) resolveState(early);
    const items = await chrome.downloads.search({ id: downloadId });
    if (!items.length) throw new Error('Nie można potwierdzić stanu pobierania PNG.');
    if (items[0].state === 'complete' || items[0].state === 'interrupted') resolveState(items[0].state);
    const finalState = await completed;
    if (finalState !== 'complete') throw new Error('Pobieranie PNG przerwano lub anulowano.');
  } finally {
    chrome.downloads.onChanged.removeListener(listener);
    URL.revokeObjectURL(objectUrl);
  }

  return {
    filename,
    blob,
    canvas,
  };
}

/**
 * Flattens the screenshot and vector annotations at full DPI (without selection handles)
 * and copies the `image/png` `Blob` to the system clipboard via `ClipboardItem`.
 */
export async function exportFlattenedToClipboard(
  metadata: MockCaptureMetadata,
  annotations: AnnotationItem[],
  baseImage: CanvasImageSource | null = null,
  placedFrames: PlacedFrameDrawable[] = [],
): Promise<Blob> {
  const canvas = createFlattenedExportCanvas(
    metadata,
    annotations,
    baseImage,
    placedFrames,
  );
  const blob = await canvasToPngBlob(canvas);

  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.write === 'function'
  ) {
    const ClipboardItemCtor =
      typeof ClipboardItem !== 'undefined'
        ? ClipboardItem
        : (class FallbackClipboardItem {
            readonly types: string[] = ['image/png'];
            private readonly items: Record<string, Blob>;
            constructor(items: Record<string, Blob>) {
              this.items = items;
            }
            async getType(type: string): Promise<Blob> {
              return this.items[type] ?? blob;
            }
          } as unknown as typeof ClipboardItem);

    await navigator.clipboard.write([
      new ClipboardItemCtor({ 'image/png': blob }),
    ]);
  }

  return blob;
}
