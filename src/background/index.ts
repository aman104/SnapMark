import { cleanupStaleCaptures } from '../shared/db';
import type { CaptureMode } from '../shared/types';
import {
  cancelActiveScrollCapture,
  CONTEXT_MENU_IDS,
  defaultCaptureRateLimiter,
  handleCaptureTrigger,
  initializeBackgroundService,
  isCancelScrollCaptureRequest,
  isRuntimeCaptureRequest,
} from './capture-orchestrator';

export function setupBackgroundListeners(): void {
  if (typeof chrome === 'undefined') {
    return;
  }

  chrome.runtime?.onInstalled?.addListener(() => {
    void initializeBackgroundService();
  });

  chrome.runtime?.onStartup?.addListener(() => {
    void cleanupStaleCaptures().catch(() => 0);
  });

  chrome.contextMenus?.onClicked?.addListener((info, tab) => {
    if (info.menuItemId === CONTEXT_MENU_IDS.VIEWPORT) {
      void handleCaptureTrigger('viewport', tab);
    } else if (info.menuItemId === CONTEXT_MENU_IDS.SELECTION) {
      void handleCaptureTrigger('selection', tab);
    } else if (info.menuItemId === CONTEXT_MENU_IDS.IMAGE) {
      void handleCaptureTrigger('image', tab, defaultCaptureRateLimiter, {
        srcUrl: info.srcUrl,
      });
    }
  });

  chrome.commands?.onCommand?.addListener((command, tab) => {
    const commandMap: Record<string, CaptureMode> = {
      'capture-viewport': 'viewport',
      'capture-fullpage': 'fullpage',
      'capture-selection': 'selection',
    };
    const mode = commandMap[command];
    if (mode) {
      void handleCaptureTrigger(mode, tab, defaultCaptureRateLimiter, {
        interactiveArea: mode === 'selection',
      });
    }
  });

  chrome.runtime?.onMessage?.addListener((message, sender, sendResponse) => {
    if (isCancelScrollCaptureRequest(message)) {
      cancelActiveScrollCapture();
      sendResponse({ ok: true });
      return false;
    }

    if (isRuntimeCaptureRequest(message)) {
      void handleCaptureTrigger(
        message.mode,
        sender.tab,
        defaultCaptureRateLimiter,
        {
          srcUrl: message.srcUrl,
          interactiveArea:
            message.mode === 'selection'
              ? (message.interactiveArea ?? true)
              : false,
        },
      ).then((response) => {
        sendResponse(response);
      });
      return true;
    }
    return false;
  });
}

setupBackgroundListeners();
