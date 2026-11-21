import {
  ANNOTATION_COLORS,
  DEFAULT_USER_SETTINGS,
  HIGHLIGHTER_ALPHA,
  HIGHLIGHTER_STROKE_WIDTH_CSS,
  STROKE_WIDTHS,
} from '../shared/constants';
import { consumeCaptureSession } from '../shared/db';
import { formatCaptureFilename } from '../shared/filename';
import {
  getInitialMockAnnotations,
  getMockCaptureMetadata,
  parseEditorStateFromSearch,
} from '../shared/mock-captures';
import { loadUserSettings, updateUserSettings } from '../shared/settings';
import type {
  AnnotationColor,
  AnnotationItem,
  ArrowAnnotation,
  CaptureMode,
  EditorPrototypeState,
  EditorTool,
  LineAnnotation,
  LineSubtype,
  MockCaptureMetadata,
  StrokeWidth,
  TextStyleMode,
} from '../shared/types';
import {
  buildSessionCompositePlacements,
  decodeBlobToDrawable,
  type FramePlacementPlan,
  hitTestAnnotations,
  type PlacedFrameDrawable,
  renderCanvasStage,
} from './canvas-stage';
import { cloneAnnotationList, UndoHistoryStack } from './history';
import {
  applyShiftHorizontalLock,
  type EndpointHandleRole,
  hitTestEndpointHandle,
  moveAnnotationByDelta,
  type Point2D,
  updateAnnotationEndpoint,
} from './vector-engine';

export interface EditorState {
  prototypeState: EditorPrototypeState;
  captureMode: CaptureMode;
  metadata: MockCaptureMetadata;
  activeTool: EditorTool;
  lineSubtype: LineSubtype;
  activeColor: AnnotationColor;
  strokeWidth: StrokeWidth;
  textStyleMode: TextStyleMode;
  annotations: AnnotationItem[];
  historyStack: AnnotationItem[][];
  selectedAnnotationId: string | null;
  copySuccess: boolean;
  warningDismissed: boolean;
  isLiveCapture: boolean;
  framePlacements: FramePlacementPlan[];
}

export interface InitEditorOptions {
  initialSearch?: string;
  onStateChange?: (state: EditorState) => void;
  onDownloadPng?: (filename: string, state: EditorState) => void;
}

export interface EditorController {
  getState: () => EditorState;
  setTool: (tool: EditorTool) => void;
  setColor: (color: AnnotationColor) => void;
  setStrokeWidth: (width: StrokeWidth) => void;
  setLineSubtype: (subtype: LineSubtype) => void;
  setTextStyleMode: (mode: TextStyleMode) => void;
  selectAnnotation: (id: string | null) => void;
  undo: () => void;
  deleteSelected: () => void;
  loadSampleCapture: (mode?: CaptureMode) => void;
  loadImageBlob: (blob: Blob, sourceLabel?: string) => Promise<void>;
  ready: Promise<void>;
}

function cloneAnnotations(items: AnnotationItem[]): AnnotationItem[] {
  return cloneAnnotationList(items);
}

type ActiveCanvasInteraction =
  | {
      kind: 'handle';
      itemId: string;
      handle: EndpointHandleRole;
      snapshotPushed: boolean;
    }
  | {
      kind: 'move';
      itemId: string;
      lastPoint: Point2D;
      snapshotPushed: boolean;
    }
  | {
      kind: 'draw';
      tool: 'arrow' | 'line';
      newId: string;
      startPoint: Point2D;
      snapshotPushed: boolean;
    };

export function initEditor(
  container: HTMLElement,
  options: InitEditorOptions = {},
): EditorController {
  const initialSearch =
    options.initialSearch ??
    (typeof window !== 'undefined' ? window.location.search : '');

  const searchParams = new URLSearchParams(initialSearch);
  const captureIdParam = searchParams.get('captureId');
  const parsed = parseEditorStateFromSearch(initialSearch);
  const initialMetadata = getMockCaptureMetadata(
    parsed.mode,
    parsed.highlightApplied,
  );
  const initialAnnotations =
    parsed.state === 'empty' || Boolean(captureIdParam)
      ? []
      : getInitialMockAnnotations(parsed.mode);

  const state: EditorState = {
    prototypeState: parsed.state,
    captureMode: parsed.mode,
    metadata: initialMetadata,
    activeTool: DEFAULT_USER_SETTINGS.activeTool,
    lineSubtype: 'highlighter',
    activeColor: DEFAULT_USER_SETTINGS.activeColor,
    strokeWidth: DEFAULT_USER_SETTINGS.strokeWidth,
    textStyleMode: DEFAULT_USER_SETTINGS.textStyleMode,
    annotations: cloneAnnotations(initialAnnotations),
    historyStack:
      initialAnnotations.length > 0
        ? [cloneAnnotations(initialAnnotations.slice(0, -1))]
        : [],
    selectedAnnotationId: initialAnnotations[0]?.id ?? null,
    copySuccess: false,
    warningDismissed: false,
    isLiveCapture: Boolean(captureIdParam),
    framePlacements: [],
  };

  let baseDrawable: CanvasImageSource | null = null;
  let placedFrameDrawables: PlacedFrameDrawable[] = [];
  let copyResetTimeout: ReturnType<typeof setTimeout> | null = null;
  let activeInteraction: ActiveCanvasInteraction | null = null;
  let lastProcessedMoveEvent: MouseEvent | null = null;
  let lastProcessedUpEvent: MouseEvent | null = null;
  let annotationSeq = 0;

  const historyManager = new UndoHistoryStack(state.historyStack);

  function syncHistoryState(): void {
    state.historyStack = historyManager.getSnapshots();
  }

  function pushHistorySnapshot(): void {
    historyManager.pushSnapshot(state.annotations);
    syncHistoryState();
  }

  function redrawCanvasOnly(): void {
    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas');
    if (canvas) {
      renderCanvasStage(
        canvas,
        state.metadata,
        state.annotations,
        state.selectedAnnotationId,
        baseDrawable,
        placedFrameDrawables,
      );
    }
  }

  function syncToolbarWithSelectedAnnotation(): void {
    if (!state.selectedAnnotationId) {
      return;
    }
    const selected = state.annotations.find(
      (item) => item.id === state.selectedAnnotationId,
    );
    if (!selected) {
      return;
    }
    state.activeTool = selected.type;
    state.activeColor = selected.color;
    if (selected.type === 'arrow') {
      state.strokeWidth = selected.strokeWidth;
    } else if (selected.type === 'line') {
      state.lineSubtype = selected.subtype;
      if (
        selected.strokeWidth === 2 ||
        selected.strokeWidth === 4 ||
        selected.strokeWidth === 8
      ) {
        state.strokeWidth = selected.strokeWidth;
      }
    } else if (selected.type === 'text') {
      state.textStyleMode = selected.styleMode;
    }
  }

  function notifyAndRender(): void {
    render();
    options.onStateChange?.(state);
  }

  function renderContextualPropertiesHtml(): string {
    const swatchesHtml = ANNOTATION_COLORS.map(
      (swatch) => `
        <button
          type="button"
          class="color-swatch ${state.activeColor === swatch.hex ? 'is-active' : ''}"
          data-color="${swatch.hex}"
          style="background-color: ${swatch.hex};"
          title="${swatch.label}"
          aria-label="Kolor ${swatch.label}"
          aria-pressed="${state.activeColor === swatch.hex ? 'true' : 'false'}"
        ></button>
      `,
    ).join('');

    const showStrokeWidth =
      state.activeTool === 'arrow' ||
      (state.activeTool === 'line' && state.lineSubtype === 'underline');

    const strokeWidthHtml = showStrokeWidth
      ? `
        <div id="stroke-width-picker" class="segmented-control" role="group" aria-label="Grubość linii">
          ${STROKE_WIDTHS.map(
            (sw) => `
              <button
                type="button"
                class="segmented-option ${state.strokeWidth === sw.value ? 'is-active' : ''}"
                data-stroke-width="${sw.value}"
                aria-pressed="${state.strokeWidth === sw.value ? 'true' : 'false'}"
              >
                ${sw.shortLabel}
              </button>
            `,
          ).join('')}
        </div>
      `
      : '';

    const lineSubtypeHtml =
      state.activeTool === 'line'
        ? `
        <div id="line-subtype-picker" class="segmented-control" role="group" aria-label="Tryb linii i markera">
          <button
            type="button"
            class="segmented-option ${state.lineSubtype === 'underline' ? 'is-active' : ''}"
            data-line-subtype="underline"
            aria-pressed="${state.lineSubtype === 'underline' ? 'true' : 'false'}"
          >
            Podkreślenie
          </button>
          <button
            type="button"
            class="segmented-option ${state.lineSubtype === 'highlighter' ? 'is-active' : ''}"
            data-line-subtype="highlighter"
            aria-pressed="${state.lineSubtype === 'highlighter' ? 'true' : 'false'}"
          >
            Zakreślacz
          </button>
        </div>
        <span id="shift-axis-hint" class="shift-hint-pill" title="Przytrzymaj klawisz Shift, aby wymusić idealny poziom">
          <kbd class="kbd-badge">Shift</kbd> = poziom
        </span>
      `
        : '';

    const textStyleHtml =
      state.activeTool === 'text'
        ? `
        <div id="text-style-picker" class="segmented-control" role="group" aria-label="Tryb czytelności tekstu">
          <button
            type="button"
            class="segmented-option ${state.textStyleMode === 'background' ? 'is-active' : ''}"
            data-text-style="background"
            aria-pressed="${state.textStyleMode === 'background' ? 'true' : 'false'}"
          >
            Tło
          </button>
          <button
            type="button"
            class="segmented-option ${state.textStyleMode === 'outline' ? 'is-active' : ''}"
            data-text-style="outline"
            aria-pressed="${state.textStyleMode === 'outline' ? 'true' : 'false'}"
          >
            Obrys
          </button>
          <button
            type="button"
            class="segmented-option ${state.textStyleMode === 'plain' ? 'is-active' : ''}"
            data-text-style="plain"
            aria-pressed="${state.textStyleMode === 'plain' ? 'true' : 'false'}"
          >
            Czysty
          </button>
        </div>
      `
        : '';

    return `
      <div id="color-picker" class="color-swatch-tray" role="group" aria-label="Paleta kolorów adnotacji">
        ${swatchesHtml}
      </div>
      ${strokeWidthHtml}
      ${lineSubtypeHtml}
      ${textStyleHtml}
    `;
  }

  function renderStageHtml(): string {
    if (state.prototypeState === 'empty') {
      return `
        <section id="editor-empty-state" class="editor-empty-card" aria-labelledby="empty-state-heading">
          <div class="empty-state-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6V3h3M10 3h3v3M13 10v3h-3M6 13H3v-3" />
              <path d="M6 10l4-4M10 10V6H6" />
            </svg>
          </div>
          <h1 id="empty-state-heading" class="empty-state-title">
            Brak aktywnego zrzutu na płótnie
          </h1>
          <p class="empty-state-description">
            Zrzuty tymczasowe są usuwane z pamięci zaraz po wczytaniu dla ochrony prywatności. Wykonaj nowy zrzut z menu kontekstowego (PPM), popupu wtyczki lub wklej obraz bezpośrednio ze schowka.
          </p>
          <div class="empty-state-actions">
            <button type="button" id="btn-paste-clipboard" class="btn-primary">
              Wklej ze schowka (Ctrl+V)
            </button>
            <button type="button" id="btn-open-file" class="btn-secondary">
              Wczytaj plik PNG/JPG...
            </button>
            <input type="file" id="input-open-file" accept="image/*" hidden />
          </div>
        </section>
      `;
    }

    const showMaxHeightBanner =
      state.prototypeState === 'max-height-warning' && !state.warningDismissed;

    const warningBannerHtml = showMaxHeightBanner
      ? `
        <div class="editor-banner-region">
          <div id="max-height-banner" class="status-banner is-warning" role="status">
            <span>
              Osiągnięto maksymalną bezpieczną wysokość płótna w pełnej rozdzielczości Retina. Zrzut został zapisany do tej wysokości.
            </span>
            <button type="button" id="btn-dismiss-warning" class="banner-dismiss-btn">
              Zamknij
            </button>
          </div>
        </div>
      `
      : '';

    return `
      ${warningBannerHtml}
      <div class="canvas-wrapper" id="canvas-wrapper">
        <canvas id="editor-canvas"></canvas>
        <div id="text-overlay-layer"></div>
      </div>
    `;
  }

  function render(): void {
    const canUndo = state.historyStack.length > 0;
    const hasSelection = state.selectedAnnotationId !== null;
    const isEmptyState = state.prototypeState === 'empty';

    container.innerHTML = `
      <div class="editor-shell" data-editor-state="${state.prototypeState}" data-capture-mode="${state.captureMode}">
        <header class="editor-toolbar" role="toolbar" aria-label="Pasek narzędzi edytora SnapMark">
          <div class="toolbar-left-group">
            <!-- Cluster 1: Brand & Capture Metadata -->
            <div class="toolbar-cluster" id="cluster-brand-meta">
              <div class="brand-badge">
                <span class="brand-logo" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6V3h3M10 3h3v3M13 10v3h-3M6 13H3v-3" />
                    <path d="M6 10l4-4M10 10V6H6" />
                  </svg>
                </span>
                <span class="brand-title">SnapMark</span>
              </div>
              <div class="capture-meta-pill">
                <span id="meta-filename" class="meta-filename" title="${state.metadata.filename}">
                  ${state.metadata.filename}
                </span>
                <span id="meta-dimensions" class="meta-dimensions">
                  ${state.metadata.cssWidth}×${state.metadata.cssHeight} • @${state.metadata.dpr}x
                </span>
              </div>
            </div>

            <span class="toolbar-divider" aria-hidden="true"></span>

            <!-- Cluster 2: Primary Vector Tools -->
            <div class="toolbar-cluster" id="cluster-primary-tools" role="group" aria-label="Narzędzia rysowania">
              <button
                type="button"
                id="tool-arrow"
                class="toolbar-tool-btn ${state.activeTool === 'arrow' ? 'is-active' : ''}"
                aria-pressed="${state.activeTool === 'arrow' ? 'true' : 'false'}"
                title="Strzałka wektorowa (1)"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M3 13L13 3M13 3H7M13 3v6" />
                </svg>
                <span>Strzałka</span>
                <kbd class="kbd-badge">1</kbd>
              </button>

              <button
                type="button"
                id="tool-line"
                class="toolbar-tool-btn ${state.activeTool === 'line' ? 'is-active' : ''}"
                aria-pressed="${state.activeTool === 'line' ? 'true' : 'false'}"
                title="Podkreślenie i zakreślacz (2)"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M2.5 13.5h11M4 9.5l5.5-5.5 2.5 2.5L6.5 12H4V9.5z" />
                </svg>
                <span>Linia / Marker</span>
                <kbd class="kbd-badge">2</kbd>
              </button>

              <button
                type="button"
                id="tool-text"
                class="toolbar-tool-btn ${state.activeTool === 'text' ? 'is-active' : ''}"
                aria-pressed="${state.activeTool === 'text' ? 'true' : 'false'}"
                title="Pole tekstowe (3)"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M3 3.5h10M8 3.5v9M5.5 12.5h5" />
                </svg>
                <span>Tekst</span>
                <kbd class="kbd-badge">3</kbd>
              </button>
            </div>
          </div>

          <div class="toolbar-center-group">
            <span class="toolbar-divider" aria-hidden="true"></span>

            <!-- Cluster 3: Contextual Style & Property Controls -->
            <div class="toolbar-cluster toolbar-cluster-properties" id="cluster-contextual-props">
              ${renderContextualPropertiesHtml()}
            </div>
          </div>

          <div class="toolbar-right-group">
            <span class="toolbar-divider" aria-hidden="true"></span>

            <!-- Cluster 4: History & Export Actions -->
            <div class="toolbar-cluster" id="cluster-history-export">
              <button
                type="button"
                id="btn-undo"
                class="btn-secondary"
                ${canUndo ? '' : 'disabled'}
                title="Cofnij ostatnią zmianę (Ctrl+Z)"
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M3.5 6.5h6a3.5 3.5 0 1 1 0 7H6M3.5 6.5L6 4M3.5 6.5L6 9" />
                </svg>
                <span>Cofnij</span>
                <kbd class="kbd-badge">Ctrl+Z</kbd>
                <span id="undo-count" class="undo-count-badge">${state.historyStack.length}</span>
              </button>

              <button
                type="button"
                id="btn-delete-selected"
                class="btn-danger-ghost"
                ${hasSelection ? '' : 'disabled'}
                title="Usuń zaznaczony obiekt (Delete / Backspace)"
                aria-label="Usuń zaznaczony obiekt"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M3 4.5h10M6.5 4.5V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.5M4.5 4.5l.6 8.5a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.6-8.5" />
                </svg>
              </button>

              <button
                type="button"
                id="btn-download-png"
                class="btn-secondary"
                ${isEmptyState ? 'disabled' : ''}
                title="Pobierz spłaszczony plik PNG"
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M8 2.5v7.5m0 0L5.5 7.5M8 10l2.5-2.5M3 12.5h10" />
                </svg>
                <span>Pobierz PNG</span>
              </button>

              <button
                type="button"
                id="btn-copy-clipboard"
                class="btn-primary ${state.copySuccess ? 'is-success' : ''}"
                ${isEmptyState ? 'disabled' : ''}
                title="Skopiuj obraz do schowka systemowego"
              >
                ${
                  state.copySuccess
                    ? '<span>✓ Skopiowano!</span>'
                    : `
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
                        <path d="M3.5 10.5H3a1.5 1.5 0 0 1-1.5-1.5V3A1.5 1.5 0 0 1 3 1.5h6A1.5 1.5 0 0 1 10.5 3v.5" />
                      </svg>
                      <span>Kopiuj do schowka</span>
                    `
                }
              </button>
            </div>
          </div>
        </header>

        <main class="editor-stage" id="editor-stage">
          ${renderStageHtml()}
        </main>
      </div>
    `;

    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas');
    if (canvas) {
      renderCanvasStage(
        canvas,
        state.metadata,
        state.annotations,
        state.selectedAnnotationId,
        baseDrawable,
        placedFrameDrawables,
      );
    }

    bindToolbarAndStageEvents();
  }

  function setTool(tool: EditorTool): void {
    state.activeTool = tool;
    const matching = state.annotations.find((item) => item.type === tool);
    if (matching) {
      state.selectedAnnotationId = matching.id;
    }
    void updateUserSettings({ activeTool: tool });
    notifyAndRender();
  }

  function setColor(color: AnnotationColor): void {
    state.activeColor = color;
    if (state.selectedAnnotationId) {
      const target = state.annotations.find(
        (item) => item.id === state.selectedAnnotationId,
      );
      if (target && target.color !== color) {
        pushHistorySnapshot();
        target.color = color;
      }
    }
    void updateUserSettings({ activeColor: color });
    notifyAndRender();
  }

  function setStrokeWidth(width: StrokeWidth): void {
    state.strokeWidth = width;
    if (state.selectedAnnotationId) {
      const target = state.annotations.find(
        (item) => item.id === state.selectedAnnotationId,
      );
      if (target && (target.type === 'arrow' || target.type === 'line')) {
        pushHistorySnapshot();
        target.strokeWidth = width;
      }
    }
    void updateUserSettings({ strokeWidth: width });
    notifyAndRender();
  }

  function setLineSubtype(subtype: LineSubtype): void {
    state.lineSubtype = subtype;
    if (state.selectedAnnotationId) {
      const target = state.annotations.find(
        (item) => item.id === state.selectedAnnotationId,
      );
      if (target && target.type === 'line') {
        pushHistorySnapshot();
        target.subtype = subtype;
        target.alpha = subtype === 'highlighter' ? HIGHLIGHTER_ALPHA : 1.0;
        target.strokeWidth =
          subtype === 'highlighter'
            ? HIGHLIGHTER_STROKE_WIDTH_CSS
            : state.strokeWidth;
      }
    }
    notifyAndRender();
  }

  function setTextStyleMode(styleMode: TextStyleMode): void {
    state.textStyleMode = styleMode;
    if (state.selectedAnnotationId) {
      const target = state.annotations.find(
        (item) => item.id === state.selectedAnnotationId,
      );
      if (target && target.type === 'text') {
        pushHistorySnapshot();
        target.styleMode = styleMode;
      }
    }
    void updateUserSettings({ textStyleMode: styleMode });
    notifyAndRender();
  }

  function undo(): void {
    const previous = historyManager.undo();
    if (!previous) {
      return;
    }
    syncHistoryState();
    state.annotations = previous;
    if (
      state.selectedAnnotationId &&
      !state.annotations.some((item) => item.id === state.selectedAnnotationId)
    ) {
      state.selectedAnnotationId = state.annotations[0]?.id ?? null;
    }
    notifyAndRender();
  }

  function deleteSelected(): void {
    if (!state.selectedAnnotationId) {
      return;
    }
    const exists = state.annotations.some(
      (item) => item.id === state.selectedAnnotationId,
    );
    if (!exists) {
      return;
    }
    pushHistorySnapshot();
    state.annotations = state.annotations.filter(
      (item) => item.id !== state.selectedAnnotationId,
    );
    state.selectedAnnotationId = state.annotations[0]?.id ?? null;
    notifyAndRender();
  }

  function loadSampleCapture(mode: CaptureMode = 'viewport'): void {
    baseDrawable = null;
    placedFrameDrawables = [];
    state.framePlacements = [];
    state.isLiveCapture = false;
    state.prototypeState = 'default';
    state.captureMode = mode;
    state.metadata = getMockCaptureMetadata(mode);
    state.annotations = cloneAnnotations(getInitialMockAnnotations(mode));
    historyManager.reset([cloneAnnotations(state.annotations.slice(0, -1))]);
    syncHistoryState();
    state.selectedAnnotationId = state.annotations[0]?.id ?? null;
    notifyAndRender();
  }

  async function loadImageBlob(
    blob: Blob,
    sourceLabel = 'schowek',
  ): Promise<void> {
    const decoded = await decodeBlobToDrawable(blob, 1280, 800);
    baseDrawable = decoded.drawable;
    const dpr = 1;
    const now = new Date();
    state.isLiveCapture = true;
    state.prototypeState = 'default';
    state.metadata = {
      id: `cap_local_${now.getTime()}`,
      mode: 'viewport',
      sourceUrl: `https://${sourceLabel}`,
      sourceDomain: sourceLabel,
      capturedAt: now.toISOString(),
      filename: formatCaptureFilename(sourceLabel, now),
      cssWidth: decoded.physicalWidth,
      cssHeight: decoded.physicalHeight,
      dpr,
      highlightApplied: false,
    };
    state.annotations = [];
    historyManager.reset([]);
    syncHistoryState();
    state.selectedAnnotationId = null;
    notifyAndRender();
  }

  function bindToolbarAndStageEvents(): void {
    container
      .querySelector<HTMLButtonElement>('#tool-arrow')
      ?.addEventListener('click', () => setTool('arrow'));

    container
      .querySelector<HTMLButtonElement>('#tool-line')
      ?.addEventListener('click', () => setTool('line'));

    container
      .querySelector<HTMLButtonElement>('#tool-text')
      ?.addEventListener('click', () => setTool('text'));

    container
      .querySelectorAll<HTMLButtonElement>('.color-swatch')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          const color = btn.dataset.color as AnnotationColor | undefined;
          if (color) {
            setColor(color);
          }
        });
      });

    container
      .querySelectorAll<HTMLButtonElement>('[data-stroke-width]')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          const rawWidth = Number(btn.dataset.strokeWidth) as StrokeWidth;
          if (rawWidth === 2 || rawWidth === 4 || rawWidth === 8) {
            setStrokeWidth(rawWidth);
          }
        });
      });

    container
      .querySelectorAll<HTMLButtonElement>('[data-line-subtype]')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          const subtype = btn.dataset.lineSubtype as LineSubtype | undefined;
          if (subtype) {
            setLineSubtype(subtype);
          }
        });
      });

    container
      .querySelectorAll<HTMLButtonElement>('[data-text-style]')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          const styleMode = btn.dataset.textStyle as TextStyleMode | undefined;
          if (styleMode) {
            setTextStyleMode(styleMode);
          }
        });
      });

    container
      .querySelector<HTMLButtonElement>('#btn-undo')
      ?.addEventListener('click', undo);

    container
      .querySelector<HTMLButtonElement>('#btn-delete-selected')
      ?.addEventListener('click', deleteSelected);

    container
      .querySelector<HTMLButtonElement>('#btn-download-png')
      ?.addEventListener('click', () => {
        if (options.onDownloadPng) {
          options.onDownloadPng(state.metadata.filename, state);
          return;
        }
        const canvas =
          container.querySelector<HTMLCanvasElement>('#editor-canvas');
        if (canvas && typeof canvas.toDataURL === 'function') {
          try {
            const link = document.createElement('a');
            link.download = state.metadata.filename;
            link.href = canvas.toDataURL('image/png');
            link.click();
          } catch {
            // Ignored in non-canvas environments
          }
        }
      });

    container
      .querySelector<HTMLButtonElement>('#btn-copy-clipboard')
      ?.addEventListener('click', () => {
        if (copyResetTimeout) {
          clearTimeout(copyResetTimeout);
        }
        state.copySuccess = true;
        notifyAndRender();

        copyResetTimeout = setTimeout(() => {
          state.copySuccess = false;
          notifyAndRender();
        }, 2000);
      });

    // Empty state actions: Clipboard paste & File picker
    container
      .querySelector<HTMLButtonElement>('#btn-paste-clipboard')
      ?.addEventListener('click', () => {
        if (
          typeof navigator !== 'undefined' &&
          navigator.clipboard &&
          typeof navigator.clipboard.read === 'function'
        ) {
          void navigator.clipboard
            .read()
            .then(async (items) => {
              for (const item of items) {
                const imgType = item.types.find((t) => t.startsWith('image/'));
                if (imgType) {
                  const blob = await item.getType(imgType);
                  await loadImageBlob(blob, 'schowek');
                  return;
                }
              }
              loadSampleCapture(state.captureMode);
            })
            .catch(() => {
              loadSampleCapture(state.captureMode);
            });
          return;
        }
        loadSampleCapture(state.captureMode);
      });

    const fileInput =
      container.querySelector<HTMLInputElement>('#input-open-file');

    container
      .querySelector<HTMLButtonElement>('#btn-open-file')
      ?.addEventListener('click', () => {
        if (fileInput && fileInput.files && fileInput.files.length > 0) {
          const file = fileInput.files[0];
          if (file) {
            void loadImageBlob(file, file.name.replace(/\.[^.]+$/, ''));
            return;
          }
        }
        loadSampleCapture(state.captureMode);
      });

    fileInput?.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (file) {
        void loadImageBlob(file, file.name.replace(/\.[^.]+$/, ''));
      }
    });

    // Max canvas height warning dismissal
    container
      .querySelector<HTMLButtonElement>('#btn-dismiss-warning')
      ?.addEventListener('click', () => {
        state.warningDismissed = true;
        notifyAndRender();
      });

    // Canvas interactive drawing, endpoint handle dragging, and object selection/moving
    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas');
    canvas?.addEventListener('mousedown', handleCanvasMouseDown);
    canvas?.addEventListener('mousemove', handleCanvasMouseMove);
    canvas?.addEventListener('mouseup', handleCanvasMouseUp);
    canvas?.addEventListener('click', (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const cssX = event.clientX - rect.left;
      const cssY = event.clientY - rect.top;
      const hit = hitTestAnnotations(state.annotations, cssX, cssY);
      if (hit && hit.id !== state.selectedAnnotationId) {
        state.selectedAnnotationId = hit.id;
        syncToolbarWithSelectedAnnotation();
        notifyAndRender();
      }
    });
  }

  function getCanvasCssPoint(
    canvas: HTMLCanvasElement | null,
    event: MouseEvent,
  ): Point2D {
    if (!canvas) {
      return { x: event.clientX, y: event.clientY };
    }
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function handleCanvasMouseDown(event: MouseEvent): void {
    if (event.button !== 0) {
      return;
    }
    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas');
    const pt = getCanvasCssPoint(canvas, event);

    // 1. Check if user grabbed an endpoint handle (x1, y1) or (x2, y2) of the selected arrow/line
    if (state.selectedAnnotationId) {
      const selectedItem = state.annotations.find(
        (item) => item.id === state.selectedAnnotationId,
      );
      const hitHandle = hitTestEndpointHandle(selectedItem, pt.x, pt.y);
      if (hitHandle && selectedItem) {
        activeInteraction = {
          kind: 'handle',
          itemId: selectedItem.id,
          handle: hitHandle,
          snapshotPushed: false,
        };
        return;
      }
    }

    // 2. Check if user clicked on an existing annotation body to select or drag it
    const hitBody = hitTestAnnotations(state.annotations, pt.x, pt.y);
    if (hitBody) {
      state.selectedAnnotationId = hitBody.id;
      syncToolbarWithSelectedAnnotation();
      activeInteraction = {
        kind: 'move',
        itemId: hitBody.id,
        lastPoint: pt,
        snapshotPushed: false,
      };
      redrawCanvasOnly();
      return;
    }

    // 3. Otherwise start drawing a new Arrow or 2-in-1 Line/Highlighter
    if (state.activeTool === 'arrow' || state.activeTool === 'line') {
      annotationSeq += 1;
      activeInteraction = {
        kind: 'draw',
        tool: state.activeTool,
        newId: `ann_${state.activeTool}_${Date.now()}_${annotationSeq}`,
        startPoint: pt,
        snapshotPushed: false,
      };
    }
  }

  function handleCanvasMouseMove(event: MouseEvent): void {
    if (!activeInteraction || event === lastProcessedMoveEvent) {
      return;
    }
    lastProcessedMoveEvent = event;

    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas');
    const pt = getCanvasCssPoint(canvas, event);

    if (activeInteraction.kind === 'handle') {
      const targetId = activeInteraction.itemId;
      const idx = state.annotations.findIndex(
        (item) => item.id === targetId,
      );
      const target = idx >= 0 ? state.annotations[idx] : undefined;
      if (
        target &&
        (target.type === 'arrow' || target.type === 'line')
      ) {
        if (!activeInteraction.snapshotPushed) {
          pushHistorySnapshot();
          activeInteraction.snapshotPushed = true;
        }
        state.annotations[idx] = updateAnnotationEndpoint(
          target,
          activeInteraction.handle,
          pt,
          event.shiftKey,
        );
        redrawCanvasOnly();
      }
      return;
    }

    if (activeInteraction.kind === 'move') {
      const dx = pt.x - activeInteraction.lastPoint.x;
      const dy = pt.y - activeInteraction.lastPoint.y;
      if (!activeInteraction.snapshotPushed && Math.hypot(dx, dy) < 2) {
        return;
      }
      const targetId = activeInteraction.itemId;
      const idx = state.annotations.findIndex(
        (item) => item.id === targetId,
      );
      const target = idx >= 0 ? state.annotations[idx] : undefined;
      if (target) {
        if (!activeInteraction.snapshotPushed) {
          pushHistorySnapshot();
          activeInteraction.snapshotPushed = true;
        }
        state.annotations[idx] = moveAnnotationByDelta(target, dx, dy);
        activeInteraction.lastPoint = pt;
        redrawCanvasOnly();
      }
      return;
    }

    if (activeInteraction.kind === 'draw') {
      const dist = Math.hypot(
        pt.x - activeInteraction.startPoint.x,
        pt.y - activeInteraction.startPoint.y,
      );
      if (!activeInteraction.snapshotPushed && dist < 2) {
        return;
      }

      const endPt = applyShiftHorizontalLock(
        activeInteraction.startPoint,
        pt,
        event.shiftKey,
      );

      if (!activeInteraction.snapshotPushed) {
        pushHistorySnapshot();
        activeInteraction.snapshotPushed = true;

        if (activeInteraction.tool === 'arrow') {
          const newArrow: ArrowAnnotation = {
            id: activeInteraction.newId,
            type: 'arrow',
            x1: activeInteraction.startPoint.x,
            y1: activeInteraction.startPoint.y,
            x2: endPt.x,
            y2: endPt.y,
            color: state.activeColor,
            strokeWidth: state.strokeWidth,
          };
          state.annotations.push(newArrow);
        } else {
          const newLine: LineAnnotation = {
            id: activeInteraction.newId,
            type: 'line',
            subtype: state.lineSubtype,
            x1: activeInteraction.startPoint.x,
            y1: activeInteraction.startPoint.y,
            x2: endPt.x,
            y2: endPt.y,
            color: state.activeColor,
            strokeWidth:
              state.lineSubtype === 'highlighter'
                ? HIGHLIGHTER_STROKE_WIDTH_CSS
                : state.strokeWidth,
            alpha:
              state.lineSubtype === 'highlighter' ? HIGHLIGHTER_ALPHA : 1.0,
          };
          state.annotations.push(newLine);
        }
        state.selectedAnnotationId = activeInteraction.newId;
      } else {
        const idx = state.annotations.findIndex(
          (item) =>
            activeInteraction?.kind === 'draw' &&
            item.id === activeInteraction.newId,
        );
        const existing = idx >= 0 ? state.annotations[idx] : undefined;
        if (
          existing &&
          (existing.type === 'arrow' || existing.type === 'line')
        ) {
          state.annotations[idx] = {
            ...existing,
            x2: endPt.x,
            y2: endPt.y,
          };
        }
      }
      redrawCanvasOnly();
    }
  }

  function handleCanvasMouseUp(event: MouseEvent): void {
    if (!activeInteraction || event === lastProcessedUpEvent) {
      return;
    }
    lastProcessedUpEvent = event;
    activeInteraction = null;
    notifyAndRender();
  }

  async function hydrateFromStorageAndIndexedDb(): Promise<void> {
    if (captureIdParam) {
      const savedSettings = await loadUserSettings();
      state.activeTool = savedSettings.activeTool;
      state.activeColor = savedSettings.activeColor;
      state.strokeWidth = savedSettings.strokeWidth;
      state.textStyleMode = savedSettings.textStyleMode;

      const session = await consumeCaptureSession(captureIdParam);
      if (!session || session.frames.length === 0) {
        state.prototypeState = 'empty';
        notifyAndRender();
        return;
      }

      const placements = buildSessionCompositePlacements(session);
      state.framePlacements = placements;

      const decodedFrames = await Promise.all(
        session.frames.map(async (frame) => {
          const fw = Math.round(frame.viewportWidthCss * session.dpr);
          const fh = Math.round(frame.viewportHeightCss * session.dpr);
          const res = await decodeBlobToDrawable(frame.blob, fw, fh);
          return res.drawable;
        }),
      );

      placedFrameDrawables = placements.map((placement) => ({
        drawable: decodedFrames[placement.frameIndex] ?? null,
        placement,
      }));
      baseDrawable = decodedFrames[0] ?? null;

      const capturedDate = new Date(session.capturedAt);
      const validDate = Number.isNaN(capturedDate.getTime())
        ? new Date()
        : capturedDate;

      state.prototypeState = session.exceededMaxHeight
        ? 'max-height-warning'
        : 'default';
      state.captureMode = session.mode;
      state.metadata = {
        id: session.id,
        mode: session.mode,
        sourceUrl: session.sourceUrl,
        sourceDomain: session.sourceDomain,
        capturedAt: session.capturedAt,
        filename: formatCaptureFilename(session.sourceUrl, validDate),
        cssWidth: session.totalWidthCss,
        cssHeight: session.totalHeightCss,
        dpr: session.dpr,
        highlightApplied: false,
      };
      state.annotations = [];
      historyManager.reset([]);
      syncHistoryState();
      state.selectedAnnotationId = null;
      notifyAndRender();
    }
  }

  const handleKeyDown = (event: KeyboardEvent): void => {
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'TEXTAREA' ||
        target.tagName === 'INPUT' ||
        target.isContentEditable)
    ) {
      return;
    }

    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === 'v' &&
      state.prototypeState === 'empty'
    ) {
      event.preventDefault();
      loadSampleCapture(state.captureMode);
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      undo();
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      deleteSelected();
      return;
    }

    if (!event.ctrlKey && !event.metaKey && !event.altKey) {
      if (event.key === '1') {
        setTool('arrow');
      } else if (event.key === '2') {
        setTool('line');
      } else if (event.key === '3') {
        setTool('text');
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousemove', handleCanvasMouseMove);
    window.addEventListener('mouseup', handleCanvasMouseUp);
    window.addEventListener('paste', (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i += 1) {
        const item = items[i];
        if (item && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            void loadImageBlob(file, 'schowek');
            break;
          }
        }
      }
    });
  }

  notifyAndRender();
  const ready = hydrateFromStorageAndIndexedDb();

  return {
    getState: () => state,
    setTool,
    setColor,
    setStrokeWidth,
    setLineSubtype,
    setTextStyleMode,
    selectAnnotation: (id: string | null) => {
      state.selectedAnnotationId = id;
      syncToolbarWithSelectedAnnotation();
      notifyAndRender();
    },
    undo,
    deleteSelected,
    loadSampleCapture,
    loadImageBlob,
    ready,
  };
}

if (typeof document !== 'undefined') {
  const root = document.getElementById('editor-app');
  if (root) {
    initEditor(root);
  }
}
