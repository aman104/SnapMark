---
name: 04-planning-design-system
description: generate a DESIGN.md file from .speccraft/docs/02-General-PRD.md, then save the result to .speccraft/docs/03-Design.md. follows the DESIGN.md standard (https://getdesign.md). the file contains YAML front matter with machine-readable design tokens (colors, typography, spacing, shapes, components) and a markdown body with human-readable design rationale. use when a product already has a prd and the agent needs to define the visual language for AI coding agents.
---

# Planning Design System

## Repository layout

- All paths are relative to the repository root. The workflow workspace is `.speccraft/`:
  - `.speccraft/docs/` — product documents: `01-Idea.md` (with its roast `01-Idea-roast.md`), `02-General-PRD.md`, `03-Design.md`, `04-Interface-spec.md`, `05-Tech-Stack.md`, security reports and feature plans
  - `.speccraft/mockup/` — mockups, screenshots, sketches and other references supplied by the user (input only; ignore `.gitkeep`)
  - `.speccraft/milestones.md` — the ordered milestone plan with milestone statuses
  - `.speccraft/milestones/[Mnn]-[slug]/` — one folder per planned milestone: its `tasks.md` (task list with statuses), one `[NNN]-[slug]/` folder per task (`implementation-plan.md`, `report.md`, `review.md`, `blocker.md`), `milestone-report.md` and run summaries
  - `.speccraft/progress.md` — project memory shared by all tasks: commands, structure, conventions, decisions, log
  - `.speccraft/autopilot.md` — autopilot settings, the operator's brief and the decisions the autopilot made in place of the operator
  - `.speccraft/.runs/` — logs of autonomous runs (git-ignored)
  - `.speccraft/viewer/` — SpecCraft Board, the local dashboard (`.speccraft/board`); tooling, never modify it
  - `.speccraft/board` — starts SpecCraft Board; tooling, never modify it
- The product itself lives directly in the repository root, laid out as defined in `.speccraft/docs/05-Tech-Stack.md` (source, tests, manifests and lockfiles, configuration, migrations, `.env.example`, `README.md`, CI such as `.github/workflows/`). It can be any kind of product: web or mobile app, API, backend service, CLI, library/SDK, browser extension, desktop app, game, data or ML pipeline, multi-package workspace, and so on.
- If the repository already contains product code, treat it as the existing product: build on its structure and conventions instead of scaffolding a new one.
- Keep workflow and product apart: no product code, dependencies or build output in `.speccraft/`, `.agents/` or `.claude/`, and no workflow documents in the product tree. Do not modify `.agents/` or `.claude/` unless the user asks. `AGENTS.md` and `CLAUDE.md` in the repository root are shared agent instructions: keep their SpecCraft section (between the `speccraft:start` / `speccraft:end` markers) intact and add product-specific instructions only below it.
- An empty document counts as missing.

## Overview

Read the existing product definition from `.speccraft/docs/02-General-PRD.md`. Then produce a complete `DESIGN.md` file following the DESIGN.md standard and save it as `.speccraft/docs/03-Design.md`.

The DESIGN.md format is a plain-text design system document that AI coding agents read to generate consistent UI. It consists of two layers:

1. **YAML front matter** — machine-readable design tokens (hex codes, font sizes, spacing, radii, component specs)
2. **Markdown body** — human-readable design rationale, rules, and constraints

Use the PRD as the source of product intent and user needs. Do not invent a design direction that conflicts with it.

## Workflow

1. Read `.speccraft/docs/02-General-PRD.md`.
2. Check if there are any files in `.speccraft/mockup/`. If they exist, review and incorporate them as context — mockups and screenshots take precedence over generic defaults.
3. If the repository already contains product code with an established visual style (theme files, CSS variables, component library), document and extend it instead of inventing a new one.
4. Infer the product type, user workflows, complexity, target platforms, accessibility needs, and likely UI surface area.
5. Propose a cohesive design system that fits the product.
6. Write the final result to `.speccraft/docs/03-Design.md`.

If the required input file is missing, stop and explain which file is missing.

### Products without a graphical UI

Downstream skills always expect `.speccraft/docs/03-Design.md`, so never skip the file. Adapt it to the product's real surface:

- **CLI / terminal tools:** keep the YAML front matter minimal (e.g. ANSI color roles, symbols, spacing in characters) and describe output conventions in the body: tone of messages, colors and when to disable them (`NO_COLOR`, non-TTY), progress indicators, tables, error and help formatting, exit codes.
- **APIs, libraries, SDKs, services, pipelines:** state in the Overview that there is no visual UI, omit visual tokens, and describe the developer-facing "design": naming conventions, error format, documentation and example style. Replace the Components section with these conventions and keep the Do's and Don'ts.
- **Games:** cover art direction, palette, typography for HUD/menus, UI scale and readability, and feedback (animation, sound cues) in addition to the tokens.
- **Products with a UI plus other surfaces** (e.g. a web app with a public API): design the UI fully and add a short section for the other surfaces.

## Output rules

- Always write the result as a single markdown file.
- Always save to `.speccraft/docs/03-Design.md`.
- Be concrete and opinionated — propose exact values, not ranges.
- Prefer one recommended direction over multiple equal options.
- Keep naming consistent with the PRD.
- Tie decisions back to product goals, user type, and implementation constraints.
- Do not output vague advice like "choose colors that fit the brand". Propose the system directly.
- Use semantic color names (e.g., `primary`, `surface`, `ink`, `danger`) not raw descriptions.
- All token values must be concrete (hex codes, px values, font stacks) — never placeholders.

## Required structure for `.speccraft/docs/03-Design.md`

Always use this exact structure, consisting of YAML front matter followed by markdown sections.

### Part 1: YAML Front Matter

The YAML front matter goes between `---` delimiters at the top of the file. It contains all machine-readable design tokens.

```yaml
---
version: 1.0
name: [product-name]-design-system
description: >
  A one-paragraph description of the product's visual identity: dominant colors,
  typographic character, layout density, and overall aesthetic direction.
  Write this as if explaining the visual vibe to an AI agent that will
  generate UI from it.

colors:
  primary: "#hexvalue"
  primary-hover: "#hexvalue"
  primary-pressed: "#hexvalue"
  on-primary: "#hexvalue"
  secondary: "#hexvalue"
  accent: "#hexvalue"
  ink: "#hexvalue"
  ink-muted: "#hexvalue"
  ink-subtle: "#hexvalue"
  canvas: "#hexvalue"
  surface-1: "#hexvalue"
  surface-2: "#hexvalue"
  surface-elevated: "#hexvalue"
  hairline: "#hexvalue"
  hairline-strong: "#hexvalue"
  focus-ring: "#hexvalue"
  success: "#hexvalue"
  warning: "#hexvalue"
  danger: "#hexvalue"
  info: "#hexvalue"

typography:
  display-xl:
    fontFamily: "Primary Font, fallback, sans-serif"
    fontSize: 56px
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: -1.4px
  display-lg:
    fontFamily: "Primary Font, fallback, sans-serif"
    fontSize: 40px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.8px
  display-md:
    fontFamily: "Primary Font, fallback, sans-serif"
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -0.5px
  heading-lg:
    fontFamily: "Primary Font, fallback, sans-serif"
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.3px
  heading-md:
    fontFamily: "Primary Font, fallback, sans-serif"
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: -0.2px
  heading-sm:
    fontFamily: "Primary Font, fallback, sans-serif"
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  body-lg:
    fontFamily: "Body Font, fallback, sans-serif"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  body:
    fontFamily: "Body Font, fallback, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  body-sm:
    fontFamily: "Body Font, fallback, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  caption:
    fontFamily: "Body Font, fallback, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
  button:
    fontFamily: "Body Font, fallback, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0
  label:
    fontFamily: "Body Font, fallback, sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0.3px
  code:
    fontFamily: "Mono Font, 'SF Mono', monospace"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0

rounded:
  xs: 2px
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
  pill: 9999px

spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  section: 64px

elevation:
  shadow-sm: "0 1px 2px rgba(0,0,0,0.05)"
  shadow-md: "0 4px 6px rgba(0,0,0,0.07)"
  shadow-lg: "0 10px 15px rgba(0,0,0,0.1)"
  shadow-xl: "0 20px 25px rgba(0,0,0,0.15)"

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 8px 16px
  button-secondary:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 8px 16px
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 8px 12px
  card:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: 24px
---
```

**YAML front matter rules:**
- Every color must be a quoted hex string.
- Every typography entry must have all five properties: fontFamily, fontSize, fontWeight, lineHeight, letterSpacing.
- Component values may reference other tokens using `{colors.xxx}`, `{typography.xxx}`, `{rounded.xxx}` syntax.
- Add or remove color/typography/component entries as needed for the product — the lists above are minimums, not maximums.
- Adapt font families to use real, available fonts (Google Fonts preferred for web projects).
- Include dark mode color variants if the PRD implies dark mode support.

### Part 2: Markdown Body

After the closing `---` of the front matter, write the following sections using `##` headings. Each section explains the *why* behind the tokens and provides usage rules for the AI agent.

```
## Overview

A prose description of the product's visual personality. What does it feel like? 
What inspired the palette? How does the visual language serve the product goals?
Reference the PRD's target audience and product type.

## Colors

Explain the color strategy. Why were these colors chosen? Describe semantic roles:
- When to use primary vs secondary vs accent
- Surface hierarchy: canvas → surface-1 → surface-2 → elevated
- Text hierarchy: ink → ink-muted → ink-subtle
- When to use semantic colors (success, danger, warning, info)
- Dark mode considerations (if applicable)

## Typography

Explain the type system. Why these fonts? Describe:
- Display vs heading vs body usage
- When to use each weight
- How the type scale creates visual hierarchy
- Monospace usage for code/data contexts
- Line height rationale

## Layout

Explain the spacing and layout philosophy:
- Base spacing unit and scale rationale
- Grid system recommendations (columns, gutters, max-width)
- Breakpoints (mobile, tablet, desktop)
- Content density approach
- Section spacing patterns

## Elevation & Depth

Explain how visual depth is communicated:
- Shadow usage rules and when each shadow level applies
- Z-index strategy
- Overlay and backdrop patterns
- Border vs shadow for separation

## Shapes

Explain the shape language:
- Border radius scale and when to use each level
- Which components get which radius (buttons, cards, inputs, avatars)
- Pill vs rounded rectangle decisions
- Icon style (outline vs filled, stroke width, sizing)

## Components

Describe the component system. For each key component defined in the front matter:
- Purpose and primary use case
- States: default, hover, focus, active, disabled
- Variants (if any)
- Accessibility notes (contrast, focus ring, aria)
- Implementation guidance

Cover at minimum:
- Buttons (primary, secondary, ghost, danger)
- Inputs (text, select, checkbox, radio, switch, textarea)
- Cards (content, feature, pricing)
- Modals / dialogs
- Toasts / alerts / banners
- Navigation (top nav, sidebar, breadcrumbs)
- Tables
- Tabs
- Loaders / skeletons
- Empty states
- Avatars / badges
- Tooltips

## Do's and Don'ts

Explicit guardrails to prevent visual drift. Write as concrete rules:

### Do
- List specific things the AI agent should always do
- Example: "Always use {colors.primary} for primary CTAs"
- Example: "Always apply {rounded.md} to form inputs"

### Don't
- List specific things the AI agent must never do
- Example: "Never use more than one gradient on a page"
- Example: "Never use {colors.danger} for non-destructive actions"
- Example: "Never use font weight below 400 for body text"
```

**Markdown body rules:**
- Reference YAML tokens using `{token.path}` syntax in prose when helpful.
- Be prescriptive, not descriptive. "Use X" not "consider using X".
- The Do's and Don'ts section is critical — it prevents the most common AI mistakes. Include at least 5 Do's and 5 Don'ts.
- If the product is complex (dashboard, multi-flow app), add additional component entries in the YAML and describe them in the Components section.

## Decision rules

- If the product is B2B SaaS, prefer clarity, density control, strong table/form patterns, and efficient workflows. Use a professional neutral palette with a distinct primary accent.
- If the product is consumer-oriented, prefer stronger emotional tone, more expressive type scale, simpler navigation, and clearer progressive disclosure.
- If the product includes complex data work, prioritize readability, tabular typography, filtering patterns, and status communication.
- If the PRD suggests web app frameworks (Next.js, React), propose design tokens that map cleanly to CSS custom properties or a theme object.
- If the PRD suggests TailwindCSS, align spacing/color tokens with Tailwind's default scale where possible.
- If the PRD suggests mobile or cross-platform delivery, adapt component guidance and touch targets accordingly.
- If branding is not defined in the PRD, create a neutral but modern system appropriate for the product category.
- If the PRD implies trust-sensitive flows (payments, auth, health), strengthen feedback, confirmation, and error prevention patterns in the Do's and Don'ts.
- Prefer Google Fonts that are freely available. Suggest Inter, Outfit, or similar modern sans-serif families as defaults.

## Quality bar

The final `.speccraft/docs/03-Design.md` must be:
- Parseable by any AI coding agent that reads YAML front matter.
- Detailed enough that a designer or frontend engineer can start implementation without asking for the basics.
- Concrete enough that two different agents reading the same file would produce visually consistent output.
- Complete in both layers — tokens alone are not enough, rationale alone is not enough. Both must be present.
