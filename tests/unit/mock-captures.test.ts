import { describe, expect, it } from 'vitest';
import {
  ANNOTATION_COLORS,
  DEFAULT_USER_SETTINGS,
  HIGHLIGHTER_ALPHA,
  SCROLL_CAPTURE_THROTTLE_MS,
  SELECTION_PADDING_PX,
  STROKE_WIDTHS,
} from '../../src/shared/constants';
import {
  getInitialMockAnnotations,
  getMockCaptureMetadata,
  parseEditorStateFromSearch,
  parsePopupStateFromSearch,
} from '../../src/shared/mock-captures';

describe('Task 003: Shared types, constants, and mock capture fixtures', () => {
  it('defines default user settings matching 02-General-PRD.md §8', () => {
    expect(DEFAULT_USER_SETTINGS).toEqual({
      highlightSelectionBeforeCapture: false,
      selectionPaddingPx: 20,
      activeTool: 'arrow',
      activeColor: '#FF3B30',
      strokeWidth: 8,
      textStyleMode: 'plain',
    });
    expect(SELECTION_PADDING_PX).toBe(20);
    expect(SCROLL_CAPTURE_THROTTLE_MS).toBe(550);
    expect(HIGHLIGHTER_ALPHA).toBe(0.35);
  });

  it('provides the 6 annotation colors starting with Signal Red #FF3B30 and 3 stroke widths', () => {
    expect(ANNOTATION_COLORS.map((c) => c.hex)).toEqual([
      '#FF3B30',
      '#FFCC00',
      '#34C759',
      '#007AFF',
      '#FFFFFF',
      '#1C1C1E',
    ]);
    expect(STROKE_WIDTHS.map((s) => s.value)).toEqual([8, 4, 2]);
  });

  it('parses popup prototype states from URL search strings with safe fallback', () => {
    expect(parsePopupStateFromSearch('')).toBe('default');
    expect(parsePopupStateFromSearch('?state=default')).toBe('default');
    expect(parsePopupStateFromSearch('?state=no-selection')).toBe(
      'no-selection',
    );
    expect(parsePopupStateFromSearch('?state=progress')).toBe('progress');
    expect(parsePopupStateFromSearch('?state=restricted')).toBe('restricted');
    expect(parsePopupStateFromSearch('?state=unknown-value')).toBe('default');
  });

  it('parses editor prototype states, capture modes, and highlight flags from URL search strings', () => {
    expect(parseEditorStateFromSearch('')).toEqual({
      state: 'default',
      mode: 'viewport',
      highlightApplied: false,
    });
    expect(
      parseEditorStateFromSearch('?state=empty&mode=selection&highlight=1'),
    ).toEqual({
      state: 'empty',
      mode: 'selection',
      highlightApplied: true,
    });
    expect(
      parseEditorStateFromSearch('?state=max-height-warning&mode=fullpage'),
    ).toEqual({
      state: 'max-height-warning',
      mode: 'fullpage',
      highlightApplied: false,
    });
    expect(parseEditorStateFromSearch('?state=invalid&mode=invalid')).toEqual({
      state: 'default',
      mode: 'viewport',
      highlightApplied: false,
    });
  });

  it('returns HiDPI @2x metadata and sample vector annotations for each capture mode', () => {
    const meta = getMockCaptureMetadata('selection', true);
    expect(meta.filename).toBe('domena-pl_2026-11-21_14-10.png');
    expect(meta.dpr).toBe(2);
    expect(meta.highlightApplied).toBe(true);
    expect(meta.cssWidth).toBeGreaterThan(0);
    expect(meta.cssHeight).toBeGreaterThan(0);

    const annotations = getInitialMockAnnotations('viewport');
    expect(annotations.length).toBe(3);
    const arrow = annotations.find((a) => a.type === 'arrow');
    const line = annotations.find((a) => a.type === 'line');
    const text = annotations.find((a) => a.type === 'text');

    expect(arrow?.color).toBe('#FF3B30');
    expect(line && line.type === 'line' ? line.alpha : 0).toBe(0.35);
    expect(text && text.type === 'text' ? text.styleMode : '').toBe(
      'background',
    );
  });
});
