# Task Report: 025 - Add Chrome Web Store release packager (npm run package), GitHub Actions CI workflow and final README documentation

- **Milestone**: M05 - Quality and release: Playwright E2E tests, edge-case hardening and Web Store package
- **Task**: `025` - Add Chrome Web Store release packager (npm run package), GitHub Actions CI workflow and final README documentation
- **Status**: Completed (`[~]` ready for review)
- **Branch**: `task/025-add-chrome-web-store-release-packager-npm-run-package-github-actions-ci-workflow-and-final-readme-documentation`

## Summary of Changes

1. **Chrome Web Store Release Packager (`scripts/package-extension.mjs`, `package.json`)**:
   - Implemented `scripts/package-extension.mjs` wired to `"package": "npm run build && node scripts/package-extension.mjs"` in `package.json`.
   - Validates all required Manifest V3 entry points and PNG icons in `./dist` and creates `snapmark-extension.zip` in the repository root.
2. **GitHub Actions CI Workflow (`.github/workflows/ci.yml`)**:
   - Configured automated Node.js 20 workflow running `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`, and `npm run package`.
3. **Documentation & Release Verification Tests (`README.md`, `tests/unit/release-package.test.ts`)**:
   - Added keyboard shortcuts table, E2E and packaging scripts documentation, and v1 completion summary in `README.md`.
   - Added `tests/unit/release-package.test.ts` verifying `snapmark-extension.zip` creation (`PK\x03\x04` header) and `.github/workflows/ci.yml` completeness.

## Verification

- `npm run typecheck && npm test && npm run build && npm run test:e2e && npm run package`: Passed (25 unit test files / 89 unit tests + 3 E2E scenarios passing, `snapmark-extension.zip` created).
