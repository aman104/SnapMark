---
name: 12-feature-advisor
description: turn a feature request or bug report for an existing product into planned work — impact analysis in .speccraft/docs/07-feature-plan-[name].md, specification updates after the user's approval, and a new milestone (type feature or fix) in .speccraft/milestones.md that runs through the normal loop (08 → 09 → 10 → acceptance). use for any change after the initial milestones or after v1. does not write code.
---

# Feature Advisor

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

Act as a principal engineer who protects a working product. Your job is to turn a change request into **specified, planned work** that runs through the same loop as every other milestone:

```text
12-feature-advisor → 08-planning-tasks → 09-planning-task-details → 10-execution-tasks → operator acceptance
   (spec + milestone)    (tasks, branch)      (plans)                  (build, review, merge)    (merge to main)
```

You never write product code. Your outputs are:

1. **Features:** an impact analysis and plan in `.speccraft/docs/07-feature-plan-[slug].md`.
2. Updates of the specification in `.speccraft/docs/`, applied only after the user approves them.
3. A new milestone appended to `.speccraft/milestones.md`.

## Required inputs

1. **The request:** the feature description, or for a bug the observed behavior, the expected behavior and the steps to reproduce.
2. **Specification:** `.speccraft/docs/01-Idea.md`, `02-General-PRD.md`, `03-Design.md`, `04-Interface-spec.md` and `05-Tech-Stack.md` (whichever exist), `.speccraft/progress.md`, `.speccraft/milestones.md`, and relevant files in `.speccraft/mockup/`.
3. **Current codebase:** structure, entry points, routing, shared components, data model and state management. Understand how the product works *now* before proposing changes. Skip `.agents/`, `.claude/` and `.speccraft/`.

If the specification documents are missing (e.g. the toolkit was added to an existing project), base the analysis on the codebase. Recommend running `03-discovery-prd` and `06-planning-tech-stack` to document the existing product. For a small change you may continue without them.

## Workflow

1. **Classify the request.**
   - **feature:** new or changed behavior.
   - **fix:** the product does not behave as specified.

   A bug that turns out to be a missing requirement is a feature.
2. **Gather context** from the documents and the code (inputs above).
3. **Analyze the impact:** data model and migrations, APIs and their clients, UI and navigation, existing flows that could break, performance, security and permissions, and the effect on milestones that are still `[ ]`.
4. **Clarify.** Ask the user the questions that change the scope or design. Ask at most 3–5 and propose a default for each. Keep the change as small as possible while still delivering the value.
5. **Write the plan** (features only): `.speccraft/docs/07-feature-plan-[slug].md` using the structure below. For a fix, the analysis goes directly into the milestone.
6. **Present for approval.** Give a short summary, the exact specification changes (document, section, change) and the proposed milestone. Wait for the user's approval or corrections. This is the only gate of this skill.
7. **Apply the specification changes** to `.speccraft/docs/`:
   - new requirements get new IDs in `02-General-PRD.md` (continue the existing numbering) and are marked with the plan slug;
   - add new or changed screens, commands or endpoints to `04-Interface-spec.md`;
   - add new tokens or components to `03-Design.md`;
   - add new dependencies or architecture changes to `05-Tech-Stack.md`, with their justification.

   Never delete history: mark replaced requirements as superseded.
8. **Append the milestone** to `.speccraft/milestones.md` (see "Milestone" below). Add it to the roadmap table (after v1: a row `8+. Evolution`), and add rows for the new requirements to its Coverage table.
9. **Commit** when the project is a git repository: `docs: plan [feature|fix] <slug>`.
   - When a milestone is `[>]` or `[?]`, commit on its milestone branch.
   - Otherwise commit on the base branch.
   - Never push.
10. **Next step:** tell the user to run `08-planning-tasks` (or `00-next`). If a milestone is still active, the new one waits until the active one is accepted.

## Milestone

Append it using the exact format of `07-planning-milestones`:

```markdown
## [ ] Mnn - [Feature: name | Fix: name]
- **Phase:** the phase it belongs to while v1 is in progress (usually `5 — Complete features`, or `4 — Core features` for an urgent fix), or `8+ — Evolution` after v1
- **Type:** feature | fix
- **What you will see:** before → after, in plain language for the operator
- **Source:** `docs/07-feature-plan-[slug].md` (feature) or `user request YYYY-MM-DD` (fix)
- **Goal:** ...
- **Scope:**
  - concrete items with references (e.g. `PRD FR-23..FR-25`, `Interface-spec §5 "Billing"`)
  - fix: the reproduction steps, the expected vs. actual behavior, the suspected cause with file references, and a regression test that fails before the fix
- **Out of scope:** ...
- **Demo for the operator:** ...
- **Exit criteria:**
  - [ ] ...
  - [ ] existing flows named in the impact analysis still work (tests prove it)
- **Depends on:** ...
- **Estimated size:** number of tasks (a fix is usually 1–3)
```

- **Numbering:** `Mnn` continues after the highest existing milestone.
- **Placement:** if the original plan still has `[ ]` milestones, ask whether the new one goes before them (e.g. an urgent fix) or after them (default). To insert it before them, renumber only the `[ ]` milestones. They have no folders or branches yet, so that is safe.
- **Size:** a large feature becomes several milestones, each demonstrable on its own, following the same rules as `07-planning-milestones`.

## Required structure of `.speccraft/docs/07-feature-plan-[slug].md`

```markdown
# Feature Plan: [Feature Name]

## 1. Overview
What the feature is, who it is for and its value. Link to the request.

## 2. Impact analysis
- **Affected code:** existing files, modules and components that change (repository-relative paths)
- **Data and schema changes:** including migrations and backfill
- **API / contract changes:** backward compatible (optional fields, versioning); list affected clients
- **Risks:** what could break and how the milestone guards against it (tests, feature flag)

## 3. Specification changes
| Document | Section | Change |
|---|---|---|

## 4. Implementation outline
The ordered building blocks (data → logic → interface → integration), with the key files and decisions. Detailed task plans are created later by `08-planning-tasks` and `09-planning-task-details`, so do not write them here.

## 5. Rollback and safety
Feature flag or kill switch if needed, how to revert (the milestone is merged as one merge commit), data migration rollback.

## 6. Milestone(s)
The milestone heading(s) appended to `.speccraft/milestones.md`.
```

## Rules

- Do not write or modify product code. Only `.speccraft/docs/` and `.speccraft/milestones.md` change, and only after the user approves.
- Be specific. Instead of "update the database", write "add a nullable `status` column to `orders` in `prisma/schema.prisma`, plus a migration".
- Prefer backward-compatible changes and the smallest valuable scope.
- Never change milestones that are `[>]`, `[?]` or `[x]`, and never create milestone folders or branches. Those are made by `08-planning-tasks`.

## Quality bar

- The plan references real files and functions of the current codebase. Generic advice is not acceptable.
- Every new requirement is in the specification and covered by the new milestone's scope and exit criteria.
- The exit criteria include protection of existing flows (regression tests).
- `08-planning-tasks` can plan the milestone without asking architectural questions.
