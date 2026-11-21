import { describe, expect, it } from 'vitest';
import { isRestrictedBrowserUrl } from '../../src/shared/url-guard';

describe('Task 007: Restricted browser URL guard', () => {
  it('flags chrome://, edge://, about:, chrome-extension://, and Chrome Web Store URLs as restricted', () => {
    expect(isRestrictedBrowserUrl('chrome://extensions')).toBe(true);
    expect(isRestrictedBrowserUrl('chrome://settings/privacy')).toBe(true);
    expect(isRestrictedBrowserUrl('edge://extensions')).toBe(true);
    expect(isRestrictedBrowserUrl('brave://settings')).toBe(true);
    expect(isRestrictedBrowserUrl('about:blank')).toBe(true);
    expect(
      isRestrictedBrowserUrl('chrome-extension://abcdef123456/editor.html'),
    ).toBe(true);
    expect(
      isRestrictedBrowserUrl(
        'https://chromewebstore.google.com/detail/snapmark/abc',
      ),
    ).toBe(true);
    expect(
      isRestrictedBrowserUrl(
        'https://chrome.google.com/webstore/category/extensions',
      ),
    ).toBe(true);
    expect(isRestrictedBrowserUrl('')).toBe(true);
    expect(isRestrictedBrowserUrl(null)).toBe(true);
    expect(isRestrictedBrowserUrl(undefined)).toBe(true);
  });

  it('allows normal http:// and https:// web pages', () => {
    expect(isRestrictedBrowserUrl('https://domena.pl/artykul')).toBe(false);
    expect(isRestrictedBrowserUrl('https://app.github.com/issues/12')).toBe(
      false,
    );
    expect(isRestrictedBrowserUrl('http://localhost:3000/test')).toBe(false);
    expect(isRestrictedBrowserUrl('https://www.google.com/search?q=test')).toBe(
      false,
    );
  });
});
