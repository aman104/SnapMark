---
name: 07-planning-milestones
description: split the v1 product described in .speccraft/docs (idea, PRD, design, interface, tech stack) into a phased, waterfall-like roadmap of reviewable milestones saved as .speccraft/milestones.md — look & feel, clickable prototype, foundations, core features, complete features, quality, release — each with a visible outcome the operator can see, a demo and exit criteria. use after 06-planning-tech-stack, before 08-planning-tasks. does not create tasks or write code.
---

# Planning Milestones

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

Read all planning documents and produce `.speccraft/milestones.md`: a **phased roadmap** of milestones that together deliver the complete v1 product.

The roadmap works like a waterfall the operator can watch. The product grows through a fixed sequence of **phases**, from the look and feel, through a clickable prototype and the real foundations, to complete features, quality and release. Each phase is finished and accepted before the next one starts. At the end of every phase, and of every milestone inside it, the operator can see a clear, visible step forward compared to the previous one.

A milestone is the unit of **operator control**. Tasks are planned for one milestone at a time (`08-planning-tasks`). The execution agent works autonomously only within the active milestone (`10-execution-tasks`). At the end of every milestone the operator reviews the result and accepts it before the next milestone is planned. Milestones must therefore be:

- **visible:** at the end, the operator can run, click or call something and *see* what is new compared to the previous milestone
- **valuable to review:** the review can still change the direction of later milestones cheaply
- **sized for autonomy:** typically 5–15 tasks, executable in one unattended run

## Required inputs

Read these files first and treat them as mandatory:

1. `.speccraft/docs/01-Idea.md`
2. `.speccraft/docs/02-General-PRD.md`
3. `.speccraft/docs/03-Design.md`
4. `.speccraft/docs/04-Interface-spec.md`
5. `.speccraft/docs/05-Tech-Stack.md` (especially "Delivery recommendation")

Also check if there are any files in `.speccraft/mockup/` and review them as context.

If any file from `.speccraft/docs/` is missing, stop and clearly state which file is missing.

## Workflow

1. **Extract scope.** List every v1 functional requirement from the PRD, every screen and flow from the Interface spec, and every foundation from the Tech Stack. Ignore future scope and items the Tech Stack postpones.
2. **Choose the phases.** Start from the default phases below. Merge neighboring phases for a small product, but never reorder them. Skip a phase only when it has no content for this product, and say why in the roadmap.
3. **Split phases into milestones.** One milestone per phase is the default. Split a phase only when it needs more than ~15 tasks, and then into milestones that are each visible on their own (e.g. "Core features: projects" and "Core features: tasks").
4. **Define every milestone** with the required structure: phase, type, what you will see, goal, scope, out of scope, demo, exit criteria, dependencies, size.
5. **Write the roadmap table** at the top of the file. It is the operator's one-screen overview of how the product will grow.
6. **Check coverage.** Every v1 requirement and every screen must belong to a milestone. Fill in the coverage table.
7. **Save** to `.speccraft/milestones.md`.

## Default phases (products with a user interface)

| # | Phase | What the operator sees at the end | Typical type |
|---|---|---|---|
| 1 | **Look & feel** | the real frontend running a style guide page: colors, typography, spacing and every UI component from `03-Design.md` in all states | `prototype` |
| 2 | **Clickable prototype** | every screen, overlay and navigation path from `04-Interface-spec.md`, clickable on realistic sample data | `prototype` |
| 3 | **Foundations** | the prototype on real infrastructure: sign-up and sign-in work, data survives a restart, errors are logged, CI is green; the first screen runs on real data | `foundation` |
| 4 | **Core features** | the main user journey from the PRD working end to end on real data | `feature` |
| 5 | **Complete features** | all remaining v1 features and integrations (emails, payments, imports, background jobs) working on real data | `feature` |
| 6 | **Quality** | end-to-end tests of the main flows, performance and accessibility checks, security review fixes; a report the operator can read | `release` |
| 7 | **Release** | a deployable product: deployment configuration, production checklist, final README and a full walkthrough demo | `release` |

Rules for the phases:

- **Phase 1 and 2 are built in the real frontend technology from `05-Tech-Stack.md`,** so their code evolves into the product instead of being thrown away.
  - Use design tokens and components from `03-Design.md` and `.speccraft/mockup/`.
  - Mock data comes from local fixtures behind a data-access layer (e.g. `src/data/` with a mock implementation). Later phases swap that implementation without rewriting screens.
  - Empty, loading and error states can be shown on demand (e.g. a dev-only toggle or query parameter).
  - There is no real backend, authentication, persistence or integration yet. Sign-in screens only navigate.
- **Small products** may merge phases 1+2 and 6+7. A tiny product may even merge 4+5. The order of phases never changes.
- **Security, tests and observability** belong to every milestone from phase 3 on. The Quality phase hardens them and adds end-to-end coverage; it does not introduce them for the first time.
- Only create a throwaway prototype (e.g. static HTML) when the user explicitly asks for it.

### Products without a graphical user interface

Keep the same idea, a visible step per phase, with phases that fit the product:

| # | Phase | What the operator sees at the end |
|---|---|---|
| 1 | **Interface contract** | the full surface without logic: CLI with every command and `--help`, API with a mock server or OpenAPI explorer, library with its public API and stubbed examples |
| 2 | **Walking skeleton** | one complete path through the real architecture, from input to output |
| 3 | **Foundations** | configuration, persistence, logging, error handling, CI |
| 4 | **Core features** | the main use case working for real |
| 5 | **Complete features** | the remaining v1 capabilities |
| 6 | **Quality** | tests, performance, security, documentation of behavior |
| 7 | **Release** | packaging and publishing preparation (npm, PyPI, binary, container), docs, changelog |

For other product types, adapt the names but keep the visible step per phase. For example, a game: art & feel → playable vertical slice → core loop → content → polish → release. For an existing codebase: the smallest visible change first.

## Milestone types

| Type | Meaning | Effect on later skills |
|---|---|---|
| `prototype` | UI and UX only, mock data, no backend | task plans skip security, access control, observability and data concerns; UI states, accessibility and code quality still count |
| `foundation` | infrastructure, data, auth, cross-cutting concerns | task plans cover the quality concerns each task really needs |
| `feature` | user-facing capabilities on real data | task plans cover the quality concerns each task really needs |
| `release` | quality, hardening, deployment, docs | task plans cover the quality concerns each task really needs |
| `fix` | correction of behavior that does not match the specification (added later by `12-feature-advisor`) | regression test first, smallest possible change |

## Required structure for .speccraft/milestones.md

```markdown
# Milestones: [product name]

## Roadmap

| Phase | Milestones | What you will see at the end | Status |
|---|---|---|---|
| 1. Look & feel | M01 | style guide page with all components | planned |
| 2. Clickable prototype | M02 | every screen clickable on sample data | planned |
| 3. Foundations | M03 | real sign-in, data saved, first screen on real data | planned |
| ... | ... | ... | ... |

## [ ] M01 - [Milestone name]
- **Phase:** 1 — Look & feel
- **Type:** prototype | foundation | feature | release | fix
- **Source:** only for milestones added later, e.g. `docs/07-feature-plan-billing.md` (written by `12-feature-advisor`)
- **What you will see:** 1–3 plain-language sentences for the operator, written as before → after. What can they see or do after this milestone that they could not before?
- **Goal:** 2–3 sentences: what exists after this milestone and why it is worth reviewing at this point.
- **Scope:**
  - concrete items with source references (e.g. `PRD FR-1..FR-4`, `Interface-spec §5 "Dashboard"`)
- **Out of scope:**
  - items deliberately left for later milestones (name the milestone)
- **Demo for the operator:**
  - exact way to review the result (commands, URLs, demo accounts, what to click or call); commands run from the repository root unless stated otherwise
- **Exit criteria:**
  - [ ] verifiable condition that must hold for the milestone to be accepted
  - [ ] ...
- **Depends on:** previous milestones, or `none`
- **Estimated size:** number of tasks (e.g. 8–10)

## [ ] M02 - [Milestone name]
...

## Coverage

| Requirement / screen | Milestone |
|---|---|
| PRD FR-1 | M02 (UI), M04 (logic) |
| Interface-spec "Settings" | M02 (UI), M05 (logic) |
```

## Format rules

- Milestone headings must match exactly: `## [status] Mnn - Name`, where `nn` is a two-digit number starting from `01`. Scripts parse this line. Other headings (`## Roadmap`, `## Coverage`) must not look like milestone headings.
- Milestones are numbered in phase order: every milestone of phase N comes before any milestone of phase N+1.
- Statuses:

  | Status | Meaning | Set by |
  |---|---|---|
  | `[ ]` | planned, no tasks yet | this skill |
  | `[>]` | active: tasks defined, execution in progress | `08-planning-tasks` |
  | `[?]` | all tasks done, waiting for the operator's review | `10-execution-tasks` |
  | `[x]` | accepted by the operator | operator, or `08-planning-tasks` on the operator's explicit acceptance |

- The **Status** column of the roadmap shows `planned`, `in progress`, `in review` or `done` per phase. It is derived from its milestones and updated by `08-planning-tasks` when a milestone is activated or accepted.
- This skill always writes `[ ]` for new milestones and `planned` in the roadmap.
- A requirement may appear in two milestones only when it is split by layer, e.g. the UI in the prototype and the logic in a feature milestone. Say so explicitly in the coverage table.
- Write the content in the same language as the `.speccraft/docs/` documents. Keep the headings and field labels as defined above.

## Re-running this skill

If `.speccraft/milestones.md` already exists (e.g. after the prototype review changed the direction):

- keep milestones marked `[x]`, `[?]` or `[>]` unchanged, including their numbers and phases
- keep `[ ]` milestones that have a **Source** field (added by `12-feature-advisor`), unless the user says otherwise. You may only renumber them
- restructure only the other `[ ]` milestones, continuing the numbering after the last kept milestone and keeping the phase order. They have no folder in `.speccraft/milestones/` yet, so renumbering them is safe
- read the `milestone-report.md` files in `.speccraft/milestones/Mnn-*/` and the operator feedback in them, and reflect it in the remaining milestones
- update the roadmap table to match

## Quality bar

Before finishing, verify that:

- the roadmap table lists every phase with its milestones and a visible outcome
- every milestone has a phase, a "What you will see" written for a non-technical reader, a concrete demo and verifiable exit criteria
- phases are in the default order (merged or skipped phases are explained), and milestone numbers follow the phase order
- each milestone shows a visible difference compared to the previous one
- every v1 requirement and screen is covered (coverage table complete)
- the first milestone of a UI product is the Look & feel phase, or a merged Look & feel + Clickable prototype, unless the user asked otherwise
- no milestone depends on a later one
- each milestone is small enough for one autonomous run (≤ ~15 tasks); split larger ones within their phase
- the last milestone ends with a deployable, documented product

## Anti-patterns

Do not:

- create a milestone the operator cannot see or review ("refactoring", "internal cleanup", "backend only" with nothing to call or click). A foundation milestone still has a visible demo: sign in, data survives a restart, an API explorer, a green CI run.
- jump back to an earlier phase in the plan (e.g. new screens in the Quality phase). New UI after the prototype phases belongs to a feature milestone, and changes after acceptance go through `08-planning-tasks` (rework) or `12-feature-advisor`.
- put security, tests and observability only into the Quality phase
- define tasks or create milestone folders in this skill. That is the job of `08-planning-tasks`.

See `references/milestones-example.md` for an example.
