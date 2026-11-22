import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Task 001 & 010: Project scaffold and complete Manifest V3 package', () => {
  it('runs in a JSDOM environment', () => {
    const el = document.createElement('div');
    el.id = 'test-node';
    el.textContent = 'SnapMark';
    expect(el.textContent).toBe('SnapMark');
  });

  it('declares Manifest V3 with minimal permissions, service worker, commands, icons, and no <all_urls>', () => {
    const manifestPath = resolve(process.cwd(), 'public/manifest.json');
    const raw = readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw) as {
      manifest_version: number;
      permissions: string[];
      host_permissions?: string[];
      background?: { service_worker: string; type: string };
      icons?: Record<string, string>;
      commands?: Record<
        string,
        { suggested_key?: { default?: string }; description?: string }
      >;
    };

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toEqual([
      'activeTab',
      'contextMenus',
      'downloads',
      'scripting',
      'storage',
    ]);
    expect(manifest.host_permissions).toBeUndefined();
    expect(raw).not.toContain('<all_urls>');

    expect(manifest.background).toEqual({
      service_worker: 'background.js',
      type: 'module',
    });

    expect(manifest.commands?.['capture-viewport']?.suggested_key?.default).toBe(
      'Alt+Shift+V',
    );
    expect(manifest.commands?.['capture-fullpage']?.suggested_key?.default).toBe(
      'Alt+Shift+F',
    );
    expect(
      manifest.commands?.['capture-selection']?.suggested_key?.default,
    ).toBe('Alt+Shift+S');

    expect(manifest.icons).toEqual({
      '16': 'icons/icon-16.png',
      '32': 'icons/icon-32.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    });
  });

  it('includes valid binary PNG extension icons for 16, 32, 48, and 128 px', () => {
    const sizes = [16, 32, 48, 128];
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

    for (const size of sizes) {
      const iconPath = resolve(process.cwd(), `public/icons/icon-${size}.png`);
      expect(existsSync(iconPath)).toBe(true);
      const buf = readFileSync(iconPath);
      expect(buf.length).toBeGreaterThan(24);
      expect(Array.from(buf.subarray(0, 8))).toEqual(pngSignature);
      // Verify PNG IHDR width and height match the icon size
      expect(buf.readUInt32BE(16)).toBe(size);
      expect(buf.readUInt32BE(20)).toBe(size);
    }
  });
});
