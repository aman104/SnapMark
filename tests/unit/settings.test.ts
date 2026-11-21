import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_SETTINGS } from '../../src/shared/constants';
import {
  loadUserSettings,
  resetUserSettings,
  sanitizeUserSettings,
  SETTINGS_STORAGE_KEY,
  updateUserSettings,
} from '../../src/shared/settings';

describe('Task 008: Persistent user settings wrapper for chrome.storage.local', () => {
  beforeEach(async () => {
    localStorage.clear();
    await resetUserSettings();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns DEFAULT_USER_SETTINGS when storage is empty', async () => {
    localStorage.clear();
    const settings = await loadUserSettings();
    expect(settings).toEqual(DEFAULT_USER_SETTINGS);
  });

  it('persists partial updates via updateUserSettings and preserves other fields', async () => {
    const updated = await updateUserSettings({
      highlightSelectionBeforeCapture: true,
      activeColor: '#FFCC00',
      strokeWidth: 8,
    });

    expect(updated.highlightSelectionBeforeCapture).toBe(true);
    expect(updated.activeColor).toBe('#FFCC00');
    expect(updated.strokeWidth).toBe(8);
    expect(updated.activeTool).toBe('arrow');

    const reloaded = await loadUserSettings();
    expect(reloaded).toEqual(updated);
  });

  it('sanitizes invalid or corrupted settings values back to DEFAULT_USER_SETTINGS', () => {
    const sanitized = sanitizeUserSettings({
      highlightSelectionBeforeCapture: 'yes-please',
      selectionPaddingPx: -50,
      activeTool: 'paintbrush',
      activeColor: '#123456',
      strokeWidth: 99,
      textStyleMode: 'shadow-3d',
    });

    expect(sanitized).toEqual(DEFAULT_USER_SETTINGS);
  });

  it('reads and writes through chrome.storage.local when available in the extension runtime', async () => {
    const store: Record<string, unknown> = {};
    const getMock = vi.fn(async (key: string) => ({ [key]: store[key] }));
    const setMock = vi.fn(async (items: Record<string, unknown>) => {
      Object.assign(store, items);
    });

    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: getMock,
          set: setMock,
        },
      },
    });

    await updateUserSettings({
      highlightSelectionBeforeCapture: true,
      textStyleMode: 'outline',
    });

    expect(setMock).toHaveBeenCalledTimes(1);
    expect(store[SETTINGS_STORAGE_KEY]).toMatchObject({
      highlightSelectionBeforeCapture: true,
      textStyleMode: 'outline',
    });

    const loaded = await loadUserSettings();
    expect(getMock).toHaveBeenCalledWith(SETTINGS_STORAGE_KEY);
    expect(loaded.highlightSelectionBeforeCapture).toBe(true);
    expect(loaded.textStyleMode).toBe('outline');
  });
});
