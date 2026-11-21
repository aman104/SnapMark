/**
 * Playwright / E2E configuration for SnapMark Chrome Extension (Manifest V3).
 * Used when launching Chromium with `--disable-extensions-except=./dist --load-extension=./dist`.
 */
export interface E2EConfig {
  testDir: string;
  extensionDistPath: string;
  chromiumArgs: string[];
}

export const playwrightConfig: E2EConfig = {
  testDir: './tests/e2e',
  extensionDistPath: './dist',
  chromiumArgs: [
    '--disable-extensions-except=./dist',
    '--load-extension=./dist',
  ],
};

export default playwrightConfig;
