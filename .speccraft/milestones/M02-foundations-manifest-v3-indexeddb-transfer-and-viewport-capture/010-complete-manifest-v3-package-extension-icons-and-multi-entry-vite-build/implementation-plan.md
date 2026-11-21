# Task 010: Complete Manifest V3 package, extension icons and multi-entry Vite build

## 1. Summary
- **Task:** 010 - Complete Manifest V3 package, extension icons and multi-entry Vite build - Update public/manifest.json with the full Manifest V3 configuration from 02-General-PRD.md section 6.1 and 6.2: permissions restricted to activeTab, contextMenus, scripting and storage (no <all_urls>), background.service_worker pointing to background.js (type: module), commands for capture-viewport (Alt+Shift+V), capture-fullpage (Alt+Shift+F) and capture-selection (Alt+Shift+S), and PNG icons (public/icons/icon-16.png, icon-32.png, icon-48.png, icon-128.png). Update vite.config.ts to compile src/background/index.ts into dist/background.js with deterministic entry output alongside dist/popup.html and dist/editor.html. The task is done when npm run build produces a complete, loadable unpacked extension in dist/ verified by unit tests.
- **Milestone:** M02 - Foundations: Manifest V3, IndexedDB transfer and Viewport capture (type: foundation)
- **Type:** `infra`, `setup`
- **Depends on:** 001
- **Parallel:** `exclusive` — modifies `public/manifest.json`, `vite.config.ts`, `public/icons/*` and creates `src/background/index.ts` entry
- **Sources:** `02-General-PRD.md §4.1–4.4, §6.1, §6.2`, `04-Interface-spec.md §2`, `05-Tech-Stack.md §8`

## 2. Goal
Turn the Vite build output in `dist/` into a complete, valid Chrome Extension Manifest V3 package that can be loaded directly via `chrome://extensions` (*Load unpacked*), featuring the Background Service Worker (`dist/background.js`), keyboard shortcut commands (`Alt+Shift+V`, `Alt+Shift+F`, `Alt+Shift+S`), crisp Signal Red (`#FF3B30`) PNG icons (`16`, `32`, `48`, `128 px`), and strict minimal permissions (`activeTab`, `contextMenus`, `scripting`, `storage`).

## 3. Scope
**In scope:**
- `public/manifest.json`:
  - `manifest_version: 3`, `name: "SnapMark"`, `version: "0.1.0"`, `description: "Szybkie zrzuty kontekstowe z lekkim edytorem adnotacji"`
  - `permissions: ["activeTab", "contextMenus", "scripting", "storage"]` (zero `host_permissions`, zero `<all_urls>`)
  - `background: { "service_worker": "background.js", "type": "module" }`
  - `action: { "default_popup": "popup.html", "default_title": "SnapMark", "default_icon": { "16": "icons/icon-16.png", "32": "icons/icon-32.png", "48": "icons/icon-48.png", "128": "icons/icon-128.png" } }`
  - `icons: { "16": "icons/icon-16.png", "32": "icons/icon-32.png", "48": "icons/icon-48.png", "128": "icons/icon-128.png" }`
  - `commands`:
    - `"capture-viewport"`: `{ "suggested_key": { "default": "Alt+Shift+V" }, "description": "Zrzut widocznego ekranu (Viewport)" }`
    - `"capture-fullpage"`: `{ "suggested_key": { "default": "Alt+Shift+F" }, "description": "Zrzut całej strony ze scrollem" }`
    - `"capture-selection"`: `{ "suggested_key": { "default": "Alt+Shift+S" }, "description": "Zrzut zaznaczonego fragmentu tekstu" }`
- Generating valid binary PNG icon files in `public/icons/icon-16.png`, `public/icons/icon-32.png`, `public/icons/icon-48.png`, `public/icons/icon-128.png`
- Updating `vite.config.ts` so `rollupOptions.input` includes `background: resolve(__dirname, 'src/background/index.ts')` and `rollupOptions.output.entryFileNames` emits `background.js` at the root of `dist/` (`chunkinfo.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js'`)
- Initial `src/background/index.ts` entry point (expanded with full orchestrator in task 011)
- Updating `tests/unit/smoke.test.ts` to verify the complete `manifest.json` structure (service worker, commands, icons, minimal permissions) and the presence of `public/icons/icon-*.png`

**Out of scope:**
- Full `CaptureRateLimiter` and `captureVisibleTab` orchestration logic — task 011

## 4. Current state and prerequisites
- `public/manifest.json` and `vite.config.ts` exist from Task 001.

## 5. Implementation steps
1. Generate valid PNG icon assets at `public/icons/icon-16.png`, `public/icons/icon-32.png`, `public/icons/icon-48.png`, and `public/icons/icon-128.png` with SnapMark's Signal Red (`#FF3B30`) background and white symbol.
2. Update `public/manifest.json` to include `icons`, `action.default_icon`, `background.service_worker: "background.js"`, and `commands` (`capture-viewport`, `capture-fullpage`, `capture-selection`).
3. Create `src/background/index.ts` exporting a clean service worker bootstrap function.
4. Update `vite.config.ts` to compile `src/background/index.ts` into `dist/background.js` alongside `popup.html` and `editor.html`.
5. Expand `tests/unit/smoke.test.ts` to validate `manifest.json` commands, service worker declaration, icon files (checking PNG magic bytes `\x89PNG`), and absence of `<all_urls>`.

## 6. Files

| Path | Action (create / modify) | Purpose |
|---|---|---|
| `public/manifest.json` | modify | Complete Manifest V3 configuration with service worker, commands, and icons |
| `public/icons/icon-16.png` | create | 16×16 extension icon PNG |
| `public/icons/icon-32.png` | create | 32×32 extension icon PNG |
| `public/icons/icon-48.png` | create | 48×48 extension icon PNG |
| `public/icons/icon-128.png` | create | 128×128 extension icon PNG |
| `src/background/index.ts` | create | MV3 Background Service Worker entry point |
| `vite.config.ts` | modify | Multi-entry Rollup configuration emitting `dist/background.js` |
| `tests/unit/smoke.test.ts` | modify | Verify complete Manifest V3 fields and valid PNG icon files |

## 7. Contracts and data (if applicable)
- Manifest command IDs: `'capture-viewport'`, `'capture-fullpage'`, `'capture-selection'`.
- Context menu IDs (used in task 011): `'capture-selection'`, `'capture-image'`, `'capture-viewport'`.

## 8. UI details (if applicable)
- Extension toolbar and Web Store icons in `16×16`, `32×32`, `48×48`, and `128×128` PNG format using Signal Red `#FF3B30`.

## 9. Acceptance criteria
- [ ] TC-01: `public/manifest.json` declares `background.service_worker = "background.js"`, `permissions = ["activeTab", "contextMenus", "scripting", "storage"]`, no `host_permissions` or `<all_urls>`, and the 3 keyboard commands (`Alt+Shift+V`, `Alt+Shift+F`, `Alt+Shift+S`).
- [ ] TC-02: `public/icons/icon-16.png`, `icon-32.png`, `icon-48.png`, and `icon-128.png` exist and are valid binary PNG files.
- [ ] TC-03: `npm run build` outputs `dist/manifest.json`, `dist/background.js`, `dist/popup.html`, `dist/editor.html`, and `dist/icons/icon-*.png`.
- [ ] TC-04: `npm run typecheck && npm test && npm run build` pass with exit code `0`.

## 10. Tests to add or update
- `tests/unit/smoke.test.ts`: Asserts Manifest V3 service worker, commands, permissions, and valid PNG magic bytes for all 4 icon files.

## 11. Verification
- Run from repository root:
  `npm run typecheck && npm test && npm run build && ls -la dist/background.js dist/icons/`

## 12. Risks and notes
- Ensure `dist/background.js` is emitted at the exact path referenced by `manifest.json` (`"service_worker": "background.js"`).
