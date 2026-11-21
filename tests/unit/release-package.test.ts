import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Task 025: Chrome Web Store Release Packager & CI Configuration', () => {
  it('packages ./dist into a valid snapmark-extension.zip archive with PK ZIP header', () => {
    const rootDir = process.cwd();
    const scriptPath = path.join(rootDir, 'scripts/package-extension.mjs');
    expect(fs.existsSync(scriptPath)).toBe(true);

    execSync('node scripts/package-extension.mjs', {
      cwd: rootDir,
      stdio: 'pipe',
    });

    const zipPath = path.join(rootDir, 'snapmark-extension.zip');
    expect(fs.existsSync(zipPath)).toBe(true);

    const zipBytes = fs.readFileSync(zipPath);
    expect(zipBytes.byteLength).toBeGreaterThan(1000);
    // Standard ZIP magic header: 'PK\x03\x04' (0x50 0x4b 0x03 0x04)
    expect(zipBytes[0]).toBe(0x50);
    expect(zipBytes[1]).toBe(0x4b);
    expect(zipBytes[2]).toBe(0x03);
    expect(zipBytes[3]).toBe(0x04);
  });

  it('includes GitHub Actions CI workflow (.github/workflows/ci.yml) running typecheck, test, build, test:e2e, and package', () => {
    const ciPath = path.resolve(process.cwd(), '.github/workflows/ci.yml');
    expect(fs.existsSync(ciPath)).toBe(true);

    const ciYaml = fs.readFileSync(ciPath, 'utf-8');
    expect(ciYaml).toContain('npm run typecheck');
    expect(ciYaml).toContain('npm test');
    expect(ciYaml).toContain('npm run build');
    expect(ciYaml).toContain('npm run test:e2e');
    expect(ciYaml).toContain('npm run package');
  });
});
