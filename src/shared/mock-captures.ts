import {
  DEFAULT_TEXT_FONT_SIZE_CSS,
  HIGHLIGHTER_ALPHA,
  HIGHLIGHTER_STROKE_WIDTH_CSS,
} from './constants';
import type {
  AnnotationItem,
  CaptureMode,
  EditorPrototypeState,
  MockCaptureMetadata,
  PopupPrototypeState,
} from './types';

const VALID_POPUP_STATES: ReadonlySet<PopupPrototypeState> = new Set([
  'default',
  'no-selection',
  'progress',
  'restricted',
]);

const VALID_EDITOR_STATES: ReadonlySet<EditorPrototypeState> = new Set([
  'default',
  'empty',
  'max-height-warning',
]);

const VALID_CAPTURE_MODES: ReadonlySet<CaptureMode> = new Set([
  'selection',
  'image',
  'viewport',
  'fullpage',
]);

export function parsePopupStateFromSearch(search: string): PopupPrototypeState {
  const params = new URLSearchParams(search);
  const rawState = params.get('state') as PopupPrototypeState | null;
  if (rawState && VALID_POPUP_STATES.has(rawState)) {
    return rawState;
  }
  return 'default';
}

export function parseEditorStateFromSearch(search: string): {
  state: EditorPrototypeState;
  mode: CaptureMode;
  highlightApplied: boolean;
} {
  const params = new URLSearchParams(search);
  const rawState = params.get('state') as EditorPrototypeState | null;
  const rawMode = params.get('mode') as CaptureMode | null;
  const highlightParam = params.get('highlight');

  const state: EditorPrototypeState =
    rawState && VALID_EDITOR_STATES.has(rawState) ? rawState : 'default';
  const mode: CaptureMode =
    rawMode && VALID_CAPTURE_MODES.has(rawMode) ? rawMode : 'viewport';
  const highlightApplied =
    highlightParam === '1' || highlightParam === 'true';

  return { state, mode, highlightApplied };
}

export function getMockCaptureMetadata(
  mode: CaptureMode = 'viewport',
  highlightApplied = false,
): MockCaptureMetadata {
  const dimensionsByMode: Record<
    CaptureMode,
    { cssWidth: number; cssHeight: number }
  > = {
    viewport: { cssWidth: 960, cssHeight: 580 },
    selection: { cssWidth: 680, cssHeight: 240 },
    image: { cssWidth: 720, cssHeight: 460 },
    fullpage: { cssWidth: 960, cssHeight: 1320 },
  };

  const { cssWidth, cssHeight } = dimensionsByMode[mode];

  return {
    id: `cap_mock_${mode}`,
    mode,
    sourceUrl: 'https://domena.pl/artykul/architektura-manifest-v3',
    sourceDomain: 'domena-pl',
    capturedAt: '2026-11-21T14:10:00.000Z',
    filename: 'domena-pl_2026-11-21_14-10.png',
    cssWidth,
    cssHeight,
    dpr: 2,
    highlightApplied,
  };
}

export function getInitialMockAnnotations(
  mode: CaptureMode = 'viewport',
): AnnotationItem[] {
  if (mode === 'selection') {
    return [
      {
        id: 'ann_1',
        type: 'line',
        subtype: 'highlighter',
        x1: 42,
        y1: 118,
        x2: 520,
        y2: 118,
        color: '#FFCC00',
        strokeWidth: HIGHLIGHTER_STROKE_WIDTH_CSS,
        alpha: HIGHLIGHTER_ALPHA,
      },
      {
        id: 'ann_2',
        type: 'arrow',
        x1: 590,
        y1: 58,
        x2: 470,
        y2: 105,
        color: '#FF3B30',
        strokeWidth: 4,
      },
      {
        id: 'ann_3',
        type: 'text',
        x: 390,
        y: 34,
        text: 'Margines bezpieczeństwa 20 px',
        color: '#FF3B30',
        fontSize: DEFAULT_TEXT_FONT_SIZE_CSS,
        styleMode: 'background',
      },
    ];
  }

  if (mode === 'image') {
    return [
      {
        id: 'ann_1',
        type: 'arrow',
        x1: 150,
        y1: 110,
        x2: 330,
        y2: 215,
        color: '#FF3B30',
        strokeWidth: 4,
      },
      {
        id: 'ann_2',
        type: 'text',
        x: 130,
        y: 74,
        text: 'Wycięto bezpośrednio z captureVisibleTab (bez CORS)',
        color: '#FFFFFF',
        fontSize: DEFAULT_TEXT_FONT_SIZE_CSS,
        styleMode: 'outline',
      },
    ];
  }

  return [
    {
      id: 'ann_1',
      type: 'arrow',
      x1: 640,
      y1: 165,
      x2: 470,
      y2: 245,
      color: '#FF3B30',
      strokeWidth: 4,
    },
    {
      id: 'ann_2',
      type: 'line',
      subtype: 'highlighter',
      x1: 88,
      y1: 262,
      x2: 455,
      y2: 262,
      color: '#FFCC00',
      strokeWidth: HIGHLIGHTER_STROKE_WIDTH_CSS,
      alpha: HIGHLIGHTER_ALPHA,
    },
    {
      id: 'ann_3',
      type: 'text',
      x: 560,
      y: 128,
      text: 'Kluczowy fragment do weryfikacji @2x Retina',
      color: '#FF3B30',
      fontSize: DEFAULT_TEXT_FONT_SIZE_CSS,
      styleMode: 'background',
    },
  ];
}

export function renderMockScreenshotBackdrop(
  ctx: CanvasRenderingContext2D,
  cssWidth: number,
  cssHeight: number,
  dpr: number,
  mode: CaptureMode,
  highlightApplied = false,
): void {
  ctx.save();
  ctx.scale(dpr, dpr);

  // Clean document surface
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, cssWidth, cssHeight);

  if (mode === 'selection') {
    // Safety margin 20px visualization
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 20, cssWidth - 40, cssHeight - 40);

    if (highlightApplied) {
      ctx.fillStyle = 'rgba(255, 235, 59, 0.45)';
      ctx.fillRect(36, 98, cssWidth - 96, 34);
    }

    ctx.fillStyle = '#0F172A';
    ctx.font = "700 20px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
    ctx.fillText(
      'SnapMark — Zrzut zaznaczonego fragmentu tekstu (+20 px)',
      36,
      62,
    );

    ctx.fillStyle = '#334155';
    ctx.font = "400 15px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
    ctx.fillText(
      'Metoda Range.getBoundingClientRect() przemnożona przez devicePixelRatio.',
      36,
      120,
    );
    ctx.fillText(
      'Idealnie ostry kadr Retina bez ręcznego celowania kursorem myszy.',
      36,
      152,
    );
    ctx.restore();
    return;
  }

  if (mode === 'image') {
    // Rich dark photo/chart mockup for image element capture
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    ctx.fillStyle = '#334155';
    ctx.fillRect(36, 36, cssWidth - 72, cssHeight - 72);

    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(80, 260, 90, 110);
    ctx.fillStyle = '#818CF8';
    ctx.fillRect(210, 190, 90, 180);
    ctx.fillStyle = '#F43F5E';
    ctx.fillRect(340, 140, 90, 230);
    ctx.fillStyle = '#34D399';
    ctx.fillRect(470, 110, 90, 260);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = "600 18px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
    ctx.fillText('Element <img> • Wycięty bezpośrednio z widoku karty', 76, 82);
    ctx.restore();
    return;
  }

  // Top header bar (shown once at the top of viewport and fullpage captures)
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, cssWidth, 56);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = "600 15px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
  ctx.fillText('domena.pl — Dokumentacja techniczna Manifest V3', 32, 34);

  // Article content body
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(48, 84, cssWidth - 96, cssHeight - 124);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.strokeRect(48, 84, cssWidth - 96, cssHeight - 124);

  ctx.fillStyle = '#0F172A';
  ctx.font = "700 26px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
  ctx.fillText(
    'Architektura zrzutów ekranu w Chrome Manifest V3',
    88,
    144,
  );

  ctx.fillStyle = '#475569';
  ctx.font = "400 15px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
  const paragraphs = [
    '1. Brak inwazyjnych uprawnień: activeTab, contextMenus, scripting oraz storage.',
    '2. Skalowanie DPI (Retina / 4K): współrzędne CSS mnożone przez window.devicePixelRatio.',
    '3. Limit captureVisibleTab: bezpieczny odstęp >= 550 ms między kolejnymi klatkami.',
    '4. Transfer obrazu: surowy obiekt Blob w IndexedDB czyszczony po wczytaniu na płótno.',
    '5. Warstwa wektorowa: tablica obiektów z pełną historią Ctrl+Z i edycją końcówek.',
  ];

  paragraphs.forEach((line, index) => {
    ctx.fillText(line, 88, 210 + index * 48);
  });

  if (mode === 'fullpage') {
    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(88, 490, cssWidth - 176, 320);
    ctx.fillStyle = '#0F172A';
    ctx.font = "600 18px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
    ctx.fillText(
      'Sekcja #2 (Klatka 2/3) — Nagłówki position: fixed/sticky ukryte automatycznie',
      116,
      540,
    );
    ctx.fillStyle = '#475569';
    ctx.font = "400 14px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
    ctx.fillText(
      'Pływający pasek nawigacyjny z Klatki #1 nie powiela się na kolejnych klatkach zrzutu.',
      116,
      580,
    );
  }

  ctx.restore();
}
