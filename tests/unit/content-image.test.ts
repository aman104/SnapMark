import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { measureTargetImageInDom } from '../../src/content/capture-injected';

function makeDomRect(
  left: number,
  top: number,
  width: number,
  height: number,
): DOMRect {
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    x: left,
    y: top,
    toJSON: () => ({}),
  };
}

describe('Task 015: On-demand <img> element resolution & bounding box extraction', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    Object.defineProperty(window, 'innerWidth', {
      value: 1440,
      configurable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      value: 900,
      configurable: true,
    });
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 2,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns found: false when no visible <img> exists in the document', () => {
    const res = measureTargetImageInDom('https://domena.pl/brak.avif');
    expect(res.found).toBe(false);
    expect(res.cropRectCss).toBeNull();
  });

  it('resolves the matching <img> by srcUrl and returns exact getBoundingClientRect() without padding', () => {
    const img1 = document.createElement('img');
    img1.src = 'https://domena.pl/logo.png';
    vi.spyOn(img1, 'getBoundingClientRect').mockReturnValue(
      makeDomRect(20, 16, 120, 40),
    );

    const img2 = document.createElement('img');
    img2.src = 'https://cdn.domena.pl/wykres.avif';
    vi.spyOn(img2, 'getBoundingClientRect').mockReturnValue(
      makeDomRect(240, 180, 640, 420),
    );

    document.body.append(img1, img2);

    const res = measureTargetImageInDom('https://cdn.domena.pl/wykres.avif');
    expect(res.found).toBe(true);
    expect(res.dpr).toBe(2);
    expect(res.matchedSrc).toBe('https://cdn.domena.pl/wykres.avif');
    expect(res.cropRectCss).toEqual({
      x: 240,
      y: 180,
      width: 640,
      height: 420,
    });
  });

  it('disambiguates duplicate <img> elements with identical srcUrl by preferring the one visible in the viewport', () => {
    const offscreenImg = document.createElement('img');
    offscreenImg.src = 'https://domena.pl/avatar.webp';
    vi.spyOn(offscreenImg, 'getBoundingClientRect').mockReturnValue(
      makeDomRect(100, -500, 80, 80),
    );

    const visibleImg = document.createElement('img');
    visibleImg.src = 'https://domena.pl/avatar.webp';
    vi.spyOn(visibleImg, 'getBoundingClientRect').mockReturnValue(
      makeDomRect(320, 250, 160, 160),
    );

    document.body.append(offscreenImg, visibleImg);

    const res = measureTargetImageInDom('https://domena.pl/avatar.webp');
    expect(res.found).toBe(true);
    expect(res.cropRectCss).toEqual({
      x: 320,
      y: 250,
      width: 160,
      height: 160,
    });
  });

  it('scrolls partially clipped images into view and clamps bounding rect to viewport bounds', () => {
    const clippedImg = document.createElement('img');
    clippedImg.src = 'https://domena.pl/photo.jpg';
    const scrollIntoViewMock = vi.fn();
    clippedImg.scrollIntoView = scrollIntoViewMock;

    vi.spyOn(clippedImg, 'getBoundingClientRect').mockReturnValue(
      makeDomRect(-10, 100, 510, 300),
    );
    document.body.appendChild(clippedImg);

    const res = measureTargetImageInDom('https://domena.pl/photo.jpg');
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    expect(res.cropRectCss).toEqual({
      x: 0,
      y: 100,
      width: 500,
      height: 300,
    });
  });
});
