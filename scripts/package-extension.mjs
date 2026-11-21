import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Packages the built Chrome Extension Manifest V3 directory (`./dist`) into a
 * Chrome Web Store release archive (`snapmark-extension.zip` in the repository root).
 */
export function packageExtensionRelease(rootDir = process.cwd()) {
  const distDir = path.join(rootDir, 'dist');
  const zipPath = path.join(rootDir, 'snapmark-extension.zip');

  const requiredFiles = [
    'manifest.json',
    'background.js',
    'popup.html',
    'editor.html',
    'icons/icon-16.png',
    'icons/icon-32.png',
    'icons/icon-48.png',
    'icons/icon-128.png',
  ];

  const missingBeforeBuild = requiredFiles.some(
    (rel) => !fs.existsSync(path.join(distDir, rel)),
  );

  if (missingBeforeBuild) {
    execSync('npm run build', { stdio: 'inherit', cwd: rootDir });
  }

  for (const rel of requiredFiles) {
    const full = path.join(distDir, rel);
    if (!fs.existsSync(full)) {
      throw new Error(
        `Missing required Manifest V3 file in dist/: ${rel}`,
      );
    }
  }

  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  execSync('zip -r -q ../snapmark-extension.zip .', {
    cwd: distDir,
    stdio: 'inherit',
  });

  if (!fs.existsSync(zipPath)) {
    throw new Error('Failed to create snapmark-extension.zip');
  }

  const stat = fs.statSync(zipPath);
  return {
    zipPath,
    sizeBytes: stat.size,
  };
}

if (
  typeof process !== 'undefined' &&
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(process.cwd(), 'scripts/package-extension.mjs')
) {
  const result = packageExtensionRelease(process.cwd());
  console.log(
    `[SnapMark Package] Created ${path.basename(result.zipPath)} (${result.sizeBytes} bytes)`,
  );
}
