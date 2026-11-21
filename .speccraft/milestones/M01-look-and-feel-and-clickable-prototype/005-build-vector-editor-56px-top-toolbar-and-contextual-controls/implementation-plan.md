# Task 005: Build vector editor 56px top toolbar and contextual controls

## 1. Summary
- **Task:** 005 - Build vector editor 56px top toolbar and contextual controls - Implement the fixed 56px top toolbar in editor.html, src/styles/editor.css and src/editor/index.ts matching 04-Interface-spec.md section 5.2 Cluster 1 through Cluster 4. Build Cluster 1 (brand badge, domena-pl_2026-11-21_14-10.png filename preview and 1280x800 @2x resolution pill), Cluster 2 (Strzalka, Linia / Marker and Tekst tool buttons with keyboard shortcuts 1, 2, 3), Cluster 3 (6-color swatch tray defaulting to #FF3B30 and dynamic contextual sub-controls for stroke width 2/4/8px, Podkreslenie vs Zakreslacz with Shift hint, and text readability mode Tlo / Obrys / Czysty) and Cluster 4 (Cofnij Ctrl+Z, Usun Delete, Pobierz PNG and Kopiuj do schowka with 2-second Skopiowano! green feedback state). The task is done when switching tools dynamically updates Cluster 3 controls, keyboard shortcuts 1/2/3 switch tools, and Kopiuj do schowka transitions to the success state.
- **Milestone:** M01 - Look & feel and clickable prototype (type: prototype)
- **Type:** `ui`, `prototype`
- **Depends on:** 001, 002, 003
- **Parallel:** `safe` — touches `editor.html`, `src/styles/editor.css`, `src/editor/index.ts` and `tests/unit/editor-toolbar.test.ts` (does not conflict with task 004)
- **Sources:** `04-Interface-spec.md §5.2 "Screen 2: Vector Annotation Editor (Cluster 1–4)"`, `04-Interface-spec.md §8 "Responsive & Platform Specifics"`, `03-Design.md Layout & Components`

## 2. Goal
Build the sticky `56px` 4-cluster top toolbar of `editor.html` with reactive tool selection (**Strzałka**, **Linia / Marker**, **Tekst**), contextual property controls (6-color swatch tray defaulting to `#FF3B30`, stroke width `2/4/8px`, Underline vs Highlighter toggle with `Shift = poziom` hint, and Text Readability Mode toggle `Tło / Obrys / Czysty`), history controls (`Cofnij Ctrl+Z`, `Usuń`), and export actions (`Pobierz PNG`, `Kopiuj do schowka` with 2-second `✓ Skopiowano!` green feedback).

## 3. Scope
**In scope:**
- `editor.html` and `src/styles/editor.css` implementing the full-viewport dark shell (`100vw × 100vh`) and fixed `56px` `.editor-toolbar` with 4 clusters separated by `1px × 24px` hairlines
- **Cluster 1 (Brand & Metadata)**: SnapMark logo + `#meta-filename` (`domena-pl_2026-11-21_14-10.png`) + `#meta-dimensions` (`1280×800 • @2x`)
- **Cluster 2 (Primary Vector Tools)**:
  - `#tool-arrow` (**"Strzałka"** + `<kbd>1</kbd>`, active by default)
  - `#tool-line` (**"Linia / Marker"** + `<kbd>2</kbd>`)
  - `#tool-text` (**"Tekst"** + `<kbd>3</kbd>`)
- **Cluster 3 (Contextual Style & Properties)**:
  - `#color-picker`: 6 circular swatches (`#FF3B30` active by default, `#FFCC00`, `#34C759`, `#007AFF`, `#FFFFFF`, `#1C1C1E`)
  - `#stroke-width-picker` (visible when `activeTool === 'arrow'` or `activeTool === 'line' && lineSubtype === 'underline'`): 3 segments `2px`, `4px` (default), `8px`
  - `#line-subtype-picker` (visible when `activeTool === 'line'`): 2 segments **"Podkreślenie"** and **"Zakreślacz"** + `<kbd>Shift</kbd> = poziom` badge
  - `#text-style-picker` (visible when `activeTool === 'text'`): 3 segments **"Tło"** (`background`), **"Obrys"** (`outline`), **"Czysty"** (`plain`)
- **Cluster 4 (History & Export)**:
  - `#btn-undo` (**"Cofnij"** + `<kbd>Ctrl+Z</kbd>`)
  - `#btn-delete-selected` (trash icon button, `title="Usuń zaznaczony obiekt (Delete / Backspace)"`)
  - `#btn-download-png` (**"Pobierz PNG"**)
  - `#btn-copy-clipboard` (**"Kopiuj do schowka"**, switches to `.is-success` `#22C55E` with text **"✓ Skopiowano!"** for `2000ms` when clicked)
- Responsive media query `< 1100px` in `src/styles/editor.css` hiding `<kbd>` badges inside buttons and compacting `#meta-filename` (`max-width: 160px; text-overflow: ellipsis`) so the `56px` toolbar stays on a single line (`04-Interface-spec.md §8`)
- Keyboard shortcut listeners for `1`, `2`, `3` (tool switch) and `Ctrl+Z` / `Cmd+Z` (undo callback)
- Unit tests in `tests/unit/editor-toolbar.test.ts`

**Out of scope:**
- Scrollable HiDPI `<canvas>` stage rendering, fallback empty state card, and max-height warning banner — task 006

## 4. Current state and prerequisites
- Tasks 001, 002, and 003 completed (`tokens.css`, `types.ts`, `constants.ts`, `mock-captures.ts`).

## 5. Implementation steps
1. Implement `src/styles/editor.css` defining `.editor-shell`, `.editor-toolbar` (`height: 56px`), `.toolbar-cluster`, `.toolbar-divider`, contextual pill groups, and the `@media (max-width: 1100px)` compact rule.
2. Implement `src/editor/index.ts` with an exported `initEditor(root: HTMLElement, options?: { initialSearch?: string })` controller managing reactive toolbar state (`activeTool`, `lineSubtype`, `activeColor`, `strokeWidth`, `textStyleMode`, `historyCount`, `hasSelection`, `copySuccess`).
3. Render the 4 toolbar clusters and wire click + keyboard handlers (`1`, `2`, `3` to switch tools; color swatch selection; stroke width selection; line subtype toggle; text style toggle; `Ctrl+Z`/`Cmd+Z` undo; `#btn-copy-clipboard` 2-second `"✓ Skopiowano!"` state transition).
4. Expose an state-change subscriber hook (`onStateChange`) on the editor controller so task 006's canvas stage re-renders live whenever the user changes tool properties in the toolbar.
5. Add unit tests in `tests/unit/editor-toolbar.test.ts` verifying default tool/color (`arrow`, `#FF3B30`, `4px`), dynamic Cluster 3 switching across tools `1`, `2`, `3`, keyboard shortcuts, and the 2-second `"✓ Skopiowano!"` transition.

## 6. Files

| Path | Action (create / modify) | Purpose |
|---|---|---|
| `editor.html` | modify | Vector editor HTML entry structure |
| `src/styles/editor.css` | modify | 56px 4-cluster toolbar and responsive `<1100px` styles |
| `src/editor/index.ts` | modify | Editor toolbar controller, state machine, and keyboard shortcuts |
| `tests/unit/editor-toolbar.test.ts` | create | Unit tests for toolbar clusters, tool switching, and export feedback |

## 7. Contracts and data (if applicable)
- `EditorState`: `{ activeTool: EditorTool; lineSubtype: LineSubtype; activeColor: AnnotationColor; strokeWidth: StrokeWidth; textStyleMode: TextStyleMode; annotations: AnnotationItem[]; historyStack: AnnotationItem[][]; selectedAnnotationId: string | null }`.

## 8. UI details (if applicable)
- Fixed top bar `56px` height, `--color-surface-1` (`#171A21`), bottom border `1px solid var(--color-hairline)`, `--shadow-md`.
- Default active tool: `#tool-arrow` (**Strzałka**), default color: `#FF3B30`, default stroke width: `4px`.
- When `#btn-copy-clipboard` is clicked, it adds `.is-success` (`background: #22C55E`) and displays `"✓ Skopiowano!"` for `2000ms`.

## 9. Acceptance criteria
- [ ] TC-01: On initial render, `#tool-arrow` is active, `#FF3B30` color swatch is selected, and `#stroke-width-picker` (`4px` active) is visible in Cluster 3.
- [ ] TC-02: Clicking `#tool-line` (or pressing key `2`) activates **Linia / Marker** and displays `#line-subtype-picker` (**Podkreślenie** / **Zakreślacz**) plus the `Shift = poziom` hint badge.
- [ ] TC-03: Clicking `#tool-text` (or pressing key `3`) activates **Tekst** and displays `#text-style-picker` (**Tło** / **Obrys** / **Czysty**).
- [ ] TC-04: Clicking `#btn-copy-clipboard` transitions the button label to `"✓ Skopiowano!"` with class `.is-success` and reverts after `2000ms`.
- [ ] TC-05: Pressing `Ctrl+Z` (or `Cmd+Z`) or clicking `#btn-undo` pops the previous state from `historyStack`.
- [ ] TC-06: `npm run typecheck && npm test && npm run build` pass.

## 10. Tests to add or update
- `tests/unit/editor-toolbar.test.ts`: Tests Cluster 1 metadata rendering, Cluster 2 tool switching via click and keys `1`/`2`/`3`, Cluster 3 contextual controls visibility and updates, Cluster 4 undo/delete states, and `"✓ Skopiowano!"` timer transition (using `vi.useFakeTimers()`).

## 11. Verification
- Run from repository root:
  `npm run typecheck && npm test && npm run build`

## 12. Risks and notes
- Ignore `1`, `2`, `3`, `Delete`, `Backspace` single-key shortcuts whenever focus is inside a `<textarea>` or `<input>` element (`04-Interface-spec.md §5.2`).
