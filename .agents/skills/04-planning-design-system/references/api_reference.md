# DESIGN.md Standard Reference

## What is DESIGN.md?

DESIGN.md is a plain-text design system document that AI coding agents read to generate consistent UI. It was introduced as a concept by Google Stitch and popularized by the community (https://getdesign.md).

It's a markdown file with two layers:
1. **YAML front matter** — machine-readable design tokens
2. **Markdown body** — human-readable design rationale

## File Structure

```
---
version: 1.0
name: product-name-design-system
description: "One-paragraph visual identity summary"

colors:
  primary: "#hexvalue"
  ...

typography:
  display-xl:
    fontFamily: "Font, fallback, sans-serif"
    fontSize: 56px
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: -1.4px
  ...

rounded:
  sm: 4px
  md: 8px
  ...

spacing:
  sm: 8px
  md: 16px
  ...

elevation:
  shadow-sm: "0 1px 2px rgba(0,0,0,0.05)"
  ...

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 8px 16px
  ...
---

## Overview
Prose description of visual personality.

## Colors
Semantic color strategy and usage rules.

## Typography
Type system rationale and hierarchy.

## Layout
Spacing philosophy, grid system, breakpoints.

## Elevation & Depth
Shadow usage, z-index strategy, overlay patterns.

## Shapes
Border radius rules, icon style, component-specific shapes.

## Components
Component specifications, states, variants, accessibility.

## Do's and Don'ts
Explicit guardrails to prevent visual drift.
```

## Canonical Section Order

When present, sections should follow this order:
1. Overview
2. Colors
3. Typography
4. Layout
5. Elevation & Depth
6. Shapes
7. Components
8. Do's and Don'ts

## Token Cross-Referencing

Components can reference other tokens using `{token.path}` syntax:
- `{colors.primary}` → references the primary color
- `{typography.button}` → references the button typography set
- `{rounded.md}` → references the medium border radius

## Best Practices

- **Be prescriptive**: "Use 8px border-radius for all cards" not "consider rounded corners"
- **Use semantic names**: `primary`, `surface`, `ink`, `danger` — not `blue`, `gray`, `black`, `red`
- **Pair tokens with rationale**: The token tells *what*, the prose tells *why* and *how*
- **Living document**: Start minimal, expand as the project grows
- **Do's and Don'ts are critical**: They prevent the most common AI visual mistakes

## Sources

- Standard definition: https://getdesign.md/what-is-design-md
- Example collection: https://github.com/VoltAgent/awesome-design-md
- Google Stitch docs: https://stitch.withgoogle.com/docs/design-md/overview/
