import { DEFAULT_USER_SETTINGS } from '../shared/constants';
import { parsePopupStateFromSearch } from '../shared/mock-captures';
import { loadUserSettings, updateUserSettings } from '../shared/settings';
import type {
  CancelScrollCaptureRequest,
  PopupPrototypeState,
  RuntimeCaptureRequest,
  RuntimeCaptureResponse,
  ScrollCaptureProgressMessage,
} from '../shared/types';
import { isRestrictedBrowserUrl } from '../shared/url-guard';

export interface RenderPopupOptions {
  initialSearch?: string;
  onNavigate?: (url: string) => void;
}

export interface PopupController {
  getState: () => PopupPrototypeState;
  setState: (nextState: PopupPrototypeState) => void;
  isHighlightEnabled: () => boolean;
  ready: Promise<void>;
}

function hasExplicitStateParam(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.has('state');
}

export function renderPopup(
  container: HTMLElement,
  options: RenderPopupOptions = {},
): PopupController {
  const initialSearch =
    options.initialSearch ??
    (typeof window !== 'undefined' ? window.location.search : '');

  const explicitStateOverride = hasExplicitStateParam(initialSearch);

  const navigate =
    options.onNavigate ??
    ((url: string) => {
      if (typeof window !== 'undefined') {
        window.location.href = url;
      }
    });

  let currentState: PopupPrototypeState =
    parsePopupStateFromSearch(initialSearch);
  let highlightSelectionBeforeCapture: boolean =
    DEFAULT_USER_SETTINGS.highlightSelectionBeforeCapture;
  let currentFrame = 3;
  let totalFrames = 8;
  let progressStatusText =
    'Klatka 3 z 8 • Ukrywanie pływających nagłówków (fixed/sticky)...';

  function render(): void {
    const hasTextSelection = currentState !== 'no-selection';
    const progressPercent = Math.round(
      (currentFrame / Math.max(1, totalFrames)) * 100,
    );

    container.innerHTML = `
      <div class="popup-shell" data-popup-state="${currentState}">
        <header class="popup-header">
          <div class="brand-badge">
            <span class="brand-logo popup-brand-logo" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6V3h3M10 3h3v3M13 10v3h-3M6 13H3v-3" />
                <path d="M6 10l4-4M10 10V6H6" />
              </svg>
            </span>
            <span class="brand-title">SnapMark</span>
          </div>
          <span class="popup-privacy-pill">Lokalny • MV3</span>
        </header>

        ${
          currentState === 'restricted'
            ? `
          <section id="restricted-banner" class="status-banner is-danger" role="alert">
            <div class="restricted-banner-content">
              <h2 class="restricted-banner-title">Strona chroniona przez przeglądarkę</h2>
              <p class="restricted-banner-message">
                Ze względów bezpieczeństwa Chrome blokuje wykonywanie zrzutów na stronach systemowych (chrome://) oraz w Chrome Web Store. Otwórz dowolną zwykłą stronę WWW.
              </p>
            </div>
          </section>
        `
            : currentState === 'progress'
              ? `
          <section id="scroll-progress-panel" class="scroll-progress-panel" aria-live="polite">
            <div class="scroll-progress-header">
              <h2 class="scroll-progress-title">Przechwytywanie całej strony...</h2>
              <span class="scroll-progress-badge">${currentFrame}/${totalFrames}</span>
            </div>
            <p id="scroll-progress-text" class="scroll-progress-detail">
              ${progressStatusText}
            </p>
            <div class="scroll-progress-track" role="progressbar" aria-valuenow="${progressPercent}" aria-valuemin="0" aria-valuemax="100">
              <div class="scroll-progress-fill" style="width: ${progressPercent}%;"></div>
            </div>
            <div class="scroll-progress-actions">
              <button type="button" id="btn-finish-scroll-demo" class="btn-primary">
                Otwórz sklejony zrzut w edytorze
              </button>
              <button type="button" id="btn-cancel-scroll" class="btn-secondary">
                Anuluj i zatrzymaj (Esc)
              </button>
            </div>
          </section>
        `
              : `
          <main class="popup-capture-stack" aria-label="Tryby przechwytywania">
            <button type="button" id="btn-capture-viewport" class="popup-action-card">
              <span class="popup-card-left">
                <svg class="popup-card-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect x="2.5" y="3.5" width="15" height="11" rx="2" />
                  <path d="M6.5 17.5h7M10 14.5v3" />
                </svg>
                <span class="popup-card-text">
                  <span class="popup-card-title">Widoczny ekran</span>
                  <span class="popup-card-subtitle">Natychmiastowy zrzut aktualnego widoku</span>
                </span>
              </span>
              <kbd class="kbd-badge">Alt+Shift+V</kbd>
            </button>

            <button type="button" id="btn-capture-fullpage" class="popup-action-card">
              <span class="popup-card-left">
                <svg class="popup-card-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect x="4" y="2.5" width="12" height="15" rx="2" />
                  <path d="M7.5 6.5h5M7.5 10h5M10 12.5v2.5m0 0l-1.5-1.5M10 15l1.5-1.5" />
                </svg>
                <span class="popup-card-text">
                  <span class="popup-card-title">Cała strona ze scrollem</span>
                  <span class="popup-card-subtitle">Skleja klatki i ukrywa pływające nagłówki</span>
                </span>
              </span>
              <kbd class="kbd-badge">Alt+Shift+F</kbd>
            </button>

            <button
              type="button"
              id="btn-capture-selection"
              class="popup-action-card ${hasTextSelection ? '' : 'is-disabled'}"
              aria-disabled="${hasTextSelection ? 'false' : 'true'}"
            >
              <span class="popup-card-left">
                <svg class="popup-card-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M6 4h8M10 4v12M6 16h8M4 7.5h2.5M13.5 12.5H16" />
                </svg>
                <span class="popup-card-text">
                  <span class="popup-card-title">Zaznaczony fragment tekstu</span>
                  <span id="selection-card-subtitle" class="popup-card-subtitle ${hasTextSelection ? 'is-ready' : 'is-muted'}">
                    ${
                      hasTextSelection
                        ? 'Gotowe: wytnij zaznaczenie (+20 px marginesu)'
                        : 'Zaznacz tekst na stronie lub użyj PPM'
                    }
                  </span>
                </span>
              </span>
              <kbd class="kbd-badge">Alt+Shift+S</kbd>
            </button>
          </main>

          <aside class="image-hint-strip" aria-label="Wskazówka dla obrazków">
            <svg class="image-hint-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="2" y="2.5" width="12" height="11" rx="2" />
              <circle cx="5.5" cy="6" r="1.2" />
              <path d="M14 10.5l-3-3-5.5 5.5" />
            </svg>
            <span>
              Wskazówka: Kliknij <strong>PPM na dowolnym obrazku</strong>, aby wyciąć go z pominięciem blokad CORS i WebP/AVIF.
            </span>
          </aside>
        `
        }

        <footer class="popup-footer">
          <div class="popup-setting-label-group" id="label-toggle-highlight">
            <span class="popup-setting-title">Podświetl zaznaczony tekst na żółto</span>
            <span class="popup-setting-caption">Tymczasowy marker przed zrzutem</span>
          </div>
          <button
            type="button"
            id="toggle-highlight"
            class="toggle-switch"
            role="switch"
            aria-checked="${highlightSelectionBeforeCapture ? 'true' : 'false'}"
            aria-labelledby="label-toggle-highlight"
          >
            <span class="toggle-switch-thumb"></span>
          </button>
        </footer>
      </div>
    `;

    bindEvents();
  }

  function hasLiveRuntimeMessaging(): boolean {
    return (
      !options.onNavigate &&
      typeof chrome !== 'undefined' &&
      typeof chrome.runtime !== 'undefined' &&
      typeof chrome.runtime.sendMessage === 'function'
    );
  }

  function closePopupWindow(): void {
    if (
      typeof navigator !== 'undefined' &&
      /jsdom/i.test(navigator.userAgent ?? '')
    ) {
      return;
    }
    if (typeof window !== 'undefined' && typeof window.close === 'function') {
      window.close();
    }
  }

  function bindEvents(): void {
    const viewportBtn = container.querySelector<HTMLButtonElement>(
      '#btn-capture-viewport',
    );
    const fullpageBtn = container.querySelector<HTMLButtonElement>(
      '#btn-capture-fullpage',
    );
    const selectionBtn = container.querySelector<HTMLButtonElement>(
      '#btn-capture-selection',
    );
    const toggleHighlightBtn =
      container.querySelector<HTMLButtonElement>('#toggle-highlight');
    const toggleHighlightLabel = container.querySelector<HTMLElement>(
      '#label-toggle-highlight',
    );
    const cancelScrollBtn =
      container.querySelector<HTMLButtonElement>('#btn-cancel-scroll');
    const finishScrollDemoBtn = container.querySelector<HTMLButtonElement>(
      '#btn-finish-scroll-demo',
    );

    viewportBtn?.addEventListener('click', () => {
      if (hasLiveRuntimeMessaging()) {
        const message: RuntimeCaptureRequest = {
          type: 'SNAPMARK_TRIGGER_CAPTURE',
          mode: 'viewport',
        };
        void Promise.resolve(
          chrome.runtime.sendMessage(message) as unknown as
            | Promise<RuntimeCaptureResponse>
            | RuntimeCaptureResponse,
        )
          .then((res) => {
            if (res && typeof res === 'object' && 'ok' in res && res.ok) {
              closePopupWindow();
            }
          })
          .catch(() => {
            navigate('editor.html?mode=viewport');
          });
        return;
      }
      navigate('editor.html?mode=viewport');
    });

    fullpageBtn?.addEventListener('click', () => {
      currentState = 'progress';
      render();
      if (hasLiveRuntimeMessaging()) {
        const message: RuntimeCaptureRequest = {
          type: 'SNAPMARK_TRIGGER_CAPTURE',
          mode: 'fullpage',
        };
        void Promise.resolve(
          chrome.runtime.sendMessage(message) as unknown as
            | Promise<RuntimeCaptureResponse>
            | RuntimeCaptureResponse,
        )
          .then((res) => {
            if (res && typeof res === 'object' && 'ok' in res && res.ok) {
              closePopupWindow();
            }
          })
          .catch(() => {
            // Keep progress panel visible in dev/fallback mode
          });
      }
    });

    selectionBtn?.addEventListener('click', () => {
      if (selectionBtn.getAttribute('aria-disabled') === 'true') {
        return;
      }
      if (hasLiveRuntimeMessaging()) {
        const message: RuntimeCaptureRequest = {
          type: 'SNAPMARK_TRIGGER_CAPTURE',
          mode: 'selection',
        };
        void Promise.resolve(
          chrome.runtime.sendMessage(message) as unknown as
            | Promise<RuntimeCaptureResponse>
            | RuntimeCaptureResponse,
        )
          .then((res) => {
            if (res && typeof res === 'object' && 'ok' in res && res.ok) {
              closePopupWindow();
            }
          })
          .catch(() => {
            const highlightFlag = highlightSelectionBeforeCapture ? '1' : '0';
            navigate(`editor.html?mode=selection&highlight=${highlightFlag}`);
          });
        return;
      }
      const highlightFlag = highlightSelectionBeforeCapture ? '1' : '0';
      navigate(`editor.html?mode=selection&highlight=${highlightFlag}`);
    });

    const toggleHighlight = (): void => {
      highlightSelectionBeforeCapture = !highlightSelectionBeforeCapture;
      toggleHighlightBtn?.setAttribute(
        'aria-checked',
        highlightSelectionBeforeCapture ? 'true' : 'false',
      );
      void updateUserSettings({
        highlightSelectionBeforeCapture,
      });
    };

    toggleHighlightBtn?.addEventListener('click', toggleHighlight);
    toggleHighlightLabel?.addEventListener('click', toggleHighlight);

    cancelScrollBtn?.addEventListener('click', () => {
      if (
        typeof chrome !== 'undefined' &&
        chrome.runtime &&
        typeof chrome.runtime.sendMessage === 'function'
      ) {
        const cancelMsg: CancelScrollCaptureRequest = {
          type: 'SNAPMARK_CANCEL_SCROLL_CAPTURE',
        };
        void Promise.resolve(chrome.runtime.sendMessage(cancelMsg)).catch(
          () => {},
        );
      }
      currentState = 'default';
      render();
    });

    finishScrollDemoBtn?.addEventListener('click', () => {
      navigate('editor.html?mode=fullpage');
    });
  }

  async function hydrateSettingsAndActiveTab(): Promise<void> {
    const savedSettings = await loadUserSettings();
    highlightSelectionBeforeCapture =
      savedSettings.highlightSelectionBeforeCapture;

    if (
      !explicitStateOverride &&
      typeof chrome !== 'undefined' &&
      chrome.tabs &&
      typeof chrome.tabs.query === 'function'
    ) {
      try {
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        const activeTab = tabs?.[0];
        if (activeTab) {
          if (isRestrictedBrowserUrl(activeTab.url)) {
            currentState = 'restricted';
          } else if (
            typeof activeTab.id === 'number' &&
            chrome.scripting &&
            typeof chrome.scripting.executeScript === 'function'
          ) {
            try {
              const results = await chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: () =>
                  (window.getSelection()?.toString().trim().length ?? 0) > 0,
              });
              const hasSel = Boolean(results?.[0]?.result);
              currentState = hasSel ? 'default' : 'no-selection';
            } catch {
              // Keep currentState as default when script check is unavailable
            }
          }
        }
      } catch {
        // Ignore tab query errors outside extension runtime
      }
    }

    render();
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Escape' && currentState === 'progress') {
        if (
          typeof chrome !== 'undefined' &&
          chrome.runtime &&
          typeof chrome.runtime.sendMessage === 'function'
        ) {
          const cancelMsg: CancelScrollCaptureRequest = {
            type: 'SNAPMARK_CANCEL_SCROLL_CAPTURE',
          };
          void Promise.resolve(chrome.runtime.sendMessage(cancelMsg)).catch(
            () => {},
          );
        }
        currentState = 'default';
        render();
      }
    });
  }

  if (
    typeof chrome !== 'undefined' &&
    chrome.runtime &&
    chrome.runtime.onMessage &&
    typeof chrome.runtime.onMessage.addListener === 'function'
  ) {
    chrome.runtime.onMessage.addListener((rawMessage: unknown) => {
      if (!rawMessage || typeof rawMessage !== 'object') {
        return;
      }
      const msg = rawMessage as Partial<ScrollCaptureProgressMessage>;
      if (
        msg.type === 'SNAPMARK_SCROLL_PROGRESS' &&
        typeof msg.currentFrame === 'number' &&
        typeof msg.totalFrames === 'number'
      ) {
        currentFrame = msg.currentFrame;
        totalFrames = Math.max(1, msg.totalFrames);
        progressStatusText =
          typeof msg.statusText === 'string' && msg.statusText.length > 0
            ? msg.statusText
            : `Klatka ${currentFrame} z ${totalFrames} • Ukrywanie pływających nagłówków (fixed/sticky)...`;
        currentState = 'progress';
        render();
      }
    });
  }

  render();
  const ready = hydrateSettingsAndActiveTab();

  return {
    getState: () => currentState,
    setState: (nextState: PopupPrototypeState) => {
      currentState = nextState;
      render();
    },
    isHighlightEnabled: () => highlightSelectionBeforeCapture,
    ready,
  };
}

if (typeof document !== 'undefined') {
  const root = document.getElementById('popup-app');
  if (root) {
    renderPopup(root);
  }
}
