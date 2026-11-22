---
name: 05-planning-interface
description: deeply analyze .speccraft/docs/01-Idea.md, .speccraft/docs/02-General-PRD.md, and .speccraft/docs/03-Design.md to fully understand the application concept. create a highly detailed, comprehensive interface specification in .speccraft/docs/04-Interface-spec.md that maps user journeys, information architecture, specific screen layouts, UI component states, and data presentation. use this when the product has a PRD and design system, and the agent needs an exhaustive blueprint of the UI before implementation.
---

# Planning Interface

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

Read the existing product concept (`.speccraft/docs/01-Idea.md`), detailed requirements (`.speccraft/docs/02-General-PRD.md`), and design system (`.speccraft/docs/03-Design.md`). Then produce an exhaustive, structured interface specification and save it as `.speccraft/docs/04-Interface-spec.md`.

The `04-Interface-spec.md` is the ultimate blueprint for the application's UI. It goes beyond a simple list of screens—it defines the Information Architecture (IA), user flows, data mapping, edge cases (empty/loading/error states), and exact component placement. It must provide enough detail so that an AI coding agent or a frontend engineer can build the exact views without making major structural or UX decisions.

## Workflow

1. **Context Gathering:** Read `.speccraft/docs/01-Idea.md`, `.speccraft/docs/02-General-PRD.md`, and `.speccraft/docs/03-Design.md`.
2. **Analysis:** Analyze the product's core value proposition and the user personas. 
3. **Information Architecture:** Map out the sitemap, navigation tree, and how users will move between views.
4. **Core Journeys:** Identify the critical paths (e.g., Sign Up -> Dashboard -> Create Item).
5. **Screen Specifications:** For every screen, detail its purpose, layout structure, specific UI elements (referencing `03-Design.md` tokens), data displayed, and interactive behaviors.
6. **State Definitions:** Define how the UI handles non-ideal states (empty, loading, error).
7. **Write Specification:** Compile all this into `.speccraft/docs/04-Interface-spec.md`.

If any of the required input files are missing, stop and inform the user. Also check `.speccraft/mockup/` and treat mockups and screenshots as the primary visual reference. If the repository already contains product code, map the existing screens/commands first and mark what is new.

### Products without a graphical UI

The interface specification describes the product's real interaction surface; always write `.speccraft/docs/04-Interface-spec.md`. Keep the section numbering and adapt the content:

- **CLI:** §2 becomes the command tree (commands, subcommands, flags, arguments, config files, env vars); §5 specifies each command: purpose, input, output (exact sample output), exit codes, interactive prompts; §7 covers errors, help text, progress and non-TTY behavior; §8 covers platforms and shells.
- **API / backend service:** §2 lists resources and endpoints (or events/queues); §5 specifies each endpoint: method, path, auth, request, response, errors, pagination, rate limits; §7 covers the shared error format, versioning and idempotency.
- **Library / SDK:** §2 lists modules and the public API; §5 specifies each entry point: signature, parameters, return values, errors, examples; §7 covers error types, configuration and compatibility.
- **Game:** §2 covers scenes/screens and game states; §3 the core gameplay loop; §5 HUD, menus and controls per scene; §8 input devices and target platforms.
- **Pipeline / automation:** §2 lists stages and triggers; §5 specifies inputs, outputs and data contracts of each stage; §7 covers failure, retry and observability behavior.

## Output Rules

- Always write the result as a single markdown file saved to `.speccraft/docs/04-Interface-spec.md`.
- Be highly prescriptive. Do not say "Add a form", say "Add a vertical form containing an email input {components.text-input}, a password input, and a primary submit button {components.button-primary}".
- Map PRD features explicitly to UI components.
- Do not write source code. Write an architectural and structural blueprint.
- Strictly adhere to the design rules and tokens from `03-Design.md`.

## Required Structure for `.speccraft/docs/04-Interface-spec.md`

Always use this exact structure, filling it with comprehensive details:

```markdown
# Interface Specification

## 1. Executive Summary & UI Paradigm
Briefly explain the application's visual approach. Is it a dense B2B dashboard, a mobile-first social feed, a multi-step wizard, or a document editor? Explain the core navigation paradigm (e.g., persistent left sidebar with top-level tabs).

## 2. Information Architecture (Sitemap)
Provide a hierarchical list of all pages/views in the application.
- `/` (Landing Page)
- `/dashboard` (Main Dashboard)
  - `/projects` (Project List)
    - `/projects/[id]` (Project Detail)

## 3. Core User Flows
Describe step-by-step UI changes for the top 2-3 most important user journeys.
- **Flow: Creating a new item**: User clicks 'New' in Header -> Modal opens -> User fills 3 fields -> Clicks Save -> Toast notification appears -> List updates.

## 4. Global UI Elements
Describe elements that persist across multiple screens.
- **Header**: Content (logo, user avatar, global search). Behavior (sticky vs scrolling).
- **Sidebar / Navigation**: List of links, active states, collapse behavior.
- **Footer**: Links, copyright, secondary navigation.

## 5. Screen Specifications
For EVERY major screen in the IA, provide a detailed breakdown:

### [Screen Name] (e.g., Project Dashboard)
- **Purpose**: What does the user accomplish here?
- **Layout Structure**: e.g., "Standard App Layout: Left Sidebar + Top Header + Scrollable Main Content Area."
- **Data Mapping**: What data from the PRD is displayed here? (e.g., User Name, List of recent projects, Revenue stats).
- **UI Sections & Elements**:
  - **Top Bar / Actions**: e.g., "H1 Heading 'Dashboard'. Right-aligned primary button 'New Project' using `{components.button-primary}`."
  - **Main Content**: e.g., "A responsive CSS grid (3 columns). Each cell is a Metric Card `{components.card}` displaying..."
  - **List/Table Area**: e.g., "Data table with columns: Name, Status (using badge component), Date, Actions (ellipsis menu)."
- **Interactions & Transitions**: e.g., "Hovering over a row highlights the background. Clicking a row navigates to Project Detail."

## 6. Modals, Drawers & Overlays
List out-of-flow UI elements.
- **[Overlay Name]**: Trigger mechanism, layout, input fields, primary/secondary actions, and dismiss behavior.

## 7. Common UI Patterns & States
Define how the application handles generic UX patterns.
- **Forms & Validation**: Standard form layout (labels on top vs left), inline error message placement.
- **Empty States**: What does a list look like when there are 0 items? (e.g., Illustration + helpful text + CTA button).
- **Loading States**: Skeletons vs spinners. Page-level vs component-level loading.
- **Error Handling**: Toast notifications for success/failure, full-page error boundaries (404/500 screens).

## 8. Responsive & Platform Specifics
- **Mobile Breakpoint (<768px)**: E.g., "Sidebar converts to a hamburger menu. Data tables convert to stacked card lists."
- **Tablet Breakpoint (768px - 1024px)**: E.g., "Sidebar collapses to icons only."
- **Desktop (1024px+)**: Standard behavior.
```

## Quality Bar

The final `.speccraft/docs/04-Interface-spec.md` must be:
- **Exhaustive**: No feature mentioned in the PRD should lack a defined UI representation.
- **Developer-Ready**: An engineer should be able to read this and immediately know what components to build, what props they need, and where they go on the screen.
- **State-Aware**: Accounts for the "unhappy paths" (empty lists, loading delays, form errors) not just the perfect mockups.
- **Consistent**: Uses the exact terminology, tokens, and component names established in the design system.
