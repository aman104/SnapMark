import { describe, expect, it } from 'vitest';
import {
  formatCaptureFilename,
  normalizeDomainForFilename,
} from '../../src/shared/filename';

describe('Task 007: Filename formatter (<domain>_YYYY-MM-DD_HH-mm.png)', () => {
  it('normalizes domains and strips www. matching 02-General-PRD.md §9.1', () => {
    expect(normalizeDomainForFilename('https://domena.pl/artykul/test')).toBe(
      'domena-pl',
    );
    expect(normalizeDomainForFilename('https://www.domena.pl/kontakt')).toBe(
      'domena-pl',
    );
    expect(normalizeDomainForFilename('https://app.github.com/issues/12')).toBe(
      'app-github-com',
    );
    expect(normalizeDomainForFilename('http://localhost:3000/dashboard')).toBe(
      'localhost',
    );
    expect(normalizeDomainForFilename('')).toBe('strona');
  });

  it('formats capture filenames with domain and zero-padded local date and time', () => {
    const sampleDate = new Date(2026, 10, 21, 14, 10, 0); // 2026-11-21 14:10

    expect(
      formatCaptureFilename('https://domena.pl/artykul/test', sampleDate),
    ).toBe('domena-pl_2026-11-21_14-10.png');
    expect(
      formatCaptureFilename('https://app.github.com/issues/12', sampleDate),
    ).toBe('app-github-com_2026-11-21_14-10.png');
    expect(formatCaptureFilename('http://localhost:3000', sampleDate)).toBe(
      'localhost_2026-11-21_14-10.png',
    );

    const earlyDate = new Date(2026, 0, 5, 8, 4, 0); // 2026-01-05 08:04
    expect(formatCaptureFilename('https://example.com', earlyDate)).toBe(
      'example-com_2026-01-05_08-04.png',
    );
  });
});
