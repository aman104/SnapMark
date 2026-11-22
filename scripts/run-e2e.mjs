import { execFileSync } from 'node:child_process';

const rootDir = process.cwd();
const run = (command, args) => execFileSync(command, args, { stdio: 'inherit', cwd: rootDir });

// Always rebuild so the real browser and artifact checks use the current source.
run('npm', ['run', 'build']);
console.log('[SnapMark E2E] Running simulated integration tests (Vitest/JSDOM).');
run('npx', ['vitest', 'run', '--config', 'vitest.e2e.config.ts']);
console.log('[SnapMark E2E] Running real extension workflow in Chromium.');
run(process.execPath, ['tests/e2e/chromium-workflow.mjs']);
