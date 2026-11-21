/**
 * Shared domain types for SnapMark (from .speccraft/docs/02-General-PRD.md §6.3 & §8)
 */

export type CaptureMode = 'selection' | 'image' | 'viewport' | 'fullpage';

export type EditorTool = 'arrow' | 'line' | 'text';

export type LineSubtype = 'underline' | 'highlighter';

export type TextStyleMode = 'background' | 'outline' | 'plain';

export type StrokeWidth = 2 | 4 | 8;

export type AnnotationColor =
  | '#FF3B30'
  | '#FFCC00'
  | '#34C759'
  | '#007AFF'
  | '#FFFFFF'
  | '#1C1C1E';

export interface CssRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CaptureFrame {
  blob: Blob;
  scrollYCss: number;
  viewportWidthCss: number;
  viewportHeightCss: number;
}

export interface CaptureSession {
  id: string;
  mode: CaptureMode;
  sourceUrl: string;
  sourceDomain: string;
  capturedAt: string;
  dpr: number;
  cropRectCss?: CssRect;
  frames: CaptureFrame[];
  totalWidthCss: number;
  totalHeightCss: number;
  exceededMaxHeight?: boolean;
}

export interface ArrowAnnotation {
  id: string;
  type: 'arrow';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: AnnotationColor;
  strokeWidth: StrokeWidth;
}

export interface LineAnnotation {
  id: string;
  type: 'line';
  subtype: LineSubtype;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: AnnotationColor;
  strokeWidth: number;
  alpha: number;
}

export interface TextAnnotation {
  id: string;
  type: 'text';
  x: number;
  y: number;
  text: string;
  color: AnnotationColor;
  fontSize: number;
  styleMode: TextStyleMode;
}

export type AnnotationItem =
  | ArrowAnnotation
  | LineAnnotation
  | TextAnnotation;

export interface UserSettings {
  highlightSelectionBeforeCapture: boolean;
  selectionPaddingPx: number;
  activeTool: EditorTool;
  activeColor: AnnotationColor;
  strokeWidth: StrokeWidth;
  textStyleMode: TextStyleMode;
}

export type PopupPrototypeState =
  | 'default'
  | 'no-selection'
  | 'progress'
  | 'restricted';

export type EditorPrototypeState =
  | 'default'
  | 'empty'
  | 'max-height-warning';

export interface MockCaptureMetadata {
  id: string;
  mode: CaptureMode;
  sourceUrl: string;
  sourceDomain: string;
  capturedAt: string;
  filename: string;
  cssWidth: number;
  cssHeight: number;
  dpr: number;
  highlightApplied: boolean;
}
