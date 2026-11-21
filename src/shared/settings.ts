import {
  ANNOTATION_COLORS,
  DEFAULT_USER_SETTINGS,
  STROKE_WIDTHS,
} from './constants';
import type {
  AnnotationColor,
  EditorTool,
  StrokeWidth,
  TextStyleMode,
  UserSettings,
} from './types';

export const SETTINGS_STORAGE_KEY = 'snapmark_user_settings';

const VALID_TOOLS: ReadonlySet<EditorTool> = new Set(['arrow', 'line', 'text']);
const VALID_COLORS: ReadonlySet<AnnotationColor> = new Set(
  ANNOTATION_COLORS.map((c) => c.hex),
);
const VALID_STROKE_WIDTHS: ReadonlySet<StrokeWidth> = new Set(
  STROKE_WIDTHS.map((s) => s.value),
);
const VALID_TEXT_STYLES: ReadonlySet<TextStyleMode> = new Set([
  'background',
  'outline',
  'plain',
]);

let inMemoryFallbackSettings: UserSettings = { ...DEFAULT_USER_SETTINGS };
let settingsMutationQueue: Promise<UserSettings> = Promise.resolve({
  ...DEFAULT_USER_SETTINGS,
});

export function sanitizeUserSettings(raw: unknown): UserSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_USER_SETTINGS };
  }

  const candidate = raw as Partial<Record<keyof UserSettings, unknown>>;

  const highlightSelectionBeforeCapture =
    typeof candidate.highlightSelectionBeforeCapture === 'boolean'
      ? candidate.highlightSelectionBeforeCapture
      : DEFAULT_USER_SETTINGS.highlightSelectionBeforeCapture;

  const selectionPaddingPx =
    typeof candidate.selectionPaddingPx === 'number' &&
    Number.isFinite(candidate.selectionPaddingPx) &&
    candidate.selectionPaddingPx >= 0 &&
    candidate.selectionPaddingPx <= 100
      ? Math.round(candidate.selectionPaddingPx)
      : DEFAULT_USER_SETTINGS.selectionPaddingPx;

  const activeTool =
    typeof candidate.activeTool === 'string' &&
    VALID_TOOLS.has(candidate.activeTool as EditorTool)
      ? (candidate.activeTool as EditorTool)
      : DEFAULT_USER_SETTINGS.activeTool;

  const activeColor =
    typeof candidate.activeColor === 'string' &&
    VALID_COLORS.has(candidate.activeColor as AnnotationColor)
      ? (candidate.activeColor as AnnotationColor)
      : DEFAULT_USER_SETTINGS.activeColor;

  const strokeWidth =
    typeof candidate.strokeWidth === 'number' &&
    VALID_STROKE_WIDTHS.has(candidate.strokeWidth as StrokeWidth)
      ? (candidate.strokeWidth as StrokeWidth)
      : DEFAULT_USER_SETTINGS.strokeWidth;

  const textStyleMode =
    typeof candidate.textStyleMode === 'string' &&
    VALID_TEXT_STYLES.has(candidate.textStyleMode as TextStyleMode)
      ? (candidate.textStyleMode as TextStyleMode)
      : DEFAULT_USER_SETTINGS.textStyleMode;

  return {
    highlightSelectionBeforeCapture,
    selectionPaddingPx,
    activeTool,
    activeColor,
    strokeWidth,
    textStyleMode,
  };
}

function hasChromeStorageLocal(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    typeof chrome.storage !== 'undefined' &&
    typeof chrome.storage.local !== 'undefined' &&
    typeof chrome.storage.local.get === 'function' &&
    typeof chrome.storage.local.set === 'function'
  );
}

async function readRawFromStorage(): Promise<unknown> {
  if (hasChromeStorageLocal()) {
    const result = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
    return result?.[SETTINGS_STORAGE_KEY];
  }

  if (typeof localStorage !== 'undefined') {
    try {
      const serialized = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (serialized) {
        return JSON.parse(serialized) as unknown;
      }
    } catch {
      // Fallback to in-memory
    }
  }

  return inMemoryFallbackSettings;
}

async function writeRawToStorage(settings: UserSettings): Promise<void> {
  inMemoryFallbackSettings = { ...settings };

  if (hasChromeStorageLocal()) {
    await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: settings });
    return;
  }

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignored in restricted storage contexts
    }
  }
}

export async function loadUserSettings(): Promise<UserSettings> {
  try {
    const raw = await readRawFromStorage();
    return sanitizeUserSettings(raw);
  } catch {
    return { ...DEFAULT_USER_SETTINGS };
  }
}

export async function saveUserSettings(
  settings: UserSettings,
): Promise<UserSettings> {
  const sanitized = sanitizeUserSettings(settings);
  await writeRawToStorage(sanitized);
  return sanitized;
}

export async function updateUserSettings(
  patch: Partial<UserSettings>,
): Promise<UserSettings> {
  const run = async (): Promise<UserSettings> => {
    const current = await loadUserSettings();
    const merged = sanitizeUserSettings({ ...current, ...patch });
    await writeRawToStorage(merged);
    return merged;
  };
  const next = settingsMutationQueue.then(run, run);
  settingsMutationQueue = next;
  return await next;
}

export async function resetUserSettings(): Promise<UserSettings> {
  const defaults = { ...DEFAULT_USER_SETTINGS };
  await writeRawToStorage(defaults);
  return defaults;
}
