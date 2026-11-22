---
name: 08-planning-tasks
description: define the ordered, numbered implementation tasks for the next milestone from .speccraft/milestones.md, create the milestone folder .speccraft/milestones/[Mnn]-[slug]/ with its tasks.md, then mark the milestone as active. also handles the milestone gate - recording the operator's acceptance of a reviewed milestone, or adding rework tasks when the operator requests changes. use after 07-planning-milestones, and again after each milestone has been reviewed. this skill only plans tasks, it does not write application code.
---

# Planning Tasks

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

Plan the tasks of **one milestone at a time**. Read the milestone definition from `.speccraft/milestones.md`, break its scope into an ordered list of tasks, create the milestone folder `.speccraft/milestones/[Mnn]-[slug]/` and write the tasks to its `tasks.md`. The order of tasks is the order in which the `10-execution-tasks` skill will execute them.

Planning one milestone at a time means every milestone is planned against the real codebase and the operator's feedback from the previous milestone, not against assumptions made weeks earlier.

Downstream skills:

- `09-planning-task-details` creates a detailed implementation plan for every pending task of the active milestone
- `10-execution-tasks` executes the tasks of the active milestone and hands the milestone over for review

## Required inputs

1. `.speccraft/milestones.md` (mandatory)
2. `.speccraft/docs/02-General-PRD.md`, `.speccraft/docs/04-Interface-spec.md`, `.speccraft/docs/03-Design.md`, `.speccraft/docs/05-Tech-Stack.md`, `.speccraft/docs/01-Idea.md` (mandatory)
3. `tasks.md` of earlier milestones (for the highest task number and what was built) and `.speccraft/progress.md`, if they exist
4. `milestone-report.md` of the previous milestone, including the operator's feedback, if it exists
5. the current codebase, for every milestone after the first. Tasks must build on what actually exists.
6. the `.speccraft/mockup` directory, if it contains files

If `.speccraft/milestones.md` is missing, stop and tell the user to run `07-planning-milestones` first.

## Step 1: Determine what to do (milestone gate)

Read the milestone statuses in `.speccraft/milestones.md` (`[ ]` planned, `[>]` active, `[?]` awaiting review, `[x]` accepted) and act on the first matching case:

1. **A milestone is `[?]` (awaiting review).** The operator decides:
   - **Accepted:** the operator explicitly accepted it in this conversation (e.g. "accept M01", "akceptuję M01"), or the prompt states that the operator started the autopilot with `--accept M01`. Change its status to `[x]`, fill in "Operator decision" in its `milestone-report.md` (accepted, date), apply its "Spec changes" to `.speccraft/docs/` (see "Spec sync"), merge the milestone into the base branch (see "Git"), then continue with case 3.
   - **Changes requested:** the operator asks for changes in this conversation, or wrote feedback in the "Operator decision" section of `milestone-report.md`. Go to "Rework tasks" below.
   - **No decision:** ask the operator to review the milestone using its `milestone-report.md`, and stop. Never accept a milestone on the operator's behalf.
2. **A milestone is `[>]` (active).**
   - If the operator asks for additional or corrected work in it, go to "Rework tasks".
   - Otherwise report that the milestone is still in progress (pending, in review, done and blocked task counts) and stop. Do not plan another milestone while one is active.
3. **No milestone is active or awaiting review.** Take the first `[ ]` milestone. All earlier milestones must be `[x]`. Plan its tasks (Step 2). If there is no `[ ]` milestone left, report that all milestones are accepted.

Only one milestone may be `[>]` or `[?]` at any time.

## Step 2: Plan the tasks of the milestone

1. **Read the milestone:** goal, type, scope, out of scope, demo and exit criteria.
2. **Read the current state:** codebase, `progress.md`, previous milestone reports and the operator's feedback. Re-read the `.speccraft/docs/` sections the milestone references. The operator may have updated them after the previous review.
3. **Break the scope into tasks** (sizing rules below). Cover every scope item and make every exit criterion achievable by the tasks.
4. **Order the tasks** so that every task only depends on tasks before it (in this or earlier milestones).
5. **Create the milestone folder and its task list.** Create `.speccraft/milestones/[Mnn]-[slug]/` and write `tasks.md` in it (see "Milestone folder" and "Output format of tasks.md" below). Continue the global numbering after the highest task number in the `tasks.md` files of earlier milestones.
6. **Activate the milestone:** change its status in `.speccraft/milestones.md` from `[ ]` to `[>]`, and set its phase in the roadmap table to `in progress`.
7. **Commit** on the new milestone branch (see "Git"): `docs(Mnn): plan tasks`.

## Rework tasks

When the operator requests changes to a milestone that is `[?]` or `[>]`:

1. Translate each piece of feedback into concrete tasks (same format and rules).
2. Append them at the end of that milestone's `tasks.md`, continuing the global numbering.
3. If the milestone was `[?]`, set it back to `[>]`. Record the requested changes in "Operator decision" in its `milestone-report.md`.
4. If the feedback changes the product direction (design, flows, scope), recommend updating `.speccraft/docs/` and re-running `07-planning-milestones` for the remaining `[ ]` milestones.
5. Commit on the milestone branch: `docs(Mnn): add rework tasks`.

## Git

Applies when the project is a git repository with at least one commit. Without git, skip these steps and suggest `git init` to the operator, because autonomous runs require git. Branch model (details in `10-execution-tasks` → "Git workflow"):

- the base branch (`main`, or the one recorded in `progress.md` → "Git") holds accepted milestones only;
- `milestone/[Mnn]-[slug]` (same name as the milestone folder) holds one milestone;
- `task/[NNN]-[slug]` branches are created and merged by `10-execution-tasks`.

**Accepting a milestone** (gate case 1):

```bash
git switch milestone/[Mnn]-[slug]
# set [x] in .speccraft/milestones.md; in the roadmap table set the phase to "done" when all its milestones are [x]
# fill in "Operator decision" in milestone-report.md
# apply "Spec changes" from milestone-report.md to .speccraft/docs/ (see "Spec sync")
git add -A .speccraft && git commit -m "chore(Mnn): accepted, spec updated"
git switch [base]
git merge --no-ff milestone/[Mnn]-[slug] -m "merge(Mnn): <milestone name>"
git branch -d milestone/[Mnn]-[slug]
```

If the operator set `[x]` by hand and a `milestone/[Mnn]-[slug]` branch of an accepted milestone still exists unmerged, run the merge steps for it before planning anything else.

If the merge conflicts (e.g. someone committed to the base branch in the meantime), run `git merge --abort`, explain the conflicting files to the operator and stop. Never resolve conflicts in product code without the operator. Never push: publishing the base branch is the operator's decision.

**Spec sync.** The milestone report has a "Spec changes" table, collected by `10-execution-tasks` from the task reports and decisions. When the operator accepts:

- Apply every row to `.speccraft/docs/`, except rows the operator rejected or changed in "Feedback". Edit only the named section and keep the document's structure.
- Add a change-log entry where the document has one (e.g. `01-Idea.md`).
- If a row would change the product direction (scope, flows, stack), ask the operator before applying it. Also recommend re-running `07-planning-milestones` for the remaining `[ ]` milestones.
- Report what was updated in the final summary.

The next milestone is then planned against a specification that matches the code.

**Planning the next milestone** (Step 2): start on the up-to-date base branch.

- Uncommitted changes limited to `.speccraft/`, `AGENTS.md` or `CLAUDE.md` (e.g. the planning documents from skills 01–07) are committed there first as `docs: update product specification`.
- Any other uncommitted change: stop and ask the operator.
- Then run `git switch -c milestone/[Mnn]-[slug]`, create the milestone folder, activate the milestone and commit.

**Rework** happens on the existing milestone branch.


## Task sizing rules

- One task = one coherent unit of work that an AI agent can implement and verify in a single focused session.
- Every task leaves the project in a working state (it builds, starts and existing tests pass).
- Every task is verifiable on its own.
- Prefer vertical slices (data + API + UI + states for one capability) over horizontal layers once the foundations exist.
- Merge tasks that are too small to verify separately; split tasks that touch more than one major flow or subsystem.
- Typical milestone: 5–15 tasks. If the milestone needs clearly more, tell the user it should be split with `07-planning-milestones`.

## Ordering within a milestone

Use the phases that apply to the milestone type, adapted to the product type (a CLI, library, game or pipeline has its own natural order):

- **prototype**, phase "Look & feel" (steps 1–2 plus a style guide page showing every component in every state), then phase "Clickable prototype" (steps 3–9). When the phases are merged, use all steps:
  1. scaffold of the frontend from `05-Tech-Stack.md`
  2. design tokens and UI primitives
  3. app shell and navigation
  4. mock data layer with fixtures
  5. screens grouped by user flow
  6. overlays
  7. demonstrable states (empty, loading, error)
  8. responsive pass
  9. demo instructions in `README.md`
- **foundation:**
  1. infrastructure and configuration
  2. logging and error tracking
  3. data layer and migrations
  4. authentication
  5. access control
  6. switching the first screens from mock to real data
  7. CI
  8. optional, when the operator wants parallel runs: isolation of tests and dev servers per `SPECCRAFT_SLOT` (ports, test database), recorded in `progress.md` → "Parallel isolation"
- **feature:**
  1. data model changes
  2. vertical slices in order of the user journey
  3. integrations and async work
  4. remaining states and edge cases
- **release:**
  1. security review fixes
  2. performance
  3. accessibility pass
  4. analytics
  5. end-to-end tests
  6. deployment configuration
  7. final README
- **fix:**
  1. a regression test that reproduces the bug and fails
  2. the smallest fix that makes it pass
  3. related edge cases named in the milestone

Tests, security and observability are part of the task where the code is written, not separate tasks at the end.

## Milestone folder

- Path: `.speccraft/milestones/[Mnn]-[slug]/`, e.g. `.speccraft/milestones/M01-clickable-prototype/`.
  - `[Mnn]`: the milestone id from `.speccraft/milestones.md`.
  - `[slug]`: the milestone name in lowercase kebab-case ASCII, max ~6 words. Transliterate non-ASCII characters (e.g. `ł` → `l`, `ż` → `z`).
- Create the folder only for the milestone being planned. Later milestones get their folder when they are planned, so re-running `07-planning-milestones` never leaves stale folders behind.
- Exactly one folder per milestone id. Other skills and scripts find it by its prefix (`.speccraft/milestones/Mnn-*/`).
- Contents once the milestone has been executed:

```text
.speccraft/milestones/M01-clickable-prototype/
├── tasks.md                          task list with statuses (this skill)
├── 001-scaffold-nextjs-project/      one folder per task
│   ├── implementation-plan.md        09-planning-task-details
│   ├── report.md                     10-execution-tasks, implementer
│   ├── review.md                     10-execution-tasks, independent reviewer
│   └── blocker.md                    10-execution-tasks, when blocked
├── 002-implement-design-tokens/
├── ...
├── milestone-report.md               10-execution-tasks, at milestone completion
└── run-summary-[run-id].md           run-milestone.sh, after an autonomous run
```

## Output format of tasks.md

The file contains a title line and task lines only:

```text
# M02 - Foundations, authentication and access control

[ ] 009 - Task name - Description in 3-4 sentences.

[ ] 010 - Task name - Description in 3-4 sentences.
```

- **Title:** `# Mnn - Name`, the same id and name as in `.speccraft/milestones.md`, without the status.
- **Task line:** `[status] NNN - Task name - Description`.
  - `[ ]` pending, `[~]` waiting for independent review, `[x]` reviewed and merged, `[!]` blocked (all set by `10-execution-tasks`). This skill always writes `[ ]`.
  - `NNN`: three digits, zero-padded, starting from `001`. Numbering is **global across milestones** and has no gaps: if M01 ended with task 008, M02 starts with 009. Global numbers keep task ids, folder names, commit messages (`feat(task-NNN)`) and dependencies between milestones unambiguous.
  - `Task name`: short imperative name, max ~8 words, without ` - ` inside.
  - `Description`: 3–4 sentences on one line. Say what to build, which documents/sections it implements (e.g. `PRD FR-3`, `Interface-spec "Project Dashboard"`), what the result is, and how to recognize it as done.
- Separate fields with ` - `. Separate consecutive lines with exactly one blank line.
- No other content: no intro or notes. Every non-empty line after the title is a task.
- Never modify the `tasks.md` of other milestones. In the active or reviewed milestone, only append rework tasks at the end.
- Write task names and descriptions in the same language as the `.speccraft/docs/` documents.

## Example

`.speccraft/milestones/M01-clickable-prototype/tasks.md`:

```text
# M01 - Clickable prototype

[ ] 001 - Scaffold Next.js project with tooling - Initialize a Next.js + TypeScript project in the repository root using pnpm, as defined in 05-Tech-Stack.md section 3. Configure ESLint, Prettier, path aliases and a Vitest test runner with one passing smoke test. Add the folder structure from 05-Tech-Stack.md section 8. The task is done when install, lint, test and build commands all succeed.

[ ] 002 - Implement design tokens and UI primitives - Translate colors, typography, spacing and radii from 03-Design.md into CSS variables and Tailwind theme, and build Button, Input, Card, Modal, Badge and Skeleton with all documented variants. Components use only design tokens and are keyboard accessible. The task is done when a dev-only token and component preview page renders every variant matching 03-Design.md.
```

See `references/task-list-example.md` for a longer example.

## Final summary

Reply with:

- what happened at the gate: accepted / rework / planned
- where the roadmap stands: the current phase and how many phases are done
- the milestone that is now active, and its number of tasks
- the specification documents updated from "Spec changes" (if accepted)
- the git state: merged milestone (if accepted) and the current milestone branch
- the next step: run `09-planning-task-details`, then `10-execution-tasks` or the autonomous run script

## Quality bar

Before finishing, verify that:

- at most one milestone is `[>]` or `[?]`, and all milestones before it are `[x]`
- every scope item of the milestone is covered by a task, and every exit criterion is achievable
- no task covers scope from a later milestone or from the future scope of the PRD
- no task depends on a later task
- the milestone folder exists with `tasks.md`; numbering continues globally without gaps, and every line matches the format exactly

## Anti-patterns

Do not:

- plan tasks for more than one milestone at a time
- accept a milestone without the operator's explicit decision
- write vague tasks like "Build the backend", "Polish UI", "Test everything"
- add tasks for technologies that are not in `05-Tech-Stack.md`
- write application code in this skill
