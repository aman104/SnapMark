---
name: 09-planning-task-details
description: create a detailed implementation plan for every pending task of the active milestone from its .speccraft/milestones/[Mnn]-[slug]/tasks.md. for each such task, create a folder .speccraft/milestones/[Mnn]-[slug]/[NNN]-[slug]/ containing implementation-plan.md with goal, scope, exact implementation steps, files, contracts, acceptance criteria and verification steps. use after 08-planning-tasks, before 10-execution-initial. this skill only plans, it does not write application code.
---

# Planning Task Details

## Repository layout

- All paths are relative to the repository root. The workflow workspace is `.speccraft/`:
  - `.speccraft/docs/` — product documents: `01-Idea.md`, `02-General-PRD.md`, `03-Design.md`, `04-Interface-spec.md`, `05-Tech-Stack.md`, security reports and feature plans
  - `.speccraft/mockup/` — mockups, screenshots, sketches and other references supplied by the user (input only; ignore `.gitkeep`)
  - `.speccraft/milestones.md` — the ordered milestone plan with milestone statuses
  - `.speccraft/milestones/[Mnn]-[slug]/` — one folder per planned milestone: its `tasks.md` (task list with statuses), one `[NNN]-[slug]/` folder per task (`implementation-plan.md`, `report.md`, `review.md`, `blocker.md`), `milestone-report.md` and run summaries
  - `.speccraft/progress.md` — project memory shared by all tasks: commands, structure, conventions, decisions, log
  - `.speccraft/.runs/` — logs of autonomous runs (git-ignored)
  - `.speccraft/viewer/` — the local dashboard (`node .speccraft/viewer/server.mjs`); tooling, never modify it
- The product itself lives directly in the repository root, laid out as defined in `.speccraft/docs/05-Tech-Stack.md` (source, tests, manifests and lockfiles, configuration, migrations, `.env.example`, `README.md`, CI such as `.github/workflows/`). It can be any kind of product: web or mobile app, API, backend service, CLI, library/SDK, browser extension, desktop app, game, data or ML pipeline, multi-package workspace, and so on.
- If the repository already contains product code, treat it as the existing product: build on its structure and conventions instead of scaffolding a new one.
- Keep workflow and product apart: no product code, dependencies or build output in `.speccraft/`, `.agents/` or `.claude/`, and no workflow documents in the product tree. Do not modify `.agents/` or `.claude/` unless the user asks. `AGENTS.md` and `CLAUDE.md` in the repository root are shared agent instructions: keep their SpecCraft section (between the `speccraft:start` / `speccraft:end` markers) intact and add product-specific instructions only below it.
- An empty document counts as missing.

## Overview

For every pending task of the **active milestone** in `.speccraft/milestones/[Mnn]-[slug]/tasks.md`, create a dedicated folder inside the milestone's folder with a detailed implementation plan. The plan must be precise enough that the `10-execution-initial` skill can implement the task without making architectural or product decisions, and then verify it objectively.

## Required inputs

Read these files first and treat them as mandatory:

1. `.speccraft/milestones/[Mnn]-[slug]/tasks.md`
2. `.speccraft/milestones.md`
3. `.speccraft/progress.md` (if it exists)
4. `.speccraft/docs/02-General-PRD.md`
5. `.speccraft/docs/05-Tech-Stack.md`
6. `.speccraft/docs/04-Interface-spec.md`
7. `.speccraft/docs/03-Design.md`
8. `.speccraft/docs/01-Idea.md`

Also check if there are any files in the `.speccraft/mockup` directory, and look at the current state of the repository (existing source code, configs). Earlier milestones have produced real code that the plans must build on, and some tasks may already be partially implemented.

If `.speccraft/milestones/[Mnn]-[slug]/tasks.md` is missing, stop and tell the user to run `08-planning-tasks` first.

## Parsing .speccraft/milestones/[Mnn]-[slug]/tasks.md

The first line is the title `# Mnn - Milestone name`; every other non-empty line is a task:

```text
# M01 - Milestone name

[ ] 001 - Task name - Description in 3-4 sentences.
```

- `[ ]` — pending, `[~]` — waiting for review, `[x]` — reviewed and merged, `[!]` — blocked (set by `10-execution-initial`).
- The number is the first field after the status; the name is the second field; everything after the second ` - ` is the description.
- Skip blank lines.

## Which tasks to process

- Find the active milestone: the one marked `[>]` in `.speccraft/milestones.md`, and its folder `.speccraft/milestones/Mnn-*/`. If there is none, stop and tell the user to run `08-planning-tasks`.
- Process every task marked `[ ]` in that folder's `tasks.md`, in the order of the list. Never plan tasks of other milestones.
- Skip every task marked `[x]` or `[~]` — do not create or modify folders for done tasks or tasks in review.
- Skip every task marked `[!]` — its folder contains `blocker.md` and its partial work is on branch `task/[NNN]-[slug]`; the user resolves it and changes the status back to `[ ]`.
- If a folder for a pending task already exists with an `implementation-plan.md`, keep it unchanged unless the user asked to regenerate plans or the task name/description in `tasks.md` no longer matches the plan. In that case, overwrite the plan and mention it in the final summary.
- If the user asks for specific task numbers only, process only those.

## Folder and file naming

For each processed task create:

```text
.speccraft/milestones/[Mnn]-[slug]/[NNN]-[slug]/implementation-plan.md
```

- `[Mnn]-[slug]`: the existing milestone folder created by `08-planning-tasks`, e.g. `M01-clickable-prototype`. It holds `tasks.md` and, later, `milestone-report.md`.
- `[NNN]`: the three-digit task number from `tasks.md` (e.g. `007`).
- `[slug]`: the name in lowercase kebab-case ASCII, max ~6 words (e.g. `007-set-up-database-schema-and-migrations`). Transliterate non-ASCII characters (e.g. `ł` → `l`, `ż` → `z`).
- Exactly one folder per task number, always inside the folder of the milestone the task belongs to. Other skills find it by its prefix (`.speccraft/milestones/M*/NNN-*/`).

## Workflow per task

1. **Read the milestone.** Its type, scope, out of scope and exit criteria from `.speccraft/milestones.md` frame every plan. A prototype plan uses mock data through the data-access layer; a feature plan uses real data.
2. **Locate sources.** Find the exact PRD requirements, Interface-spec screens/flows, 03-Design.md components/tokens and 05-Tech-Stack.md decisions that this task implements.
3. **Account for context.** Consider what earlier tasks (lower numbers, including earlier milestones) deliver — this task builds on them. Check the actual code and `progress.md` rather than assuming. Do not re-plan work owned by an earlier task; do not pull in work owned by a later task.
4. **Design the change.** Decide the files, modules, data contracts, and UI components involved, consistent with the project structure in `05-Tech-Stack.md` and with code already present in the repository.
5. **Pick only the quality concerns this task needs.** Use the milestone type, the non-functional requirements in `02-General-PRD.md` and the tooling in `05-Tech-Stack.md`. For example: authorization and server-side validation for endpoints that change data, empty/loading/error states and keyboard access for UI, tests for logic. A prototype task needs no auth, logging or security criteria. Do not add ceremony the task does not need.
6. **Define acceptance criteria.** Concrete, checkable outcomes for this task's behavior, including the quality concerns picked in step 5.
7. **Define verification.** Exact commands and manual/automated checks proving the task is done.
8. **Write** `implementation-plan.md` using the structure below. Adapt section names and examples to the product type (e.g. for a CLI the "UI details" section describes commands, flags and output; for a library it describes the public API).

## Required structure for implementation-plan.md

```markdown
# Task [NNN]: [Task name]

## 1. Summary
- **Task:** [NNN] - [Task name] (copied from `.speccraft/milestones/[Mnn]-[slug]/tasks.md`)
- **Milestone:** [Mnn] - [Milestone name] (type: prototype | foundation | feature | release)
- **Type:** one or more of `setup`, `prototype`, `ui`, `api`, `data`, `auth`, `integration`, `job`, `infra`
- **Depends on:** task numbers this task requires (only lower numbers), or `none`
- **Parallel:** `safe` or `exclusive` — one-line reason (see "Parallel safety")
- **Sources:** exact references, e.g. `02-General-PRD.md FR-4, FR-5`, `04-Interface-spec.md §5 "Project Dashboard"`, `03-Design.md components.card`, `05-Tech-Stack.md §3 database`

## 2. Goal
2–4 sentences: what will exist after this task and why it matters for the product.

## 3. Scope
**In scope:** bullet list.
**Out of scope:** bullet list, naming the later task that owns each excluded item when applicable (e.g. "password reset — task 012").

## 4. Current state and prerequisites
What must already exist (from earlier tasks or the repository) before starting. Required env variables, services, or seed data.

## 5. Implementation steps
Numbered, ordered, concrete steps. Each step names files and what to do in them.
1. Create `src/server/db/schema.prisma` models `User`, `Organization` with fields ...
2. ...

## 6. Files
Every file the task creates or modifies, one per row, path in backticks (globs allowed, e.g. `src/features/projects/*`). Parallel runs use this list to keep overlapping tasks apart.

| Path | Action (create / modify) | Purpose |
|---|---|---|

## 7. Contracts and data (if applicable)
Data models, API routes / server actions (method, path, input, output, errors), events, env variables. Write `Not applicable` when the task has none.

## 8. UI details (if applicable)
Screens, components, states (empty / loading / error / success), responsive behavior and accessibility notes, referencing 04-Interface-spec.md and 03-Design.md tokens. Write `Not applicable` when the task has none.

## 9. Acceptance criteria
- [ ] TC-01: concrete, checkable outcome
- [ ] TC-02: ...

## 10. Tests to add or update
Unit / integration / e2e tests with what each one verifies.

## 11. Verification
Exact commands (install, lint, typecheck, test, build, migrations, dev server) and manual checks with expected results. Commands run from the repository root; state the working directory explicitly only when `05-Tech-Stack.md` or `progress.md` defines another one (e.g. a package of a multi-package workspace). File paths are repository-relative; workflow paths stay under `.speccraft/`.

## 12. Risks and notes
Pitfalls, decisions made while planning, assumptions, and anything the executor must not change.
```

## Parallel safety

`run-milestone.sh --parallel N` implements several tasks at the same time, each in its own git worktree. It only runs tasks together when their plans say `**Parallel:** safe`, their dependencies are merged and their §6 file lists do not overlap. Decide per task:

- **`safe`** only when all of these hold:
  - the files in §6 are specific to this task;
  - the task does not add or upgrade dependencies (manifests, lockfiles);
  - it does not change the database schema, migrations or seeds;
  - it does not change global configuration (build, lint, tsconfig, CI, env schema) or shared registries that many tasks touch (route tables, central exports, i18n catalogs);
  - its tests can run in isolation per `SPECCRAFT_SLOT` (see `10-execution-initial` → "Parallel worktree mode").
- **`exclusive`** for everything else, typically:
  - scaffolding, design tokens, the app shell;
  - infrastructure, CI, authentication foundations;
  - migrations and new dependencies;
  - cross-cutting refactors and release tasks.

When unsure, choose `exclusive`. A wrong `safe` costs merge conflicts and flaky tests; a wrong `exclusive` only costs time.

## Rules

- Write the plan in the same language as the `.speccraft/docs/` documents.
- Be prescriptive: name files, functions, components, routes, fields and commands. "Add a form" is not enough; "Add `ProjectForm` in `src/features/projects/ProjectForm.tsx` with fields `name` (required, 3–80 chars) and `description` (optional, max 500) using `Input` and `Button` primitives" is.
- Keep the plan consistent with `05-Tech-Stack.md`. Do not introduce new libraries unless the task cannot be implemented without one; if you must, list it in "Risks and notes" with a justification.
- Every task-specific acceptance criterion and every verification step must be checkable by an AI agent with access to the repository and a terminal.
- Do not modify `.speccraft/milestones/[Mnn]-[slug]/tasks.md` (no status changes, no rewording). If you find a problem in the task list (missing task, wrong order, task too large), report it in the final summary instead.
- Do not write application code in this skill.

## Git

When the project is a git repository, work on the active milestone's branch `milestone/[Mnn]-[slug]` (switch to it if needed; never write plans on the base branch). Commit the created or updated plans: `docs(Mnn): implementation plans`.

## Final summary

After processing, reply with:

- the active milestone and the list of created/updated folders
- skipped tasks (already done or already planned)
- any problems found in `.speccraft/milestones/[Mnn]-[slug]/tasks.md` (gaps, ordering issues, tasks that should be split) with a recommendation

## Quality bar

Before finishing, verify that:

- every pending task of the active milestone has exactly one folder `.speccraft/milestones/[Mnn]-[slug]/[NNN]-[slug]/` with `implementation-plan.md`
- no folder was created for a done task or a task of another milestone
- every plan follows the required structure with all 12 sections
- together, the plans of the milestone make every milestone exit criterion achievable
- every plan's dependencies point only to lower task numbers
- every plan has a `Parallel` decision, and §6 lists every file it touches
- scopes of neighboring tasks do not overlap and leave no gaps

See `references/implementation-plan-example.md` for an example plan.
