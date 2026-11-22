import type { AnnotationColor, TextStyleMode } from '../shared/types';

export interface ActiveTextEditorDraft {
  editingAnnotationId: string | null;
  x: number;
  y: number;
  text: string;
  color: AnnotationColor;
  fontSize: number;
  styleMode: TextStyleMode;
}

export interface TextOverlayCallbacks {
  onInput: (text: string) => void;
  onCommit: (text: string) => void;
  onCancel: () => void;
}

/**
 * Mounts or updates the interactive in-canvas `<textarea id="active-text-input">`
 * inside `#text-overlay-layer` for placing or editing vector text annotations.
 */
export function renderTextOverlayLayer(
  overlayLayer: HTMLElement | null,
  draft: ActiveTextEditorDraft | null,
  callbacks: TextOverlayCallbacks,
): HTMLTextAreaElement | null {
  if (!overlayLayer) {
    return null;
  }

  overlayLayer.innerHTML = '';
  if (!draft) {
    return null;
  }

  const textarea = document.createElement('textarea');
  textarea.id = 'active-text-input';
  textarea.className = `canvas-text-input is-style-${draft.styleMode}`;
  textarea.setAttribute('data-style-mode', draft.styleMode);
  textarea.setAttribute('aria-label', 'Pole tekstowe adnotacji');
  textarea.placeholder = 'Wpisz tekst...';
  textarea.value = draft.text;

  textarea.style.left = `${draft.x}px`;
  textarea.style.top = `${draft.y}px`;
  textarea.style.color = draft.color;
  textarea.style.fontSize = `${draft.fontSize}px`;

  if (draft.styleMode === 'background') {
    const isLightColor =
      draft.color === '#FFFFFF' || draft.color === '#FFCC00';
    textarea.style.backgroundColor = isLightColor
      ? 'rgba(28, 28, 30, 0.92)'
      : 'rgba(24, 26, 33, 0.92)';
    textarea.style.borderColor = draft.color;
  } else if (draft.styleMode === 'outline') {
    textarea.style.backgroundColor = 'rgba(15, 17, 21, 0.35)';
    const outlineColor =
      draft.color === '#FFFFFF' ? '#1C1C1E' : '#FFFFFF';
    textarea.style.textShadow = `-1px -1px 0 ${outlineColor}, 1px -1px 0 ${outlineColor}, -1px 1px 0 ${outlineColor}, 1px 1px 0 ${outlineColor}`;
  } else {
    textarea.style.backgroundColor = 'rgba(15, 17, 21, 0.25)';
  }

  let settled = false;

  textarea.addEventListener('input', () => {
    callbacks.onInput(textarea.value);
  });

  textarea.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      if (!settled) {
        settled = true;
        callbacks.onCommit(textarea.value);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (!settled) {
        settled = true;
        callbacks.onCancel();
      }
    }
  });

  textarea.addEventListener('blur', () => {
    if (!settled) {
      settled = true;
      callbacks.onCommit(textarea.value);
    }
  });

  overlayLayer.appendChild(textarea);
  try {
    textarea.focus();
    const len = textarea.value.length;
    textarea.setSelectionRange(len, len);
  } catch {
    // Ignore selection range errors in non-browser test runners
  }

  return textarea;
}
