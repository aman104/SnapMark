import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');

const requiredDistFiles = [
  'manifest.json',
  'background.js',
  'popup.html',
  'editor.html',
  'icons/icon-16.png',
  'icons/icon-32.png',
  'icons/icon-48.png',
  'icons/icon-128.png',
];

const missingBeforeBuild = requiredDistFiles.some(
  (rel) => !fs.existsSync(path.join(distDir, rel)),
);

if (missingBeforeBuild) {
  console.log('[SnapMark E2E] Building extension into ./dist first...');
  execSync('npm run build', { stdio: 'inherit', cwd: rootDir });
}

execSync('npx vitest run --config vitest.e2e.config.ts', {
  stdio: 'inherit',
  cwd: rootDir,
});
