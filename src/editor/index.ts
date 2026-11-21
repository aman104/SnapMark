import {
  ANNOTATION_COLORS,
  DEFAULT_USER_SETTINGS,
  HIGHLIGHTER_ALPHA,
  HIGHLIGHTER_STROKE_WIDTH_CSS,
  STROKE_WIDTHS,
} from '../shared/constants';
import {
  getInitialMockAnnotations,
  getMockCaptureMetadata,
  parseEditorStateFromSearch,
} from '../shared/mock-captures';
import type {
  AnnotationColor,
  AnnotationItem,
  CaptureMode,
  EditorPrototypeState,
  EditorTool,
  LineSubtype,
  MockCaptureMetadata,
  StrokeWidth,
  TextStyleMode,
} from '../shared/types';

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
}

function cloneAnnotations(items: AnnotationItem[]): AnnotationItem[] {
  return items.map((item) => ({ ...item }));
}

export function initEditor(
  container: HTMLElement,
  options: InitEditorOptions = {},
): EditorController {
  const initialSearch =
    options.initialSearch ??
    (typeof window !== 'undefined' ? window.location.search : '');

  const parsed = parseEditorStateFromSearch(initialSearch);
  const initialMetadata = getMockCaptureMetadata(
    parsed.mode,
    parsed.highlightApplied,
  );
  const initialAnnotations = getInitialMockAnnotations(parsed.mode);

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
    historyStack: [cloneAnnotations(initialAnnotations.slice(0, -1))],
    selectedAnnotationId: initialAnnotations[0]?.id ?? null,
    copySuccess: false,
    warningDismissed: false,
  };

  let copyResetTimeout: ReturnType<typeof setTimeout> | null = null;

  function pushHistorySnapshot(): void {
    state.historyStack.push(cloneAnnotations(state.annotations));
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

  function render(): void {
    const canUndo = state.historyStack.length > 0;
    const hasSelection = state.selectedAnnotationId !== null;

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

              <button type="button" id="btn-download-png" class="btn-secondary" title="Pobierz spłaszczony plik PNG">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M8 2.5v7.5m0 0L5.5 7.5M8 10l2.5-2.5M3 12.5h10" />
                </svg>
                <span>Pobierz PNG</span>
              </button>

              <button
                type="button"
                id="btn-copy-clipboard"
                class="btn-primary ${state.copySuccess ? 'is-success' : ''}"
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
          <div class="canvas-wrapper" id="canvas-wrapper">
            <canvas id="editor-canvas"></canvas>
            <div id="text-overlay-layer"></div>
          </div>
        </main>
      </div>
    `;

    bindToolbarEvents();
  }

  function setTool(tool: EditorTool): void {
    state.activeTool = tool;
    // Automatically select the sample annotation of that type if present
    const matching = state.annotations.find((item) => item.type === tool);
    if (matching) {
      state.selectedAnnotationId = matching.id;
    }
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
    notifyAndRender();
  }

  function undo(): void {
    const previous = state.historyStack.pop();
    if (!previous) {
      return;
    }
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
    state.prototypeState = 'default';
    state.captureMode = mode;
    state.metadata = getMockCaptureMetadata(mode);
    state.annotations = cloneAnnotations(getInitialMockAnnotations(mode));
    state.historyStack = [
      cloneAnnotations(state.annotations.slice(0, -1)),
    ];
    state.selectedAnnotationId = state.annotations[0]?.id ?? null;
    notifyAndRender();
  }

  function bindToolbarEvents(): void {
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
        options.onDownloadPng?.(state.metadata.filename, state);
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
  }

  notifyAndRender();

  return {
    getState: () => state,
    setTool,
    setColor,
    setStrokeWidth,
    setLineSubtype,
    setTextStyleMode,
    selectAnnotation: (id: string | null) => {
      state.selectedAnnotationId = id;
      notifyAndRender();
    },
    undo,
    deleteSelected,
    loadSampleCapture,
  };
}

if (typeof document !== 'undefined') {
  const root = document.getElementById('editor-app');
  if (root) {
    initEditor(root);
  }
}
