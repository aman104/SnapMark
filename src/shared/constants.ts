import type { AnnotationColor, StrokeWidth, UserSettings } from './types';

export interface ColorSwatchOption {
  hex: AnnotationColor;
  label: string;
}

export const ANNOTATION_COLORS: readonly ColorSwatchOption[] = [
  { hex: '#FF3B30', label: 'Red (Signal Red)' },
  { hex: '#FFCC00', label: 'Yellow (Vivid Yellow)' },
  { hex: '#34C759', label: 'Green (Emerald Green)' },
  { hex: '#007AFF', label: 'Blue (Electric Blue)' },
  { hex: '#FFFFFF', label: 'White (Pure White)' },
  { hex: '#1C1C1E', label: 'Dark (Carbon Dark)' },
] as const;

export interface StrokeWidthOption {
  value: StrokeWidth;
  shortLabel: string;
  label: string;
}

export const STROKE_WIDTHS: readonly StrokeWidthOption[] = [
  { value: 8, shortLabel: 'Thick (8px)', label: 'Thick 8px' },
  { value: 4, shortLabel: 'Medium (4px)', label: 'Medium 4px' },
  { value: 2, shortLabel: 'Thin (2px)', label: 'Thin 2px' },
] as const;

export const DEFAULT_USER_SETTINGS: Readonly<UserSettings> = {
  highlightSelectionBeforeCapture: false,
  selectionPaddingPx: 20,
  activeTool: 'arrow',
  activeColor: '#FF3B30',
  strokeWidth: 8,
  textStyleMode: 'plain',
};

export const DEFAULT_LINE_STROKE_WIDTH: StrokeWidth = 4;

export const SELECTION_PADDING_PX = 20;
export const SCROLL_CAPTURE_THROTTLE_MS = 550;
export const HIGHLIGHTER_ALPHA = 0.35;
export const HIGHLIGHTER_STROKE_WIDTH_CSS = 24;
export const DEFAULT_TEXT_FONT_SIZE_CSS = 20;
export const MAX_CANVAS_HEIGHT = 16384;
