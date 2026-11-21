import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Task 002: Dark Studio Utility design tokens and shared UI primitives', () => {
  const tokensCssPath = resolve(process.cwd(), 'src/styles/tokens.css');
  const css = readFileSync(tokensCssPath, 'utf-8');

  it('defines all semantic color and annotation palette tokens from 03-Design.md', () => {
    const requiredColorTokens: Record<string, string> = {
      '--color-primary': '#FF3B30',
      '--color-primary-hover': '#FF5147',
      '--color-primary-pressed': '#E02E24',
      '--color-on-primary': '#FFFFFF',
      '--color-secondary': '#262B36',
      '--color-accent': '#3B82F6',
      '--color-ink': '#F3F4F6',
      '--color-ink-muted': '#9CA3AF',
      '--color-ink-subtle': '#6B7280',
      '--color-canvas': '#0F1115',
      '--color-surface-1': '#171A21',
      '--color-surface-2': '#1E222B',
      '--color-surface-elevated': '#262B36',
      '--color-hairline': '#2A303C',
      '--color-hairline-strong': '#3B4354',
      '--color-focus-ring': '#FF3B30',
      '--color-success': '#22C55E',
      '--color-warning': '#F59E0B',
      '--color-danger': '#EF4444',
      '--color-info': '#3B82F6',
      '--color-annotation-red': '#FF3B30',
      '--color-annotation-yellow': '#FFCC00',
      '--color-annotation-green': '#34C759',
      '--color-annotation-blue': '#007AFF',
      '--color-annotation-white': '#FFFFFF',
      '--color-annotation-dark': '#1C1C1E',
      '--color-selection-highlight': '#FFEB3B',
    };

    for (const [tokenName, hexValue] of Object.entries(requiredColorTokens)) {
      expect(css).toContain(`${tokenName}: ${hexValue}`);
    }
  });

  it('defines typography, radius, spacing, and elevation tokens', () => {
    const requiredTokens = [
      '--font-sans:',
      '--font-mono:',
      '--radius-xs: 4px',
      '--radius-sm: 6px',
      '--radius-md: 8px',
      '--radius-lg: 10px',
      '--radius-xl: 14px',
      '--radius-pill: 9999px',
      '--space-xxs: 2px',
      '--space-xs: 4px',
      '--space-sm: 8px',
      '--space-md: 12px',
      '--space-lg: 16px',
      '--space-xl: 24px',
      '--space-xxl: 32px',
      '--space-section: 48px',
      '--shadow-sm:',
      '--shadow-md:',
      '--shadow-lg:',
      '--shadow-xl:',
    ];

    for (const token of requiredTokens) {
      expect(css).toContain(token);
    }
  });

  it('defines reusable component classes for buttons, tools, cards, badges, switches, and banners', () => {
    const requiredClasses = [
      '.btn-primary',
      '.btn-primary.is-success',
      '.btn-secondary',
      '.btn-danger-ghost',
      '.toolbar-tool-btn',
      '.toolbar-tool-btn.is-active',
      '.popup-action-card',
      '.kbd-badge',
      '.segmented-control',
      '.segmented-option',
      '.color-swatch-tray',
      '.color-swatch',
      '.toggle-switch',
      '.card',
      '.status-banner.is-warning',
      '.status-banner.is-danger',
    ];

    for (const selector of requiredClasses) {
      expect(css).toContain(selector);
    }
  });

  it('makes zero external network calls (no http:// or https:// font/icon CDNs)', () => {
    expect(css).not.toMatch(/https?:\/\//i);
    expect(css).not.toMatch(/@import/i);
  });
});
