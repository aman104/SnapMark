# Task Report: 039 - Update E2E tests, README and verify full build, unit, E2E and Chrome Web Store package

- **Milestone**: M08
- **Task**: `039`
- **Status**: Completed (`[~]` ready for review)

## Summary of Changes
1. Updated `tests/e2e/extension.spec.ts` to reflect removal of `#toggle-highlight` (`FR-15`).
2. Updated `README.md` keyboard shortcuts table with `4 = Kroki (1, 2, 3...)`, `5 = Pisak`, and `C = Kadruj`.
3. Verified the full pipeline: `npm run typecheck && npm test && npm run build && npm run test:e2e && npm run package`.
