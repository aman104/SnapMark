import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Task 001: Project scaffold and Manifest V3 baseline', () => {
  it('runs in a JSDOM environment', () => {
    const el = document.createElement('div');
    el.id = 'test-node';
    el.textContent = 'SnapMark';
    expect(el.textContent).toBe('SnapMark');
  });

  it('declares Manifest V3 with minimal permissions and no <all_urls>', () => {
    const manifestPath = resolve(process.cwd(), 'public/manifest.json');
    const raw = readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw) as {
      manifest_version: number;
      permissions: string[];
      host_permissions?: string[];
    };

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toEqual([
      'activeTab',
      'contextMenus',
      'scripting',
      'storage',
    ]);
    expect(manifest.host_permissions).toBeUndefined();
    expect(raw).not.toContain('<all_urls>');
  });
});
