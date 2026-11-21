---
version: 1.0
name: snapmark-design-system
description: >
  A dark-studio, precision-engineered visual language designed for a local-first Chrome extension
  (Popup + Vector Annotation Editor). SnapMark pairs a deep carbon dark UI shell (#0F1115 to #1E222B)
  that makes bright or dark captured screenshots pop with maximum contrast, alongside a high-visibility
  Signal Red (#FF3B30) annotation brand accent and crisp, compact toolbars built for sub-5-second
  developer and product workflows. Zero external network font calls ensures strict offline privacy.

colors:
  primary: "#FF3B30"
  primary-hover: "#FF5147"
  primary-pressed: "#E02E24"
  on-primary: "#FFFFFF"
  secondary: "#262B36"
  accent: "#3B82F6"
  ink: "#F3F4F6"
  ink-muted: "#9CA3AF"
  ink-subtle: "#6B7280"
  canvas: "#0F1115"
  surface-1: "#171A21"
  surface-2: "#1E222B"
  surface-elevated: "#262B36"
  hairline: "#2A303C"
  hairline-strong: "#3B4354"
  focus-ring: "#FF3B30"
  success: "#22C55E"
  warning: "#F59E0B"
  danger: "#EF4444"
  info: "#3B82F6"
  annotation-red: "#FF3B30"
  annotation-yellow: "#FFCC00"
  annotation-green: "#34C759"
  annotation-blue: "#007AFF"
  annotation-white: "#FFFFFF"
  annotation-dark: "#1C1C1E"
  selection-highlight: "#FFEB3B"

typography:
  display-xl:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif"
    fontSize: 40px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -1.0px
  display-lg:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif"
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -0.6px
  display-md:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif"
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.4px
  heading-lg:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.2px
  heading-md:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif"
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.1px
  heading-sm:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif"
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: 0
  body-lg:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0
  body-sm:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
  caption:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif"
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: 0.1px
  button:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif"
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.4px
  code:
    fontFamily: "'SF Mono', 'JetBrains Mono', 'Cascadia Code', Consolas, monospace"
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0
  canvas-annotation:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: 0

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 10px
  xl: 14px
  pill: 9999px

spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  section: 48px

elevation:
  shadow-sm: "0 1px 2px rgba(0, 0, 0, 0.35)"
  shadow-md: "0 4px 12px rgba(0, 0, 0, 0.45)"
  shadow-lg: "0 12px 28px rgba(0, 0, 0, 0.55)"
  shadow-xl: "0 20px 48px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08)"

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 8px 14px
  button-secondary:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 8px 12px
  toolbar-tool-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 7px 12px
  popup-action-card:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: 10px 12px
  kbd-badge:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.code}"
    rounded: "{rounded.xs}"
    padding: 2px 6px
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 6px 10px
  card:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: 16px
---

## Overview

SnapMark's visual language is **Dark Studio Utility** — inspired by professional creative and developer tools like Linear, Figma's dark canvas, and macOS CleanShot. Because SnapMark is used by developers, QA engineers, product managers, and researchers to capture web content (which is predominantly white or light-themed) and annotate it in under 5 seconds, the UI shell itself must recede into a deep, low-glare carbon dark environment (`{colors.canvas}` `#0F1115` and `{colors.surface-1}` `#171A21`). This dark studio frame guarantees that any captured screenshot — whether a small text snippet with a 20px safety margin, a cropped `<img>`, or a 10-screen full-page scroll capture — stands out immediately with sharp edges and unmistakable boundaries.

Every pixel of the interface serves speed and clarity. There are no decorative marketing banners, no multi-level sidebars, and no external web font requests (respecting the PRD's strict zero-network-request privacy requirement). The visual identity is anchored by **Signal Red (`{colors.primary}` `#FF3B30`)** — the same iconic red used by default for vector arrows and primary calls-to-action ("Kopiuj do schowka").

## Colors

The color palette separates **UI Chrome Tokens** (the extension popup and editor workspace) from **Annotation Swatch Tokens** (the high-contrast colors applied to the vector canvas layer).

- **Primary vs Secondary vs Accent**:
  - Use `{colors.primary}` (`#FF3B30`, Signal Red) for the primary conversion action in the editor (**"Kopiuj do schowka"**), the active tool indicator accent, focus rings (`{colors.focus-ring}`), and the default vector annotation color (`{colors.annotation-red}`).
  - Use `{colors.secondary}` (`#262B36`) for secondary action buttons such as **"Pobierz PNG"**, **"Cofnij"**, and active tool pill backgrounds in the top toolbar.
  - Use `{colors.accent}` (`#3B82F6`) for informational UI states, selection bounding-box handles on the vector canvas, and progress bars during full-page scroll capture.
- **Surface Hierarchy (`canvas` → `surface-1` → `surface-2` → `surface-elevated`)**:
  - `{colors.canvas}` (`#0F1115`): The infinite workspace backdrop behind the screenshot in `editor.html` and the base background of `popup.html`. Includes a subtle 20px radial dot pattern (`rgba(255, 255, 255, 0.04)`) in the editor workspace to visually distinguish transparent PNG regions from the workspace floor.
  - `{colors.surface-1}` (`#171A21`): The fixed top toolbar in `editor.html` and action rows inside `popup.html`.
  - `{colors.surface-2}` (`#1E222B`): Segmented controls, property pills (stroke width selector, color swatch tray, underline/highlighter toggle), and `<kbd>` shortcut badges.
  - `{colors.surface-elevated}` (`#262B36`): Hovered action items, floating tooltips, and dropdown popovers.
- **Text Hierarchy (`ink` → `ink-muted` → `ink-subtle`)**:
  - `{colors.ink}` (`#F3F4F6`): Primary button labels, active tool names, and main headings.
  - `{colors.ink-muted}` (`#9CA3AF`): Inactive toolbar buttons, secondary descriptions in the popup, and image dimension metadata (e.g., `1280 × 720 px • @2x`).
  - `{colors.ink-subtle}` (`#6B7280`): Disabled buttons (e.g., "Cofnij" when `annotations.length === 0`), separator labels, and footer hints.
- **Semantic Colors**:
  - `{colors.success}` (`#22C55E`): Active state of the **"✓ Skopiowano!"** button feedback and completion badge.
  - `{colors.warning}` (`#F59E0B`): Warning banner when a full-page scroll capture hits the maximum safe `<canvas>` height limit (`MAX_CANVAS_HEIGHT`).
  - `{colors.danger}` (`#EF4444`): Error banners in `popup.html` when invoked on restricted pages (`chrome://`, Chrome Web Store) or destructive delete hover states.
  - `{colors.info}` (`#3B82F6`): Full-page capture progress indicator (`Przechwytywanie: klatka 3 z 7...`) and vector manipulation handles.
- **Vector Annotation Palette (Fixed 6-Color Tray)**:
  - `{colors.annotation-red}` (`#FF3B30`, default), `{colors.annotation-yellow}` (`#FFCC00`), `{colors.annotation-green}` (`#34C759`), `{colors.annotation-blue}` (`#007AFF`), `{colors.annotation-white}` (`#FFFFFF`), `{colors.annotation-dark}` (`#1C1C1E`).
  - When the **Zakreślacz (Highlighter)** mode is active, the selected annotation color is rendered on canvas with `ctx.globalAlpha = 0.35`.
  - When temporary DOM text highlighting before capture is enabled (`highlightSelectionBeforeCapture`), inject `{colors.selection-highlight}` (`#FFEB3B` at `0.45` alpha, i.e., `rgba(255, 235, 59, 0.45)`).

## Typography

To comply with the PRD's **Zero Network Requests** security constraint while achieving native OS crispness, SnapMark uses a pure system UI font stack (`-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif`) paired with a system monospace stack for keyboard shortcuts and pixel dimensions.

- **Display vs Heading vs Body Usage**:
  - `display-md` (`24px`, weight `600`) and `heading-lg` (`18px`, weight `600`) are used only in `editor.html` empty states or modal dialogs.
  - `heading-md` (`15px`, weight `600`) is used for the brand title in `popup.html` and `editor.html`.
  - `body` (`13px`, weight `400`) and `button` (`13px`, weight `500`) are the core workhorses across all popup rows and toolbar controls — sized at `13px` to match native Chrome desktop chrome density.
  - `label` (`11px`, weight `600`, uppercase tracking `0.4px`) categorizes toolbar groups and popup sections.
- **Monospace Usage (`{typography.code}`)**:
  - Always use `{typography.code}` (`11px`, weight `500`) for keyboard shortcut badges (`Alt+Shift+V`, `Alt+Shift+F`, `Ctrl+Z`, `Shift`), image resolution readouts (`1440×900 px`), and auto-generated filename previews (`domena-pl_2026-11-21_14-10.png`).
- **Canvas Vector Text (`{typography.canvas-annotation}`)**:
  - Text annotations placed on the screenshot use `{typography.canvas-annotation}` (base `20px` CSS scaled by the capture's `devicePixelRatio`, weight `600`) so comments remain bold and legible even on dense 4K/Retina screenshots.

## Layout

SnapMark has two distinct visual surfaces, each governed by a 4px base spacing grid (`{spacing.xs}` = `4px`, `{spacing.sm}` = `8px`, `{spacing.md}` = `12px`, `{spacing.lg}` = `16px`):

1. **Extension Popup (`popup.html`)**:
   - **Fixed Dimensions**: Width `320px`, auto height (`min-height: 260px`, `max-height: 480px`), outer padding `{spacing.md}` (`12px`).
   - **Structure**:
     - Compact header (`36px` height) with SnapMark logo mark, title, and status pill.
     - Vertical stack (`gap: 8px`) of 3 capture mode action cards: **Widoczny ekran (Viewport)**, **Cała strona ze scrollem**, and **Zaznaczony tekst** (dynamically shows whether text selection is detected on the active tab).
     - Footer divider (`1px solid {colors.hairline}`) followed by the preferences toggle row (*„Podświetl zaznaczony tekst na żółto”*) and a quick hint for right-clicking images (`PPM na obrazku → Edytuj i pobierz`).
2. **Vector Annotation Editor (`editor.html`)**:
   - **Full-Viewport App Shell**: `100vw × 100vh`, `display: flex; flex-direction: column; overflow: hidden` on `body`.
   - **Fixed Top Toolbar (`56px` height)**: `position: sticky; top: 0; z-index: 100`, horizontal flex layout (`justify-content: space-between; align-items: center; padding: 0 16px`), divided into 4 logical clusters separated by `1px × 24px` vertical hairlines (`{colors.hairline}`):
     - *Cluster 1 (Brand & Capture Meta)*: SnapMark icon + filename badge (`domena-pl_2026-11-21_14-10.png`) + dimensions badge.
     - *Cluster 2 (4 Primary Tools)*: Segmented tool selector for **Strzałka**, **Podkreślenie / Zakreślacz**, **Tekst**, plus **Cofnij (`Ctrl+Z`)** (and delete selected button).
     - *Cluster 3 (Contextual Properties)*: Color swatch picker (6 circles of `20px`), stroke thickness selector (`S / M / L` → `2px / 4px / 8px`), and mode sub-toggles (Underline vs Highlighter pill when tool #2 is active; Background Pill vs White Outline vs Plain toggle when tool #3 is active).
     - *Cluster 4 (Export CTAs)*: Secondary button **"Pobierz PNG"** and primary CTA **"Kopiuj do schowka"**.
   - **Scrollable Canvas Workspace (`calc(100vh - 56px)`)**:
     - `flex: 1; overflow: auto; display: flex; justify-content: center; align-items: flex-start; padding: 32px;`
     - Centers the captured screenshot horizontally (and vertically when smaller than the viewport) while allowing natural vertical and horizontal scrolling for long full-page captures.

## Elevation & Depth

- **Captured Screenshot Stage Elevation**:
  - The `<canvas>` element in `editor.html` must always cast `{elevation.shadow-xl}` (`0 20px 48px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08)`). This 1px subtle light rim combined with a deep ambient shadow ensures that both pure-black dark-mode screenshots and pure-white document screenshots have a crisp boundary against `{colors.canvas}` (`#0F1115`).
- **Toolbar & Floating Controls**:
  - The top toolbar uses a `1px solid {colors.hairline}` bottom border plus `{elevation.shadow-md}` so scrolled full-page screenshots pass cleanly underneath it.
  - In-canvas floating text input (`<textarea>` overlay while typing a Text annotation) uses `{elevation.shadow-lg}` and a `2px solid {colors.accent}` active frame.
- **Z-Index Strategy**:
  - `z-index: 1`: Base screenshot & vector rendering `<canvas>`.
  - `z-index: 10`: Active `<textarea>` text-editing overlay and vector endpoint drag handles above the canvas.
  - `z-index: 100`: Sticky top toolbar in `editor.html`.
  - `z-index: 200`: Toast notifications and non-blocking warning banners (e.g., max canvas height warning).

## Shapes

- **Border Radius Scale**:
  - `{rounded.xs}` (`4px`): Keyboard shortcut badges (`<kbd>`).
  - `{rounded.sm}` (`6px`): Inner segments inside segmented controls and stroke-width pills.
  - `{rounded.md}` (`8px`): All standard toolbar buttons, primary/secondary export buttons, and text inputs.
  - `{rounded.lg}` (`10px`): Capture action cards in `popup.html` and warning/error banners.
  - `{rounded.pill}` (`9999px`): Color swatches (`20px × 20px` circles) and status pills.
  - **Canvas Screenshot Corners**: The captured `<canvas>` itself must have **`border-radius: 0px`** so corner pixels of the user's screenshot are never clipped or distorted.
- **Icon Style**:
  - Use inline SVG icons with `16px × 16px` viewBox (`20px × 20px` in popup cards), `stroke-width: 1.75`, `stroke-linecap: round`, `stroke-linejoin: round`, using `currentColor`. Zero external icon font files.

## Components

### 1. Buttons (`button-primary`, `button-secondary`, `toolbar-tool-button`, `danger`)
- **Primary Button (`button-primary` — "Kopiuj do schowka")**:
  - Background `{colors.primary}` (`#FF3B30`), text `{colors.on-primary}` (`#FFFFFF`), `{rounded.md}` (`8px`), height `34px`, padding `0 14px`, icon + label.
  - *States*: Hover `{colors.primary-hover}`, Active `{colors.primary-pressed}`, Focus `2px solid {colors.focus-ring}` with `2px` offset.
  - *Success Variant*: When clicked, transitions immediately for `2000ms` to background `{colors.success}` (`#22C55E`) with label **"✓ Skopiowano!"**.
- **Secondary Button (`button-secondary` — "Pobierz PNG", "Cofnij")**:
  - Background `{colors.surface-2}`, border `1px solid {colors.hairline-strong}`, text `{colors.ink}`, height `34px`.
  - *States*: Hover background `{colors.surface-elevated}`, Disabled opacity `0.4` (`cursor: not-allowed`).
- **Toolbar Tool Button (`toolbar-tool-button` — Strzałka, Podkreślenie/Zakreślacz, Tekst)**:
  - Height `34px`, padding `0 12px`, `{rounded.md}`, displays SVG icon + concise Polish label + shortcut key hint.
  - *Active State*: Background `{colors.surface-elevated}`, border `1px solid {colors.primary}`, text `{colors.ink}`, with a `6px` `{colors.primary}` indicator dot or bottom accent bar.
- **Danger / Delete Button**:
  - Used for deleting a selected vector object (`Delete` / `Backspace` action) or clearing all annotations: ghost background by default, hover background `rgba(239, 68, 68, 0.15)` with text `{colors.danger}`.

### 2. Inputs (Color Swatches, Stroke Picker, Switch, In-Canvas Textarea)
- **Color Swatch Picker**:
  - Horizontal row of 6 circular buttons (`20px × 20px`, `{rounded.pill}`) for `#FF3B30`, `#FFCC00`, `#34C759`, `#007AFF`, `#FFFFFF`, `#1C1C1E`.
  - *Active State*: `2px solid #FFFFFF` outer ring with `0 0 0 2px {colors.canvas}` separation.
- **Sub-Mode Segmented Pill (Podkreślenie vs Zakreślacz / Styl Tekstu)**:
  - Container with `{colors.surface-2}`, padding `2px`, `{rounded.md}`. Active option gets `{colors.surface-elevated}` background and `{colors.ink}` text.
  - For Text Style Mode, switches between: **Tło (Kontrast)** (renders rounded pill background behind text), **Obrys (Biały)** (renders contrasting stroke outline around glyphs), and **Zwykły**.
- **Toggle Switch (Popup Preference — „Podświetl zaznaczony tekst na żółto”)**:
  - `36px × 20px` track (`{rounded.pill}`), unchecked `{colors.surface-2}`, checked `{colors.primary}`, with a `16px × 16px` white thumb (`transition: transform 150ms ease`).
- **In-Canvas Text Editor (`<textarea>` overlay)**:
  - Spawned at click coordinates `(x, y)` on the canvas when the **Tekst** tool is active. Transparent or semi-transparent pill background matching the chosen text readability mode, dashed `1.5px solid {colors.accent}` bounding border while focused, auto-resizing to content. Commits to the `annotations[]` vector array on `Blur` or `Enter` (without `Shift`), cancels on `Escape`.

### 3. Cards (`popup-action-card`, Empty State Card)
- **Popup Action Card (`popup-action-card`)**:
  - Full-width button (`100%` of popup inner width), background `{colors.surface-1}`, border `1px solid {colors.hairline}`, `{rounded.lg}` (`10px`), padding `10px 12px`, flex row aligning icon on the left, title + 1-line subtitle in the middle, and `<kbd>` shortcut badge on the right.
  - *Hover/Focus State*: Border `{colors.hairline-strong}`, background `{colors.surface-2}`, subtle left accent border `{colors.primary}`.
  - *Disabled State*: Used for "Zrób screena zaznaczenia" in the popup when no text is currently selected on the page (shows muted hint *"Zaznacz tekst na stronie"*).

### 4. Modals / Dialogs & Vector Handles
- **Vector Selection & Endpoint Handles**:
  - Clicking an existing vector object (`arrow`, `line`, `text`) selects it (`selectedId`).
  - For **Strzałka** and **Podkreślenie/Zakreślacz**, renders two draggable circular handles (`10px × 10px`, fill `#FFFFFF`, stroke `2px solid {colors.accent}`) at `(x1, y1)` and `(x2, y2)` so the user can reposition the arrowhead or tail after drawing, plus a `move` cursor on the shaft to translate the entire object.

### 5. Toasts / Alerts / Banners
- **Status Banner (Popup Restricted Page / Editor Max Height Warning)**:
  - Positioned below the top toolbar or inside the popup; background `rgba(245, 158, 11, 0.12)` with border `1px solid {colors.warning}` for warnings, or `rgba(239, 68, 68, 0.12)` with border `1px solid {colors.danger}` for restricted `chrome://` pages.

### 6. Navigation (Top Toolbar)
- Single horizontal bar (`56px` height) in `editor.html`. No sidebars, no nested dropdown menus deeper than 1 level, and no tabs — every v1 tool is visible and reachable in a single click.

### 7. Tables, Tabs, Avatars / Badges, Tooltips, Loaders & Empty States
- **Tables & Tabs**: Not used in v1 UI; tool sub-modes use compact 2-option or 3-option segmented pills directly in the toolbar.
- **Badges (`kbd-badge` & Metadata Pill)**:
  - `<kbd>` badges use `{components.kbd-badge}` (`{colors.surface-2}`, border `1px solid {colors.hairline-strong}`, `{typography.code}`).
- **Loaders (Full-Page Scroll Capture Progress)**:
  - During full-page scroll capture, `popup.html` displays an active progress bar (`height: 6px`, fill `{colors.accent}`, track `{colors.surface-2}`) with live frame counter (`Klatka 3 z 7 • Ukrywanie pływających nagłówków...`), while the extension action badge (`chrome.action.setBadgeText`) shows percentage/frame progress without injecting visible UI into the captured webpage DOM.
- **Empty State (`editor.html` without valid `captureId`)**:
  - Centered card (`max-width: 420px`) on `{colors.canvas}` explaining how to trigger a capture via context menu or popup, plus a fallback button to paste an image from clipboard (`Ctrl+V`).
- **Tooltips**:
  - Native `title` attributes supplemented by fast CSS tooltips (`{colors.surface-elevated}`, `{typography.caption}`, `4px 8px` padding) showing keyboard shortcuts (`Shift = idealny poziom`, `Ctrl+Z = Cofnij`, `Delete = Usuń zaznaczony`).

## Do's and Don'ts

### Do
- **Always** render the captured `<canvas>` at its exact physical pixel dimensions (`width = cssWidth * dpr`, `height = cssHeight * dpr`) and scale its CSS display box (`style.width = cssWidth + 'px'`) so Retina/4K screenshots remain razor-sharp in the editor and upon export.
- **Always** default the active tool to **Strzałka** and the active annotation color to Signal Red `{colors.annotation-red}` (`#FF3B30`) on first launch so the user can draw immediately after opening `editor.html`.
- **Always** render highlighter strokes (`subtype: 'highlighter'`) on the vector layer with `ctx.globalAlpha = 0.35` and constrain both underline and highlighter lines to a strict horizontal axis (`y2 = y1`) whenever the user holds the `Shift` key.
- **Always** show draggable endpoint handles (`(x1, y1)` and `(x2, y2)`) when a vector arrow is selected so the user can adjust the arrowhead or origin after drawing.
- **Always** support both contrasting background pill mode and contrasting stroke outline mode (`ctx.strokeText` + `ctx.fillText`) in the **Tekst** tool so labels are legible over both dark and light screenshots.
- **Always** provide immediate visual confirmation on **"Kopiuj do schowka"** by switching the button to `{colors.success}` (`✓ Skopiowano!`) for 2 seconds.

### Don't
- **Never** load external Google Fonts, external icon CDNs, or remote stylesheets via `https://` — the extension must operate 100% offline with zero network calls.
- **Never** apply `border-radius` or CSS filters to the screenshot `<canvas>` element itself, as doing so clips or alters edge pixels of the user's capture.
- **Never** bake annotations directly onto the source screenshot bitmap during drawing — always keep annotations in the vector objects array (`annotations[]`) and flatten them onto a composite canvas only when exporting to PNG or Clipboard.
- **Never** inject visible progress bars or floating toolbars into the target webpage DOM during `captureVisibleTab()` calls, as they will be burned into the resulting screenshot.
- **Never** clutter `editor.html` with collapsible sidebars, layer trees, or account/login prompts — all 4 core tools and export buttons must fit in the single `56px` top toolbar.
