import type { AnnotationColor, StrokeWidth, UserSettings } from './types';

export interface ColorSwatchOption {
  hex: AnnotationColor;
  label: string;
}

export const ANNOTATION_COLORS: readonly ColorSwatchOption[] = [
  { hex: '#FF3B30', label: 'Czerwony (Signal Red)' },
  { hex: '#FFCC00', label: 'Żółty (Vivid Yellow)' },
  { hex: '#34C759', label: 'Zielony (Emerald Green)' },
  { hex: '#007AFF', label: 'Niebieski (Electric Blue)' },
  { hex: '#FFFFFF', label: 'Biały (Pure White)' },
  { hex: '#1C1C1E', label: 'Ciemny (Carbon Dark)' },
] as const;

export interface StrokeWidthOption {
  value: StrokeWidth;
  shortLabel: string;
  label: string;
}

export const STROKE_WIDTHS: readonly StrokeWidthOption[] = [
  { value: 2, shortLabel: 'Cienka (2px)', label: 'Cienka 2px' },
  { value: 4, shortLabel: 'Średnia (4px)', label: 'Średnia 4px' },
  { value: 8, shortLabel: 'Gruba (8px)', label: 'Gruba 8px' },
] as const;

export const DEFAULT_USER_SETTINGS: Readonly<UserSettings> = {
  highlightSelectionBeforeCapture: false,
  selectionPaddingPx: 20,
  activeTool: 'arrow',
  activeColor: '#FF3B30',
  strokeWidth: 4,
  textStyleMode: 'background',
};

export const SELECTION_PADDING_PX = 20;
export const SCROLL_CAPTURE_THROTTLE_MS = 550;
export const HIGHLIGHTER_ALPHA = 0.35;
export const HIGHLIGHTER_STROKE_WIDTH_CSS = 24;
export const DEFAULT_TEXT_FONT_SIZE_CSS = 20;
export const MAX_CANVAS_HEIGHT = 16384;
