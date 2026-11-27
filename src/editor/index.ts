import {
  ANNOTATION_COLORS,
  DEFAULT_LINE_STROKE_WIDTH,
  DEFAULT_TEXT_FONT_SIZE_CSS,
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
import { updateUserSettings } from '../shared/settings';
import type {
  AnnotationColor,
  AnnotationItem,
  ArrowAnnotation,
  CaptureMode,
  CssRect,
  EditorPrototypeState,
  EditorTool,
  LineAnnotation,
  LineSubtype,
  MockCaptureMetadata,
  PenAnnotation,
  StepAnnotation,
  StrokeWidth,
  TextAnnotation,
  TextStyleMode,
} from '../shared/types';
import {
  buildSessionCompositePlacements,
  computeFitToWidthScale,
  decodeBlobToDrawable,
  type FramePlacementPlan,
  hitTestAnnotations,
  type PlacedFrameDrawable,
  renderCanvasStage,
} from './canvas-stage';
import { exportFlattenedPngDownload } from './exporter';
import { cloneAnnotationList, UndoHistoryStack } from './history';
import {
  type ActiveTextEditorDraft,
  renderTextOverlayLayer,
} from './text-overlay';
import {
  applyShiftHorizontalLock,
  DEFAULT_STEP_RADIUS_CSS,
  type EndpointHandleRole,
  getNextStepNumber,
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
  lineStrokeWidth: StrokeWidth;
  textStyleMode: TextStyleMode;
  annotations: AnnotationItem[];
  historyStack: AnnotationItem[][];
  selectedAnnotationId: string | null;
  warningDismissed: boolean;
  isLiveCapture: boolean;
  framePlacements: FramePlacementPlan[];
  cropOffsetCss: { x: number; y: number };
  cropDraftRect: CssRect | null;
}

export interface InitEditorOptions {
  initialSearch?: string;
  onStateChange?: (state: EditorState) => void;
  onDownloadPng?: (filename: string, state: EditorState) => void;
  onClose?: () => void;
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

type CropResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

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
    }
  | {
      kind: 'pen';
      newId: string;
      points: Point2D[];
      snapshotPushed: boolean;
    }
  | {
      kind: 'crop';
      startPoint: Point2D;
    }
  | {
      kind: 'crop-move';
      lastPoint: Point2D;
    }
  | {
      kind: 'crop-resize';
      handle: CropResizeHandle;
      originRect: CssRect;
      startPoint: Point2D;
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
    lineStrokeWidth: DEFAULT_LINE_STROKE_WIDTH,
    textStyleMode: DEFAULT_USER_SETTINGS.textStyleMode,
    annotations: cloneAnnotations(initialAnnotations),
    historyStack:
      initialAnnotations.length > 0
        ? [cloneAnnotations(initialAnnotations.slice(0, -1))]
        : [],
    selectedAnnotationId: initialAnnotations[0]?.id ?? null,
    warningDismissed: false,
    isLiveCapture: Boolean(captureIdParam),
    framePlacements: [],
    cropOffsetCss: { x: 0, y: 0 },
    cropDraftRect: null,
  };

  let baseDrawable: CanvasImageSource | null = null;
  let placedFrameDrawables: PlacedFrameDrawable[] = [];
  let activeInteraction: ActiveCanvasInteraction | null = null;
  let activeTextDraft: ActiveTextEditorDraft | null = null;
  let previousToolBeforeCrop: Exclude<EditorTool, 'crop'> = 'arrow';
  let toolbarRefreshPending = false;
  let toolbarPointerDown = false;
  let downloadInProgress = false;
  let closingAfterDownload = false;
  let downloadError: 'download' | 'close' | 'changed' | null = null;
  let lastProcessedMoveEvent: MouseEvent | null = null;
  let lastProcessedUpEvent: MouseEvent | null = null;
  let annotationSeq = 0;

  for (const eventType of ['mousedown', 'click', 'keydown', 'input', 'paste']) {
    container.addEventListener(eventType, (event) => {
      if (closingAfterDownload) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
  }

  function setClosingAfterDownload(closing: boolean): void {
    closingAfterDownload = closing;
    container.inert = closing;
    container.setAttribute('aria-busy', closing ? 'true' : 'false');
  }

  interface StageGeometrySnapshot {
    cssWidth: number;
    cssHeight: number;
    cropOffsetCss: { x: number; y: number };
  }
  const geometryHistoryStack: Array<StageGeometrySnapshot | null> =
    state.historyStack.map(() => null);

  const historyManager = new UndoHistoryStack(state.historyStack);

  function syncHistoryState(): void {
    state.historyStack = historyManager.getSnapshots();
  }

  function pushHistorySnapshot(includeGeometry = false): void {
    historyManager.pushSnapshot(state.annotations);
    geometryHistoryStack.push(
      includeGeometry
        ? {
            cssWidth: state.metadata.cssWidth,
            cssHeight: state.metadata.cssHeight,
            cropOffsetCss: { ...state.cropOffsetCss },
          }
        : null,
    );
    syncHistoryState();
  }

  function commitActiveTextDraft(overrideText?: string, toolbarTarget: Element | null = null): void {
    if (!activeTextDraft) {
      return;
    }
    const draft = activeTextDraft;
    const liveInput = container.querySelector<HTMLTextAreaElement>(
      '#active-text-input',
    );
    const rawText =
      overrideText !== undefined
        ? overrideText
        : liveInput
          ? liveInput.value
          : draft.text;
    const trimmed = rawText.trim();
    activeTextDraft = null;

    if (draft.editingAnnotationId) {
      const idx = state.annotations.findIndex(
        (item) => item.id === draft.editingAnnotationId,
      );
      const existing = idx >= 0 ? state.annotations[idx] : undefined;
      if (existing && existing.type === 'text') {
        if (trimmed.length === 0) {
          pushHistorySnapshot();
          state.annotations.splice(idx, 1);
          state.selectedAnnotationId = state.annotations[0]?.id ?? null;
        } else if (
          existing.text !== trimmed ||
          existing.color !== draft.color ||
          existing.styleMode !== draft.styleMode
        ) {
          pushHistorySnapshot();
          state.annotations[idx] = {
            ...existing,
            text: trimmed,
            color: draft.color,
            styleMode: draft.styleMode,
          };
          state.selectedAnnotationId = existing.id;
        }
      }
    } else if (trimmed.length > 0) {
      pushHistorySnapshot();
      annotationSeq += 1;
      const newText: TextAnnotation = {
        id: `ann_text_${Date.now()}_${annotationSeq}`,
        type: 'text',
        x: draft.x,
        y: draft.y,
        text: trimmed,
        color: draft.color,
        fontSize: draft.fontSize,
        styleMode: draft.styleMode,
      };
      state.annotations.push(newText);
      state.selectedAnnotationId = newText.id;
    }

    if (toolbarTarget) {
      liveInput?.remove();
      redrawCanvasOnly();
      options.onStateChange?.(state);
      toolbarRefreshPending = true;
      if (!toolbarPointerDown) {
        const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('.editor-toolbar button'));
        const buttonIndex = buttons.indexOf(toolbarTarget.closest('button') as HTMLButtonElement);
        queueMicrotask(() => {
          if (!toolbarRefreshPending) return;
          notifyAndRender();
          if (buttonIndex >= 0) container.querySelectorAll<HTMLButtonElement>('.editor-toolbar button')[buttonIndex]?.focus();
        });
      }
    } else {
      notifyAndRender();
    }
  }

  function cancelActiveTextDraft(): void {
    if (!activeTextDraft) {
      return;
    }
    activeTextDraft = null;
    notifyAndRender();
  }

  function getStageDisplayScale(): number {
    const stage = container.querySelector<HTMLElement>('#editor-stage');
    const stageWidth = stage?.clientWidth ?? 0;
    if (stageWidth <= 24) {
      return 1;
    }
    return computeFitToWidthScale(state.metadata.cssWidth, stageWidth - 24);
  }

  function syncFloatingCropActions(): void {
    const overlay = container.querySelector<HTMLElement>('#crop-actions-overlay');
    if (!overlay) {
      return;
    }
    const rect = state.cropDraftRect;
    if (
      state.activeTool !== 'crop' ||
      !rect ||
      rect.width < 8 ||
      rect.height < 8
    ) {
      overlay.innerHTML = '';
      return;
    }

    const displayScale = getStageDisplayScale();
    const canvasDisplayW = Math.round(state.metadata.cssWidth * displayScale);
    const canvasDisplayH = Math.round(state.metadata.cssHeight * displayScale);
    const rightPx = Math.round((rect.x + rect.width) * displayScale);
    const bottomPx = Math.round((rect.y + rect.height) * displayScale);
    const anchorLeft = Math.max(150, Math.min(canvasDisplayW - 4, rightPx));
    const anchorTop =
      bottomPx + 46 <= canvasDisplayH
        ? bottomPx + 8
        : Math.max(4, bottomPx - 44);

    let bar = overlay.querySelector<HTMLElement>('#crop-floating-actions');
    if (!bar) {
      overlay.innerHTML = `
        <div id="crop-floating-actions" class="crop-floating-actions" role="group" aria-label="Crop actions">
          <button type="button" id="btn-floating-cancel-crop" class="btn-secondary">Cancel</button>
          <button type="button" id="btn-floating-apply-crop" class="btn-primary">Apply</button>
        </div>
      `;
      bar = overlay.querySelector<HTMLElement>('#crop-floating-actions');
      bar?.addEventListener('mousedown', (e) => e.stopPropagation());
      bar
        ?.querySelector<HTMLButtonElement>('#btn-floating-apply-crop')
        ?.addEventListener('click', (e) => {
          e.stopPropagation();
          applyCrop();
        });
      bar
        ?.querySelector<HTMLButtonElement>('#btn-floating-cancel-crop')
        ?.addEventListener('click', (e) => {
          e.stopPropagation();
          cancelCrop();
        });
    }
    if (bar) {
      bar.style.left = `${anchorLeft}px`;
      bar.style.top = `${anchorTop}px`;
    }
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
        getStageDisplayScale(),
        state.cropOffsetCss,
        state.cropDraftRect,
      );
    }
    syncFloatingCropActions();
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
    if (selected.type === 'arrow' || selected.type === 'pen') {
      state.strokeWidth = selected.strokeWidth;
    } else if (selected.type === 'line') {
      state.lineSubtype = selected.subtype;
      if (
        selected.strokeWidth === 2 ||
        selected.strokeWidth === 4 ||
        selected.strokeWidth === 8
      ) {
        state.lineStrokeWidth = selected.strokeWidth;
      }
    } else if (selected.type === 'text') {
      state.textStyleMode = selected.styleMode;
    }
  }

  function notifyAndRender(): void {
    const active = document.activeElement;
    const focusedButton = active instanceof HTMLButtonElement && active.closest('.editor-toolbar')
      ? { id: active.id, data: { ...active.dataset } }
      : null;
    toolbarRefreshPending = false;
    render();
    if (focusedButton && !activeTextDraft) {
      const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('.editor-toolbar button'));
      const replacement = focusedButton.id
        ? buttons.find((button) => button.id === focusedButton.id)
        : buttons.find((button) => Object.keys(focusedButton.data).length > 0 &&
            Object.entries(focusedButton.data).every(([key, value]) => button.dataset[key] === value));
      replacement?.focus();
    }
    options.onStateChange?.(state);
  }

  function renderContextualPropertiesHtml(): string {
    if (state.activeTool === 'crop') {
      const hasValidCrop =
        state.cropDraftRect !== null &&
        state.cropDraftRect.width >= 8 &&
        state.cropDraftRect.height >= 8;
      const cropLabel = hasValidCrop && state.cropDraftRect
        ? `${Math.round(state.cropDraftRect.width)}×${Math.round(state.cropDraftRect.height)} px`
        : 'Drag area to crop';
      return `
        <span class="shift-hint-pill" id="crop-dimensions-label">${cropLabel}</span>
        <button type="button" id="btn-apply-crop" class="btn-primary" ${hasValidCrop ? '' : 'disabled'}>
          Apply
        </button>
        <button type="button" id="btn-cancel-crop" class="btn-secondary">
          Cancel
        </button>
      `;
    }

    const swatchesHtml = ANNOTATION_COLORS.map(
      (swatch) => `
        <button
          type="button"
          class="color-swatch ${state.activeColor === swatch.hex ? 'is-active' : ''}"
          data-color="${swatch.hex}"
          style="background-color: ${swatch.hex};"
          title="${swatch.label}"
          aria-label="Color ${swatch.label}"
          aria-pressed="${state.activeColor === swatch.hex ? 'true' : 'false'}"
        ></button>
      `,
    ).join('');

    const showStrokeWidth =
      state.activeTool === 'arrow' ||
      state.activeTool === 'pen' ||
      (state.activeTool === 'line' && state.lineSubtype === 'underline');

    const activeWidthForTool =
      state.activeTool === 'line' ? state.lineStrokeWidth : state.strokeWidth;

    const strokeWidthHtml = showStrokeWidth
      ? `
        <div id="stroke-width-picker" class="segmented-control" role="group" aria-label="Stroke width">
          ${STROKE_WIDTHS.map(
            (sw) => `
              <button
                type="button"
                class="segmented-option ${activeWidthForTool === sw.value ? 'is-active' : ''}"
                data-stroke-width="${sw.value}"
                aria-pressed="${activeWidthForTool === sw.value ? 'true' : 'false'}"
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
        <div id="line-subtype-picker" class="segmented-control" role="group" aria-label="Line and highlighter mode">
          <button
            type="button"
            class="segmented-option ${state.lineSubtype === 'underline' ? 'is-active' : ''}"
            data-line-subtype="underline"
            aria-pressed="${state.lineSubtype === 'underline' ? 'true' : 'false'}"
          >
            Underline
          </button>
          <button
            type="button"
            class="segmented-option ${state.lineSubtype === 'highlighter' ? 'is-active' : ''}"
            data-line-subtype="highlighter"
            aria-pressed="${state.lineSubtype === 'highlighter' ? 'true' : 'false'}"
          >
            Highlighter
          </button>
        </div>
      `
        : '';

    const textStyleHtml =
      state.activeTool === 'text'
        ? `
        <div id="text-style-picker" class="segmented-control" role="group" aria-label="Text readability mode">
          <button
            type="button"
            class="segmented-option ${state.textStyleMode === 'background' ? 'is-active' : ''}"
            data-text-style="background"
            aria-pressed="${state.textStyleMode === 'background' ? 'true' : 'false'}"
          >
            Background
          </button>
          <button
            type="button"
            class="segmented-option ${state.textStyleMode === 'outline' ? 'is-active' : ''}"
            data-text-style="outline"
            aria-pressed="${state.textStyleMode === 'outline' ? 'true' : 'false'}"
          >
            Outline
          </button>
          <button
            type="button"
            class="segmented-option ${state.textStyleMode === 'plain' ? 'is-active' : ''}"
            data-text-style="plain"
            aria-pressed="${state.textStyleMode === 'plain' ? 'true' : 'false'}"
          >
            Plain
          </button>
        </div>
      `
        : '';

    const selectedStep = state.selectedAnnotationId
      ? state.annotations.find(
          (item): item is StepAnnotation =>
            item.id === state.selectedAnnotationId && item.type === 'step',
        )
      : undefined;

    const stepNumberHtml = selectedStep
      ? `
        <div id="step-number-control" class="step-number-control" role="group" aria-label="Step number">
          <button type="button" id="btn-step-dec" class="segmented-option" title="Decrease step number" aria-label="Decrease step number">−</button>
          <input
            type="number"
            id="step-number-input"
            class="step-number-input"
            min="1"
            max="99"
            value="${selectedStep.stepNumber}"
            aria-label="Step number"
          />
          <button type="button" id="btn-step-inc" class="segmented-option" title="Increase step number" aria-label="Increase step number">+</button>
        </div>
      `
      : '';

    return `
      <div id="color-picker" class="color-swatch-tray" role="group" aria-label="Annotation color palette">
        ${swatchesHtml}
      </div>
      ${lineSubtypeHtml}
      ${strokeWidthHtml}
      ${textStyleHtml}
      ${stepNumberHtml}
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
            No active screenshot on canvas
          </h1>
          <p class="empty-state-description">
            Temporary captures are deleted from memory immediately after loading for privacy. Take a new capture from the extension popup, right-click menu, or paste an image from your clipboard.
          </p>
          <div class="empty-state-actions">
            <button type="button" id="btn-paste-clipboard" class="btn-primary">
              Paste from clipboard (Ctrl+V)
            </button>
            <button type="button" id="btn-open-file" class="btn-secondary">
              Open PNG/JPG file...
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
              Maximum safe Retina canvas height reached. The screenshot was saved up to this height.
            </span>
            <button type="button" id="btn-dismiss-warning" class="banner-dismiss-btn">
              Dismiss
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
        <div id="crop-actions-overlay"></div>
      </div>
    `;
  }

  function renderToolbarHtml(): string {
    const canUndo = state.historyStack.length > 0;
    const hasSelection = state.selectedAnnotationId !== null;
    const isEmptyState = state.prototypeState === 'empty';
    return `
        <header class="editor-toolbar" role="toolbar" aria-label="SnapMark editor toolbar">
          <div class="toolbar-left-group">
            <!-- Cluster 1: Brand -->
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
            </div>

            <span class="toolbar-divider" aria-hidden="true"></span>

            <!-- Cluster 2: Primary Vector Tools (Icon-Only) -->
            <div class="toolbar-cluster" id="cluster-primary-tools" role="group" aria-label="Drawing tools">
              <button
                type="button"
                id="tool-arrow"
                aria-label="Arrow"
                class="toolbar-tool-btn ${state.activeTool === 'arrow' ? 'is-active' : ''}"
                aria-pressed="${state.activeTool === 'arrow' ? 'true' : 'false'}"
                title="Arrow (1)"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M3 13L13 3M13 3H7M13 3v6" />
                </svg>
              </button>

              <button
                type="button"
                id="tool-line"
                aria-label="Line / Highlighter"
                class="toolbar-tool-btn ${state.activeTool === 'line' ? 'is-active' : ''}"
                aria-pressed="${state.activeTool === 'line' ? 'true' : 'false'}"
                title="Underline & Highlighter (2)"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M2.5 13.5h11M4 9.5l5.5-5.5 2.5 2.5L6.5 12H4V9.5z" />
                </svg>
              </button>

              <button
                type="button"
                id="tool-text"
                aria-label="Text"
                class="toolbar-tool-btn ${state.activeTool === 'text' ? 'is-active' : ''}"
                aria-pressed="${state.activeTool === 'text' ? 'true' : 'false'}"
                title="Text (3)"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M3 3.5h10M8 3.5v9M5.5 12.5h5" />
                </svg>
              </button>

              <button
                type="button"
                id="tool-step"
                aria-label="Step numbers"
                class="toolbar-tool-btn ${state.activeTool === 'step' ? 'is-active' : ''}"
                aria-pressed="${state.activeTool === 'step' ? 'true' : 'false'}"
                title="Step numbers 1, 2, 3... (4)"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="8" cy="8" r="6" />
                  <path d="M7.2 5.7L8.3 5v6" />
                </svg>
              </button>

              <button
                type="button"
                id="tool-pen"
                aria-label="Pen"
                class="toolbar-tool-btn ${state.activeTool === 'pen' ? 'is-active' : ''}"
                aria-pressed="${state.activeTool === 'pen' ? 'true' : 'false'}"
                title="Freehand Pen (5)"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M11.5 2.5l2 2-7.5 7.5-3 .8.8-3 7.7-7.3z" />
                </svg>
              </button>

              <button
                type="button"
                id="tool-crop"
                aria-label="Crop"
                class="toolbar-tool-btn ${state.activeTool === 'crop' ? 'is-active' : ''}"
                aria-pressed="${state.activeTool === 'crop' ? 'true' : 'false'}"
                title="Crop screenshot (C)"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M4.5 2v9.5H14M2 4.5h9.5V14" />
                </svg>
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
                aria-label="Undo"
                class="btn-secondary"
                ${canUndo ? '' : 'disabled'}
                title="Undo last change"
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M3.5 6.5h6a3.5 3.5 0 1 1 0 7H6M3.5 6.5L6 4M3.5 6.5L6 9" />
                </svg>
                <span>Undo</span>
              </button>

              <button
                type="button"
                id="btn-delete-selected"
                class="btn-danger-ghost"
                ${hasSelection ? '' : 'disabled'}
                title="Delete selected annotation (Delete / Backspace)"
                aria-label="Delete selected annotation"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M3 4.5h10M6.5 4.5V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.5M4.5 4.5l.6 8.5a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.6-8.5" />
                </svg>
              </button>

              <button
                type="button"
                id="btn-download-png"
                class="btn-primary"
                ${isEmptyState ? 'disabled' : ''}
                aria-disabled="${isEmptyState || downloadInProgress ? 'true' : 'false'}"
                title="Download flattened PNG"
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M8 2.5v7.5m0 0L5.5 7.5M8 10l2.5-2.5M3 12.5h10" />
                </svg>
                <span>Download PNG</span>
              </button>

              <button type="button" id="btn-close-editor" class="btn-secondary" title="Close editor" aria-label="Close editor">
                <span aria-hidden="true">✕</span>
              </button>
            </div>
          </div>
        </header>
    `;
  }

  function refreshToolbarOnly(): void {
    const oldToolbar = container.querySelector<HTMLElement>('.editor-toolbar');
    if (!oldToolbar) return;
    const focused = document.activeElement;
    const buttons = Array.from(oldToolbar.querySelectorAll<HTMLButtonElement>('button'));
    const focusIndex = focused instanceof HTMLButtonElement ? buttons.indexOf(focused) : -1;
    const focusId = focusIndex >= 0 && focused instanceof HTMLButtonElement ? focused.id : '';
    const template = document.createElement('template');
    template.innerHTML = renderToolbarHtml().trim();
    const replacement = template.content.firstElementChild;
    if (!replacement) return;
    oldToolbar.replaceWith(replacement);
    bindToolbarAndStageEvents(true);
    if (focusIndex >= 0) {
      const replacementButtons = Array.from(replacement.querySelectorAll<HTMLButtonElement>('button'));
      (replacementButtons.find((button) => focusId && button.id === focusId) ?? replacementButtons[focusIndex])?.focus();
    }
    options.onStateChange?.(state);
  }

  function render(): void {
    container.innerHTML = `
      <div class="editor-shell" data-editor-state="${state.prototypeState}" data-capture-mode="${state.captureMode}">
        ${renderToolbarHtml()}

        <main class="editor-stage" id="editor-stage">
          <div id="download-status" class="status-banner is-danger" role="alert" hidden></div>
          ${renderStageHtml()}
        </main>
      </div>
    `;

    syncDownloadUi();
    const displayScale = getStageDisplayScale();
    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas');
    if (canvas) {
      renderCanvasStage(
        canvas,
        state.metadata,
        state.annotations,
        state.selectedAnnotationId,
        baseDrawable,
        placedFrameDrawables,
        displayScale,
        state.cropOffsetCss,
        state.cropDraftRect,
      );
    }

    const overlayLayer = container.querySelector<HTMLElement>(
      '#text-overlay-layer',
    );
    const scaledTextDraft = activeTextDraft
      ? {
          ...activeTextDraft,
          x: Math.round(activeTextDraft.x * displayScale),
          y: Math.round(activeTextDraft.y * displayScale),
          fontSize: Math.max(12, Math.round(activeTextDraft.fontSize * displayScale)),
        }
      : null;
    renderTextOverlayLayer(overlayLayer, scaledTextDraft, {
      onInput: (text) => {
        if (activeTextDraft) {
          activeTextDraft.text = text;
        }
      },
      onCommit: (text, toolbarTarget) => {
        commitActiveTextDraft(text, toolbarTarget);
      },
      onCancel: () => {
        cancelActiveTextDraft();
      },
    });

    bindToolbarAndStageEvents();
    syncFloatingCropActions();
  }

  function setTool(tool: EditorTool): void {
    if (activeTextDraft && tool !== 'text') {
      commitActiveTextDraft();
    }
    if (tool === 'crop') {
      if (state.activeTool !== 'crop') {
        previousToolBeforeCrop = state.activeTool;
      }
      state.activeTool = 'crop';
      state.selectedAnnotationId = null;
      state.cropDraftRect = null;
      notifyAndRender();
      return;
    }
    state.cropDraftRect = null;
    previousToolBeforeCrop = tool;
    state.activeTool = tool;
    state.selectedAnnotationId = null;
    void updateUserSettings({ activeTool: tool });
    notifyAndRender();
  }

  function applyCrop(): void {
    const rect = state.cropDraftRect;
    if (!rect || rect.width < 8 || rect.height < 8) {
      return;
    }
    const cropX = Math.max(0, Math.round(rect.x));
    const cropY = Math.max(0, Math.round(rect.y));
    const cropW = Math.max(8, Math.min(state.metadata.cssWidth - cropX, Math.round(rect.width)));
    const cropH = Math.max(8, Math.min(state.metadata.cssHeight - cropY, Math.round(rect.height)));

    pushHistorySnapshot(true);
    state.annotations = state.annotations.map((item) =>
      moveAnnotationByDelta(item, -cropX, -cropY),
    );
    state.cropOffsetCss = {
      x: state.cropOffsetCss.x + cropX,
      y: state.cropOffsetCss.y + cropY,
    };
    state.metadata = {
      ...state.metadata,
      cssWidth: cropW,
      cssHeight: cropH,
    };
    state.cropDraftRect = null;
    state.activeTool = previousToolBeforeCrop;
    state.selectedAnnotationId = null;
    notifyAndRender();
  }

  function cancelCrop(): void {
    state.cropDraftRect = null;
    redrawCanvasOnly();
    refreshToolbarOnly();
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
    if (state.activeTool === 'line') {
      state.lineStrokeWidth = width;
    } else {
      state.strokeWidth = width;
    }
    if (state.selectedAnnotationId) {
      const target = state.annotations.find(
        (item) => item.id === state.selectedAnnotationId,
      );
      if (
        target &&
        (target.type === 'arrow' ||
          target.type === 'line' ||
          target.type === 'pen')
      ) {
        pushHistorySnapshot();
        target.strokeWidth = width;
      }
    }
    if (state.activeTool !== 'line') {
      void updateUserSettings({ strokeWidth: width });
    }
    redrawCanvasOnly();
    refreshToolbarOnly();
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
            : state.lineStrokeWidth;
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

  function setSelectedStepNumber(nextNumber: number): void {
    if (!state.selectedAnnotationId || !Number.isFinite(nextNumber)) {
      return;
    }
    const clamped = Math.max(1, Math.min(99, Math.round(nextNumber)));
    const target = state.annotations.find(
      (item): item is StepAnnotation =>
        item.id === state.selectedAnnotationId && item.type === 'step',
    );
    if (!target || target.stepNumber === clamped) {
      return;
    }
    pushHistorySnapshot();
    target.stepNumber = clamped;
    redrawCanvasOnly();
    refreshToolbarOnly();
  }

  function undo(): void {
    const previous = historyManager.undo();
    if (!previous) {
      return;
    }
    const prevGeometry = geometryHistoryStack.pop() ?? null;
    syncHistoryState();
    state.annotations = previous;
    if (prevGeometry) {
      state.metadata = {
        ...state.metadata,
        cssWidth: prevGeometry.cssWidth,
        cssHeight: prevGeometry.cssHeight,
      };
      state.cropOffsetCss = { ...prevGeometry.cropOffsetCss };
      state.cropDraftRect = null;
    }
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
    sourceLabel = 'clipboard',
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

  function syncDownloadUi(): void {
    const status = container.querySelector<HTMLElement>('#download-status');
    if (status) {
      status.hidden = downloadError === null;
      status.textContent = downloadError === 'close'
        ? 'PNG downloaded, but the tab could not be closed.'
        : downloadError === 'changed'
          ? 'PNG downloaded. New edits are not included — download again.'
          : downloadError === 'download' ? 'Failed to download PNG. Please try again.' : '';
    }
    container.querySelector<HTMLButtonElement>('#btn-download-png')?.setAttribute('aria-disabled', downloadInProgress || state.prototypeState === 'empty' ? 'true' : 'false');
  }

  async function closeEditor(canClose: () => boolean = () => true, beforeClose: () => void = () => {}): Promise<boolean> {
    if (options.onClose) {
      if (!canClose()) return false;
      beforeClose();
      options.onClose();
    } else if (typeof chrome !== 'undefined' && chrome.tabs?.getCurrent && chrome.tabs?.remove) {
      const tab = await chrome.tabs.getCurrent();
      if (!canClose()) return false;
      beforeClose();
      if (typeof tab?.id === 'number') await chrome.tabs.remove(tab.id);
      else window.close();
    } else {
      if (!canClose()) return false;
      beforeClose();
      window.close();
    }
    return true;
  }

  function bindToolbarAndStageEvents(toolbarOnly = false): void {
    const toolbar = container.querySelector<HTMLElement>('.editor-toolbar');
    const scheduleToolbarRefresh = (): void => {
      setTimeout(() => {
        if (toolbarRefreshPending) {
          toolbarRefreshPending = false;
          refreshToolbarOnly();
        }
      }, 0);
    };
    toolbar?.addEventListener('mousedown', () => {
      toolbarPointerDown = true;
      window.addEventListener('mouseup', () => {
        toolbarPointerDown = false;
        scheduleToolbarRefresh();
      }, { once: true });
    });
    toolbar?.addEventListener('click', scheduleToolbarRefresh);
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
      .querySelector<HTMLButtonElement>('#tool-step')
      ?.addEventListener('click', () => setTool('step'));

    container
      .querySelector<HTMLButtonElement>('#tool-pen')
      ?.addEventListener('click', () => setTool('pen'));

    container
      .querySelector<HTMLButtonElement>('#tool-crop')
      ?.addEventListener('click', () => setTool('crop'));

    container
      .querySelector<HTMLButtonElement>('#btn-apply-crop')
      ?.addEventListener('click', applyCrop);

    container
      .querySelector<HTMLButtonElement>('#btn-cancel-crop')
      ?.addEventListener('click', cancelCrop);

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
      .querySelector<HTMLButtonElement>('#btn-step-dec')
      ?.addEventListener('click', () => {
        const selected = state.annotations.find(
          (item): item is StepAnnotation =>
            item.id === state.selectedAnnotationId && item.type === 'step',
        );
        if (selected) {
          setSelectedStepNumber(selected.stepNumber - 1);
        }
      });

    container
      .querySelector<HTMLButtonElement>('#btn-step-inc')
      ?.addEventListener('click', () => {
        const selected = state.annotations.find(
          (item): item is StepAnnotation =>
            item.id === state.selectedAnnotationId && item.type === 'step',
        );
        if (selected) {
          setSelectedStepNumber(selected.stepNumber + 1);
        }
      });

    const stepInput = container.querySelector<HTMLInputElement>('#step-number-input');
    stepInput?.addEventListener('change', () => {
      const parsed = Number(stepInput.value);
      if (Number.isFinite(parsed)) {
        setSelectedStepNumber(parsed);
      }
    });
    stepInput?.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const parsed = Number(stepInput.value);
        if (Number.isFinite(parsed)) {
          setSelectedStepNumber(parsed);
        }
        stepInput.blur();
      }
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
        if (downloadInProgress) return;
        if (activeTextDraft) {
          commitActiveTextDraft();
        }
        if (options.onDownloadPng) {
          options.onDownloadPng(state.metadata.filename, state);
        }
        downloadInProgress = true;
        downloadError = null;
        const exportedState = JSON.stringify({ metadata: state.metadata, annotations: state.annotations });
        syncDownloadUi();
        void exportFlattenedPngDownload(
          state.metadata,
          state.annotations,
          baseDrawable,
          placedFrameDrawables,
          state.cropOffsetCss,
        ).then(async () => {
          const canClose = (): boolean => !activeTextDraft && !activeInteraction && JSON.stringify({ metadata: state.metadata, annotations: state.annotations }) === exportedState;
          if (!canClose()) {
            downloadError = 'changed';
            return;
          }
          try {
            if (!await closeEditor(canClose, () => setClosingAfterDownload(true))) downloadError = 'changed';
          } catch {
            setClosingAfterDownload(false);
            downloadError = 'close';
          }
        }).catch(() => {
          downloadError = 'download';
        }).finally(() => {
          downloadInProgress = false;
          syncDownloadUi();
        });
      });

    container.querySelector<HTMLButtonElement>('#btn-close-editor')?.addEventListener('click', () => {
      void closeEditor().catch(() => window.close());
    });

    if (toolbarOnly) return;

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
                  await loadImageBlob(blob, 'clipboard');
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

    // Canvas interactive drawing, endpoint handle dragging, text overlay, and object selection/moving
    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas');
    canvas?.addEventListener('mousedown', handleCanvasMouseDown);
    canvas?.addEventListener('mousemove', handleCanvasMouseMove);
    canvas?.addEventListener('mouseup', handleCanvasMouseUp);
    canvas?.addEventListener('dblclick', handleCanvasDoubleClick);
    canvas?.addEventListener('click', (event: MouseEvent) => {
      const pt = getCanvasCssPoint(canvas, event);
      const hit = hitTestAnnotations(state.annotations, pt.x, pt.y);
      if (hit && hit.id !== state.selectedAnnotationId) {
        state.selectedAnnotationId = hit.id;
        syncToolbarWithSelectedAnnotation();
        redrawCanvasOnly();
        refreshToolbarOnly();
      }
    });
  }

  function handleCanvasDoubleClick(event: MouseEvent): void {
    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas');
    const pt = getCanvasCssPoint(canvas, event);
    const hit = hitTestAnnotations(state.annotations, pt.x, pt.y);
    if (hit && hit.type === 'text') {
      if (activeTextDraft) {
        commitActiveTextDraft();
      }
      state.selectedAnnotationId = hit.id;
      state.activeTool = 'text';
      state.activeColor = hit.color;
      state.textStyleMode = hit.styleMode;
      activeTextDraft = {
        editingAnnotationId: hit.id,
        x: hit.x,
        y: hit.y,
        text: hit.text,
        color: hit.color,
        fontSize: hit.fontSize,
        styleMode: hit.styleMode,
      };
      notifyAndRender();
    } else if (hit && hit.type === 'step') {
      state.selectedAnnotationId = hit.id;
      syncToolbarWithSelectedAnnotation();
      redrawCanvasOnly();
      refreshToolbarOnly();
      const stepInput = container.querySelector<HTMLInputElement>('#step-number-input');
      stepInput?.focus();
      stepInput?.select();
    }
  }

  function getCanvasCssPoint(
    canvas: HTMLCanvasElement | null,
    event: MouseEvent,
  ): Point2D {
    if (!canvas) {
      return { x: event.clientX, y: event.clientY };
    }
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? state.metadata.cssWidth / rect.width : 1;
    const scaleY = rect.height > 0 ? state.metadata.cssHeight / rect.height : 1;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function hitTestCropHandle(
    rect: CssRect | null,
    pt: Point2D,
    tolerance = 10,
  ): CropResizeHandle | null {
    if (!rect || rect.width < 8 || rect.height < 8) {
      return null;
    }
    const { x, y, width, height } = rect;
    const midX = x + width / 2;
    const midY = y + height / 2;
    const points: Array<[CropResizeHandle, number, number]> = [
      ['nw', x, y],
      ['ne', x + width, y],
      ['se', x + width, y + height],
      ['sw', x, y + height],
      ['n', midX, y],
      ['e', x + width, midY],
      ['s', midX, y + height],
      ['w', x, midY],
    ];
    for (const [role, hx, hy] of points) {
      if (Math.hypot(pt.x - hx, pt.y - hy) <= tolerance) {
        return role;
      }
    }
    return null;
  }

  function getCursorForCropHandle(handle: CropResizeHandle): string {
    if (handle === 'nw' || handle === 'se') return 'nwse-resize';
    if (handle === 'ne' || handle === 'sw') return 'nesw-resize';
    if (handle === 'n' || handle === 's') return 'ns-resize';
    return 'ew-resize';
  }

  function updateCanvasCursor(
    canvas: HTMLCanvasElement | null,
    pt?: Point2D,
  ): void {
    if (!canvas) {
      return;
    }
    if (activeInteraction?.kind === 'crop-resize') {
      canvas.style.cursor = getCursorForCropHandle(activeInteraction.handle);
      return;
    }
    if (
      activeInteraction?.kind === 'move' ||
      activeInteraction?.kind === 'handle' ||
      activeInteraction?.kind === 'crop-move'
    ) {
      canvas.style.cursor = 'grabbing';
      return;
    }
    if (activeInteraction) {
      canvas.style.cursor = 'crosshair';
      return;
    }
    if (pt && state.activeTool === 'crop' && state.cropDraftRect) {
      const r = state.cropDraftRect;
      const handle = hitTestCropHandle(r, pt);
      if (handle) {
        canvas.style.cursor = getCursorForCropHandle(handle);
        return;
      }
      if (
        r.width >= 8 &&
        r.height >= 8 &&
        pt.x >= r.x &&
        pt.x <= r.x + r.width &&
        pt.y >= r.y &&
        pt.y <= r.y + r.height
      ) {
        canvas.style.cursor = 'grab';
        return;
      }
    }
    if (pt && state.activeTool !== 'crop') {
      if (state.selectedAnnotationId) {
        const selectedItem = state.annotations.find(
          (item) => item.id === state.selectedAnnotationId,
        );
        if (hitTestEndpointHandle(selectedItem, pt.x, pt.y)) {
          canvas.style.cursor = 'grab';
          return;
        }
      }
      if (hitTestAnnotations(state.annotations, pt.x, pt.y)) {
        canvas.style.cursor = 'grab';
        return;
      }
    }
    canvas.style.cursor = state.activeTool === 'text' ? 'text' : 'crosshair';
  }

  function handleCanvasMouseDown(event: MouseEvent): void {
    if (event.button !== 0) {
      return;
    }
    if (activeTextDraft) {
      commitActiveTextDraft();
      return;
    }
    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas');
    const pt = getCanvasCssPoint(canvas, event);

    // 0. Crop tool mode: resize handles, drag inside to move, or drag outside to draw a new crop rectangle
    if (state.activeTool === 'crop') {
      const existingRect = state.cropDraftRect;
      const cropHandle = hitTestCropHandle(existingRect, pt);
      if (cropHandle && existingRect) {
        activeInteraction = {
          kind: 'crop-resize',
          handle: cropHandle,
          originRect: { ...existingRect },
          startPoint: pt,
        };
        updateCanvasCursor(canvas, pt);
        return;
      }
      if (
        existingRect &&
        existingRect.width >= 8 &&
        existingRect.height >= 8 &&
        pt.x >= existingRect.x &&
        pt.x <= existingRect.x + existingRect.width &&
        pt.y >= existingRect.y &&
        pt.y <= existingRect.y + existingRect.height
      ) {
        activeInteraction = {
          kind: 'crop-move',
          lastPoint: pt,
        };
        updateCanvasCursor(canvas, pt);
        return;
      }
      const clampedStart = {
        x: Math.max(0, Math.min(state.metadata.cssWidth, pt.x)),
        y: Math.max(0, Math.min(state.metadata.cssHeight, pt.y)),
      };
      state.cropDraftRect = {
        x: clampedStart.x,
        y: clampedStart.y,
        width: 0,
        height: 0,
      };
      activeInteraction = {
        kind: 'crop',
        startPoint: clampedStart,
      };
      redrawCanvasOnly();
      return;
    }

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
        updateCanvasCursor(canvas, pt);
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
      updateCanvasCursor(canvas, pt);
      redrawCanvasOnly();
      return;
    }

    // 3. When Text tool is active: if something is selected, deselect first; otherwise spawn inline <textarea> overlay
    if (state.activeTool === 'text') {
      if (state.selectedAnnotationId !== null) {
        state.selectedAnnotationId = null;
        redrawCanvasOnly();
        refreshToolbarOnly();
        updateCanvasCursor(canvas, pt);
        return;
      }
      // Keep the browser's default mousedown focus handling from blurring the
      // newly mounted textarea after it has been focused.
      event.preventDefault();
      activeTextDraft = {
        editingAnnotationId: null,
        x: pt.x,
        y: pt.y,
        text: '',
        color: state.activeColor,
        fontSize: DEFAULT_TEXT_FONT_SIZE_CSS,
        styleMode: state.textStyleMode,
      };
      notifyAndRender();
      return;
    }

    // 3b. When Step tool is active: if something is selected, deselect first; next click places the next numbered badge
    if (state.activeTool === 'step') {
      if (state.selectedAnnotationId !== null) {
        state.selectedAnnotationId = null;
        redrawCanvasOnly();
        refreshToolbarOnly();
        updateCanvasCursor(canvas, pt);
        return;
      }
      pushHistorySnapshot();
      annotationSeq += 1;
      const stepNumber = getNextStepNumber(state.annotations);
      const newStep: StepAnnotation = {
        id: `ann_step_${Date.now()}_${annotationSeq}`,
        type: 'step',
        x: pt.x,
        y: pt.y,
        stepNumber,
        color: state.activeColor,
        radius: DEFAULT_STEP_RADIUS_CSS,
      };
      state.annotations.push(newStep);
      state.selectedAnnotationId = newStep.id;
      redrawCanvasOnly();
      refreshToolbarOnly();
      updateCanvasCursor(canvas, pt);
      return;
    }

    // 3c. When Pen tool is active, start a freehand pen stroke
    if (state.activeTool === 'pen') {
      annotationSeq += 1;
      activeInteraction = {
        kind: 'pen',
        newId: `ann_pen_${Date.now()}_${annotationSeq}`,
        points: [pt],
        snapshotPushed: false,
      };
      return;
    }

    // 4. Otherwise start drawing a new Arrow or 2-in-1 Line/Highlighter
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
    if (event === lastProcessedMoveEvent) {
      return;
    }
    lastProcessedMoveEvent = event;

    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas');
    if (!activeInteraction) {
      if (canvas && event.target === canvas) {
        updateCanvasCursor(canvas, getCanvasCssPoint(canvas, event));
      }
      return;
    }

    const pt = getCanvasCssPoint(canvas, event);
    updateCanvasCursor(canvas, pt);

    if (activeInteraction.kind === 'crop-resize') {
      const { handle, originRect, startPoint } = activeInteraction;
      const dx = pt.x - startPoint.x;
      const dy = pt.y - startPoint.y;
      const minSize = 16;
      let left = originRect.x;
      let top = originRect.y;
      let right = originRect.x + originRect.width;
      let bottom = originRect.y + originRect.height;

      if (handle.includes('w')) {
        left = Math.max(0, Math.min(right - minSize, originRect.x + dx));
      }
      if (handle.includes('e')) {
        right = Math.min(
          state.metadata.cssWidth,
          Math.max(left + minSize, originRect.x + originRect.width + dx),
        );
      }
      if (handle.includes('n')) {
        top = Math.max(0, Math.min(bottom - minSize, originRect.y + dy));
      }
      if (handle.includes('s')) {
        bottom = Math.min(
          state.metadata.cssHeight,
          Math.max(top + minSize, originRect.y + originRect.height + dy),
        );
      }

      state.cropDraftRect = {
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
      };
      const dimLabel = container.querySelector<HTMLElement>('#crop-dimensions-label');
      if (dimLabel) {
        dimLabel.textContent = `${Math.round(state.cropDraftRect.width)}×${Math.round(state.cropDraftRect.height)} px`;
      }
      redrawCanvasOnly();
      return;
    }

    if (activeInteraction.kind === 'crop-move') {
      const rect = state.cropDraftRect;
      if (rect) {
        const dx = pt.x - activeInteraction.lastPoint.x;
        const dy = pt.y - activeInteraction.lastPoint.y;
        const maxX = Math.max(0, state.metadata.cssWidth - rect.width);
        const maxY = Math.max(0, state.metadata.cssHeight - rect.height);
        state.cropDraftRect = {
          ...rect,
          x: Math.max(0, Math.min(maxX, rect.x + dx)),
          y: Math.max(0, Math.min(maxY, rect.y + dy)),
        };
        activeInteraction.lastPoint = pt;
        redrawCanvasOnly();
      }
      return;
    }

    if (activeInteraction.kind === 'crop') {
      const clampedX = Math.max(0, Math.min(state.metadata.cssWidth, pt.x));
      const clampedY = Math.max(0, Math.min(state.metadata.cssHeight, pt.y));
      state.cropDraftRect = {
        x: Math.min(activeInteraction.startPoint.x, clampedX),
        y: Math.min(activeInteraction.startPoint.y, clampedY),
        width: Math.abs(clampedX - activeInteraction.startPoint.x),
        height: Math.abs(clampedY - activeInteraction.startPoint.y),
      };
      const dimLabel = container.querySelector<HTMLElement>('#crop-dimensions-label');
      const applyBtn = container.querySelector<HTMLButtonElement>('#btn-apply-crop');
      const hasValid =
        state.cropDraftRect.width >= 8 && state.cropDraftRect.height >= 8;
      if (dimLabel) {
        dimLabel.textContent = hasValid
          ? `${Math.round(state.cropDraftRect.width)}×${Math.round(state.cropDraftRect.height)} px`
          : 'Drag area to crop';
      }
      if (applyBtn) {
        applyBtn.disabled = !hasValid;
      }
      redrawCanvasOnly();
      return;
    }

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

    if (activeInteraction.kind === 'pen') {
      const lastPt =
        activeInteraction.points[activeInteraction.points.length - 1];
      if (lastPt && Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y) < 2) {
        return;
      }
      activeInteraction.points.push(pt);
      if (!activeInteraction.snapshotPushed) {
        pushHistorySnapshot();
        activeInteraction.snapshotPushed = true;
        const newPen: PenAnnotation = {
          id: activeInteraction.newId,
          type: 'pen',
          points: activeInteraction.points.map((p) => ({ ...p })),
          color: state.activeColor,
          strokeWidth: state.strokeWidth,
        };
        state.annotations.push(newPen);
        state.selectedAnnotationId = newPen.id;
      } else {
        const penId = activeInteraction.newId;
        const idx = state.annotations.findIndex((item) => item.id === penId);
        const existing = idx >= 0 ? state.annotations[idx] : undefined;
        if (existing && existing.type === 'pen') {
          state.annotations[idx] = {
            ...existing,
            points: activeInteraction.points.map((p) => ({ ...p })),
          };
        }
      }
      redrawCanvasOnly();
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
                : state.lineStrokeWidth,
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
    if (
      (activeInteraction.kind === 'draw' || activeInteraction.kind === 'pen') &&
      !activeInteraction.snapshotPushed
    ) {
      state.selectedAnnotationId = null;
    }
    activeInteraction = null;
    const canvas = container.querySelector<HTMLCanvasElement>('#editor-canvas');
    updateCanvasCursor(canvas, canvas ? getCanvasCssPoint(canvas, event) : undefined);
    redrawCanvasOnly();
    refreshToolbarOnly();
  }

  async function hydrateFromStorageAndIndexedDb(): Promise<void> {
    if (captureIdParam) {
      // Every new screenshot starts with fresh default toolbar selections
      state.activeTool = DEFAULT_USER_SETTINGS.activeTool;
      state.activeColor = DEFAULT_USER_SETTINGS.activeColor;
      state.strokeWidth = DEFAULT_USER_SETTINGS.strokeWidth;
      state.lineStrokeWidth = DEFAULT_LINE_STROKE_WIDTH;
      state.lineSubtype = 'highlighter';
      state.textStyleMode = DEFAULT_USER_SETTINGS.textStyleMode;

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
    if (closingAfterDownload) {
      event.preventDefault();
      return;
    }
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

    if (state.activeTool === 'crop') {
      if (event.key === 'Enter') {
        event.preventDefault();
        applyCrop();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        cancelCrop();
        return;
      }
    }

    if (event.key === 'Escape' && state.selectedAnnotationId !== null) {
      event.preventDefault();
      state.selectedAnnotationId = null;
      redrawCanvasOnly();
      refreshToolbarOnly();
      return;
    }

    if (!event.ctrlKey && !event.metaKey && !event.altKey) {
      if (event.key === '1') {
        setTool('arrow');
      } else if (event.key === '2') {
        setTool('line');
      } else if (event.key === '3') {
        setTool('text');
      } else if (event.key === '4') {
        setTool('step');
      } else if (event.key === '5') {
        setTool('pen');
      } else if (event.key.toLowerCase() === 'c') {
        setTool('crop');
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousemove', handleCanvasMouseMove);
    window.addEventListener('mouseup', handleCanvasMouseUp);
    window.addEventListener('resize', redrawCanvasOnly);
    window.addEventListener('paste', (event: ClipboardEvent) => {
      if (closingAfterDownload) {
        event.preventDefault();
        return;
      }
      const items = event.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i += 1) {
        const item = items[i];
        if (item && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            void loadImageBlob(file, 'clipboard');
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
