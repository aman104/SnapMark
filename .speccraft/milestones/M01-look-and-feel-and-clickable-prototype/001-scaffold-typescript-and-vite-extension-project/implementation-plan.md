# Task 001: Scaffold TypeScript and Vite extension project

## 1. Summary
- **Task:** 001 - Scaffold TypeScript and Vite extension project - Initialize the Node.js, TypeScript 5 (strict mode), Vite multi-entry build and Vitest configuration in the repository root as specified in 05-Tech-Stack.md sections 3 and 8. Create the base directory structure (public/, src/styles/, src/shared/, src/popup/, src/editor/, tests/unit/), html entry points (popup.html and editor.html), update .gitignore with node_modules/ and dist/, and add a smoke unit test. The task is done when npm install, npm run typecheck, npm test and npm run build all succeed with exit code 0.
- **Milestone:** M01 - Look & feel and clickable prototype (type: prototype)
- **Type:** `setup`, `infra`
- **Depends on:** `none`
- **Parallel:** `exclusive` — initializes `package.json`, lockfile, TypeScript, Vite, Vitest and base folder layout in the repository root
- **Sources:** `05-Tech-Stack.md §3 "Recommended stack"`, `05-Tech-Stack.md §8 "Suggested project structure"`

## 2. Goal
Create the complete TypeScript + Vite + Vitest build and test foundation in the repository root without disturbing `.speccraft/`, `.agents/` or `.claude/`. After this task, the repository compiles both `popup.html` and `editor.html` entry points into `dist/`, runs strict TypeScript typechecking, and executes Vitest unit tests.

## 3. Scope
**In scope:**
- `package.json` with scripts (`dev`, `build`, `test`, `typecheck`) and devDependencies (`typescript`, `vite`, `vitest`, `jsdom`, `@types/chrome`, `@types/node`)
- `tsconfig.json` configured with strict mode (`"strict": true`, `"noEmit": true`, `"target": "ES2022"`, `"moduleResolution": "bundler"`, `"types": ["chrome", "vite/client", "node"]`)
- `vite.config.ts` configured with multi-page Rollup inputs for `popup.html` and `editor.html` outputting to `dist/`
- `vitest.config.ts` configured for `tests/unit/**/*.test.ts`
- Base HTML entry points `popup.html` and `editor.html` referencing `src/popup/index.ts` and `src/editor/index.ts`
- Minimal valid `public/manifest.json` placeholder and `src/` / `tests/unit/` directory structure
- Updating `.gitignore` with `node_modules/`, `dist/`, `coverage/`, `playwright-report/`, `test-results/`, `*.zip`
- Smoke unit test `tests/unit/smoke.test.ts`

**Out of scope:**
- Full design token implementation in `src/styles/tokens.css` — task 002
- Shared data models and mock fixtures — task 003
- Full popup UI and states — task 004
- Full editor toolbar and canvas stage — tasks 005 and 006

## 4. Current state and prerequisites
- Repository root currently contains only `.agents/`, `.claude/`, `.speccraft/`, `.gitignore`, `AGENTS.md`, and `CLAUDE.md`.
- Node.js 20+ and `npm` are available in the workspace environment.

## 5. Implementation steps
1. Update `.gitignore` to append standard Node/Vite/Playwright ignore entries (`node_modules/`, `dist/`, `coverage/`, `playwright-report/`, `test-results/`, `*.zip`, `.DS_Store`) while keeping `.speccraft/.runs/`.
2. Create `package.json` in the repository root with `"name": "snapmark"`, `"version": "0.1.0"`, `"private": true`, `"type": "module"`, scripts `"dev": "vite"`, `"build": "tsc --noEmit && vite build"`, `"test": "vitest run"`, `"typecheck": "tsc --noEmit"`, and devDependencies (`typescript`, `vite`, `vitest`, `jsdom`, `@types/chrome`, `@types/node`).
3. Create `tsconfig.json` enabling `"strict": true`, `"target": "ES2022"`, `"module": "ESNext"`, `"moduleResolution": "bundler"`, `"lib": ["ES2022", "DOM", "DOM.Iterable"]`, `"noUnusedLocals": true`, `"noUnusedParameters": true`, and `"include": ["src", "tests"]`.
4. Create `vite.config.ts` using `defineConfig` with `build.outDir = 'dist'`, `build.emptyOutDir = true`, and `build.rollupOptions.input` pointing to `popup: resolve(__dirname, 'popup.html')` and `editor: resolve(__dirname, 'editor.html')`.
5. Create `vitest.config.ts` configuring `test.environment = 'jsdom'` and `test.include = ['tests/unit/**/*.test.ts']`.
6. Create `public/manifest.json` with basic Manifest V3 metadata (`manifest_version: 3`, `name: "SnapMark"`, `version: "0.1.0"`, `permissions: ["activeTab", "contextMenus", "scripting", "storage"]`, `action: { default_popup: "popup.html" }`).
7. Create `popup.html` and `editor.html` in the repository root with `<meta charset="UTF-8">`, Polish titles, root containers (`#popup-app` and `#editor-app`), stylesheet imports (`src/styles/tokens.css`, `src/styles/popup.css` / `src/styles/editor.css`), and module scripts (`src/popup/index.ts`, `src/editor/index.ts`).
8. Create initial placeholder files `src/styles/tokens.css`, `src/styles/popup.css`, `src/styles/editor.css`, `src/popup/index.ts`, `src/editor/index.ts`, and `tests/unit/smoke.test.ts`.
9. Run `npm install`, `npm run typecheck`, `npm test`, and `npm run build` to verify the setup.

## 6. Files

| Path | Action (create / modify) | Purpose |
|---|---|---|
| `.gitignore` | modify | Ignore `node_modules/`, `dist/`, `coverage/`, test artifacts |
| `package.json` | create | Project manifest, scripts (`dev`, `build`, `test`, `typecheck`), devDependencies |
| `package-lock.json` | create | Locked npm dependency tree |
| `tsconfig.json` | create | Strict TypeScript compiler configuration |
| `vite.config.ts` | create | Multi-entry Vite bundler config for `popup.html` and `editor.html` |
| `vitest.config.ts` | create | Vitest unit test runner configuration |
| `public/manifest.json` | create | Base Chrome Extension Manifest V3 declaration |
| `popup.html` | create | Extension popup HTML entry point |
| `editor.html` | create | Vector annotation editor HTML entry point |
| `src/styles/tokens.css` | create | Initial stylesheet entry point (expanded in task 002) |
| `src/styles/popup.css` | create | Initial popup stylesheet entry point (expanded in task 004) |
| `src/styles/editor.css` | create | Initial editor stylesheet entry point (expanded in task 005) |
| `src/popup/index.ts` | create | Initial popup TypeScript entry point (expanded in task 004) |
| `src/editor/index.ts` | create | Initial editor TypeScript entry point (expanded in task 005) |
| `tests/unit/smoke.test.ts` | create | Smoke test verifying Vitest + JSDOM environment |

## 7. Contracts and data (if applicable)
Not applicable (scaffolding task; shared types are defined in task 003).

## 8. UI details (if applicable)
- `popup.html` defines `<div id="popup-app"></div>` and loads `/src/popup/index.ts`.
- `editor.html` defines `<div id="editor-app"></div>` and loads `/src/editor/index.ts`.

## 9. Acceptance criteria
- [ ] TC-01: `npm install` completes cleanly and creates `package-lock.json` in the repository root.
- [ ] TC-02: `npm run typecheck` runs `tsc --noEmit` in strict mode and exits with code `0`.
- [ ] TC-03: `npm test` runs Vitest and passes `tests/unit/smoke.test.ts` with exit code `0`.
- [ ] TC-04: `npm run build` outputs compiled assets including `dist/popup.html`, `dist/editor.html`, and `dist/manifest.json`.
- [ ] TC-05: No files inside `.speccraft/`, `.agents/`, or `.claude/` are modified or polluted by build output.

## 10. Tests to add or update
- `tests/unit/smoke.test.ts`: Verifies the test harness and JSDOM environment work and validates `public/manifest.json` declares `manifest_version: 3` and does not contain `<all_urls>`.

## 11. Verification
- Run from repository root:
  `npm install && npm run typecheck && npm test && npm run build`
- Check output files:
  `ls -la dist/popup.html dist/editor.html dist/manifest.json`

## 12. Risks and notes
- Ensure `"dependencies"` in `package.json` remains empty (all build/test packages go in `"devDependencies"`) as specified in `05-Tech-Stack.md §3`.
