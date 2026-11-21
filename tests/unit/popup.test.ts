import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderPopup } from '../../src/popup/index';
import { resetUserSettings } from '../../src/shared/settings';

describe('Task 004 & 012: Extension popup UI states, persistent settings, and live Chrome triggers', () => {
  beforeEach(async () => {
    localStorage.clear();
    await resetUserSettings();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the default ready state with 3 capture cards, image PPM hint, and highlight switch', () => {
    const container = document.createElement('div');
    renderPopup(container, { initialSearch: '?state=default' });

    expect(container.querySelector('.brand-title')?.textContent).toBe(
      'SnapMark',
    );
    expect(container.querySelector('.popup-privacy-pill')?.textContent).toBe(
      'Lokalny • MV3',
    );

    const viewportBtn = container.querySelector('#btn-capture-viewport');
    const fullpageBtn = container.querySelector('#btn-capture-fullpage');
    const selectionBtn = container.querySelector('#btn-capture-selection');

    expect(viewportBtn).not.toBeNull();
    expect(fullpageBtn).not.toBeNull();
    expect(selectionBtn).not.toBeNull();
    expect(selectionBtn?.getAttribute('aria-disabled')).toBe('false');
    expect(
      container.querySelector('#selection-card-subtitle')?.textContent,
    ).toContain('Gotowe: wytnij zaznaczenie (+20 px marginesu)');
    expect(
      container.querySelector('.image-hint-strip')?.textContent,
    ).toContain('PPM na dowolnym obrazku');

    const toggle = container.querySelector('#toggle-highlight');
    expect(toggle?.getAttribute('aria-checked')).toBe('false');
  });

  it('renders the no-selection state with muted disabled selection card', () => {
    const container = document.createElement('div');
    renderPopup(container, { initialSearch: '?state=no-selection' });

    const selectionBtn = container.querySelector<HTMLButtonElement>(
      '#btn-capture-selection',
    );
    expect(selectionBtn?.getAttribute('aria-disabled')).toBe('true');
    expect(
      container.querySelector('#selection-card-subtitle')?.textContent,
    ).toContain('Zaznacz tekst na stronie lub użyj PPM');

    const onNavigate = vi.fn();
    renderPopup(container, {
      initialSearch: '?state=no-selection',
      onNavigate,
    });
    container
      .querySelector<HTMLButtonElement>('#btn-capture-selection')
      ?.click();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('toggles yellow highlight switch, persists it in settings, and navigates to editor.html', async () => {
    const container = document.createElement('div');
    const onNavigate = vi.fn();
    const controller = renderPopup(container, {
      initialSearch: '?state=default',
      onNavigate,
    });
    await controller.ready;

    const toggle =
      container.querySelector<HTMLButtonElement>('#toggle-highlight');
    expect(controller.isHighlightEnabled()).toBe(false);

    toggle?.click();
    expect(controller.isHighlightEnabled()).toBe(true);
    expect(toggle?.getAttribute('aria-checked')).toBe('true');

    // Allow the async updateUserSettings() write microtask to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Re-mounting a fresh popup instance loads the persisted highlight setting
    const secondContainer = document.createElement('div');
    const secondController = renderPopup(secondContainer, {
      initialSearch: '?state=default',
    });
    await secondController.ready;
    expect(secondController.isHighlightEnabled()).toBe(true);
    expect(
      secondContainer
        .querySelector('#toggle-highlight')
        ?.getAttribute('aria-checked'),
    ).toBe('true');

    container
      .querySelector<HTMLButtonElement>('#btn-capture-selection')
      ?.click();
    expect(onNavigate).toHaveBeenCalledWith(
      'editor.html?mode=selection&highlight=1',
    );

    container
      .querySelector<HTMLButtonElement>('#btn-capture-viewport')
      ?.click();
    expect(onNavigate).toHaveBeenCalledWith('editor.html?mode=viewport');
  });

  it('renders the full-page scroll progress state and supports cancellation via button or Escape key', () => {
    const container = document.createElement('div');
    const onNavigate = vi.fn();
    const controller = renderPopup(container, {
      initialSearch: '?state=default',
      onNavigate,
    });

    container
      .querySelector<HTMLButtonElement>('#btn-capture-fullpage')
      ?.click();
    expect(controller.getState()).toBe('progress');

    const progressPanel = container.querySelector('#scroll-progress-panel');
    expect(progressPanel).not.toBeNull();
    expect(
      container.querySelector('#scroll-progress-text')?.textContent,
    ).toContain('Klatka 3 z 8');

    container
      .querySelector<HTMLButtonElement>('#btn-finish-scroll-demo')
      ?.click();
    expect(onNavigate).toHaveBeenCalledWith('editor.html?mode=fullpage');

    container.querySelector<HTMLButtonElement>('#btn-cancel-scroll')?.click();
    expect(controller.getState()).toBe('default');
    expect(container.querySelector('#scroll-progress-panel')).toBeNull();

    renderPopup(container, { initialSearch: '?state=progress' });
    expect(container.querySelector('#scroll-progress-panel')).not.toBeNull();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(container.querySelector('#scroll-progress-panel')).toBeNull();
  });

  it('renders the restricted page danger banner when ?state=restricted or when active tab is chrome://', async () => {
    const container = document.createElement('div');
    renderPopup(container, { initialSearch: '?state=restricted' });

    const banner = container.querySelector('#restricted-banner');
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain('Strona chroniona przez przeglądarkę');

    // Live detection via chrome.tabs.query without explicit ?state=
    vi.stubGlobal('chrome', {
      tabs: {
        query: vi.fn(async () => [
          {
            id: 10,
            url: 'chrome://extensions',
          },
        ]),
      },
    });

    const liveContainer = document.createElement('div');
    const liveController = renderPopup(liveContainer, { initialSearch: '' });
    await liveController.ready;

    expect(liveController.getState()).toBe('restricted');
    expect(liveContainer.querySelector('#restricted-banner')).not.toBeNull();
  });

  it('dispatches SNAPMARK_TRIGGER_CAPTURE (mode: viewport) via chrome.runtime.sendMessage', async () => {
    const sendMessageMock = vi.fn(async () => ({
      ok: true,
      captureId: 'cap_123',
      mode: 'viewport',
    }));

    vi.stubGlobal('chrome', {
      tabs: {
        query: vi.fn(async () => [
          {
            id: 15,
            url: 'https://domena.pl/artykul',
          },
        ]),
      },
      runtime: {
        sendMessage: sendMessageMock,
      },
    });

    const container = document.createElement('div');
    const controller = renderPopup(container, { initialSearch: '' });
    await controller.ready;

    container
      .querySelector<HTMLButtonElement>('#btn-capture-viewport')
      ?.click();

    expect(sendMessageMock).toHaveBeenCalledWith({
      type: 'SNAPMARK_TRIGGER_CAPTURE',
      mode: 'viewport',
    });
  });
});
