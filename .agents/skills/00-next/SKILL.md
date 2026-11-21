---
name: 00-next
description: single entry point of the SpecCraft workflow — reads the project state (.speccraft docs, milestones, tasks, git), shows a short status and runs the right next skill, or stops at an operator gate (idea input, spec review, milestone acceptance, blockers). supports autopilot that chains steps until the next gate. use when the user says next, continue, dalej, status, what now, autopilot, or starts working without naming a skill.
---

# Next step

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

The operator should not have to remember which skill comes next. This skill:

1. reads the state of the project,
2. shows a short status,
3. decides the next step,
4. runs it by following the target skill's `SKILL.md`, or stops at an operator gate.

It never duplicates the logic of other skills. It only routes to them.

## Modes

- **Single step (default):** run one step, then show the status again and propose the next step.
- **Autopilot:** used when the user says "autopilot", "run until review", "prowadź dalej" or similar. Chain steps one after another and stop only at an operator gate (below). Show a one-line status between steps.
- **Status only:** used when the user asks only "status" or "where are we". Show the status and the proposed next step, and run nothing.

## Step 1: Read the state

Check, without modifying anything:

- `.speccraft/docs/01-Idea.md` … `05-Tech-Stack.md`: which exist and are non-empty
- `.speccraft/milestones.md`: the roadmap table (phases), milestone headings and statuses, and the "What you will see" of the active milestone
- for the milestone that is `[>]` or `[?]`: its folder `.speccraft/milestones/Mnn-*/`, its `tasks.md` (counts of `[ ]`, `[~]`, `[x]`, `[!]`), which pending tasks lack `implementation-plan.md`, and whether `milestone-report.md` exists
- git, when the project is a repository: current branch, clean or dirty tree, `milestone/*` and `task/*` branches, and whether a milestone marked `[x]` still has an unmerged `milestone/*` branch
- `.speccraft/progress.md` → "Blocked" and "Open assumptions to review"

## Step 2: Show the status

Keep it short:

```text
SpecCraft status
Spec:       Idea ✓  PRD ✓  Design ✓  Interface ✓  Tech stack ✓
Roadmap:    1 Look & feel ✓  2 Prototype ✓  3 Foundations ▶  4 Core  5 Complete  6–7 Quality & release
Milestones: M01 [x]  M02 [x]  M03 [>]  M04 [ ]  M05 [ ]  M06 [ ]
Active:     M03 - Foundations — 3 done, 1 in review, 4 pending, 1 blocked (011)
            You will see: real sign-in, data saved, first screen on real data
Git:        milestone/M02-foundations, clean
Next:       10-execution-initial — review task 012, then continue with 013
```

Mention once per session that the same status, with every document, task board and the live run log, is available in the browser: `node .speccraft/viewer/server.mjs --open`.

## Step 3: Decide the next step

Use the first rule that matches:

| # | State | Next step |
|---|---|---|
| 1 | Uncommitted product changes (outside `.speccraft/`, `.agents/`, `.claude/`, `AGENTS.md`, `CLAUDE.md`), or a merge in progress | **Gate:** show the files and ask the operator how to proceed |
| 2 | No `01-Idea.md` | **Gate:** `01-discovery-idea` needs the operator's idea. Ask for it, then run the skill |
| 3 | Idea exists, no PRD | Offer `02-discovery-idea-roast` (optional, recommended once) or go straight to `03-discovery-prd`; in autopilot run `03-discovery-prd` |
| 4 | PRD exists, no `03-Design.md` | `04-planning-design-system` |
| 5 | no `04-Interface-spec.md` | `05-planning-interface` |
| 6 | no `05-Tech-Stack.md` | `06-planning-tech-stack` |
| 7 | no `milestones.md` | `07-planning-milestones`, then **gate:** ask the operator to review the specification and milestones before any code is written |
| 8 | A milestone is `[x]` but its `milestone/*` branch is unmerged | `08-planning-tasks` (merges it) |
| 9 | A milestone is `[?]` | **Gate:** summarize its `milestone-report.md`: demo steps, exit criteria, assumptions, spec changes. Ask the operator to accept or request changes, then run `08-planning-tasks` with the answer |
| 10 | No milestone is `[>]` and one is `[ ]` | `08-planning-tasks` (plans the next milestone) |
| 11 | A milestone is `[>]` and a pending task has no `implementation-plan.md` | `09-planning-task-details` |
| 12 | A milestone is `[>]` and some task is `[~]` or an eligible `[ ]` | `10-execution-initial`. Offer the autonomous run for long milestones: `.agents/skills/10-execution-initial/scripts/run-milestone.sh`, with `--parallel 3` when several pending tasks are `Parallel: safe` |
| 13 | A milestone is `[>]`, nothing is eligible, and blocked tasks remain | **Gate:** list each blocked task with "What is needed" from its `blocker.md`. After the operator resolves them, they change `[!]` to `[ ]` (or tell you to) |
| 14 | A milestone is `[>]`, and all its tasks are `[x]` | `10-execution-initial` (milestone completion) |
| 15 | All milestones are `[x]` | Report that the planned product is complete. Suggest `11-security-researcher` (if no recent report) and `12-feature-advisor` for new features or bug fixes. It adds a new milestone, and the loop continues |

## Step 4: Run it

- Announce the step in one line: `Next: 09-planning-task-details for M02 (6 tasks)`.
- Read the target skill's `SKILL.md` in `.agents/skills/` and follow it completely, including its own gates and its final summary.
- Then go back to Step 1. In single-step mode, stop after showing the new status. In autopilot, continue.

## Operator gates

Always stop and wait for the operator at:

- missing input only the operator can give (the idea, answers to discovery questions);
- the end of planning (rule 7), before the first line of code;
- milestone review (rule 9). **Never accept a milestone on the operator's behalf;**
- blocked tasks (rule 13);
- uncommitted or conflicting changes you did not make (rule 1);
- any material question raised by the skill being run.

In autopilot, also stop when the context is getting long, after a milestone completion, or when the operator interrupts. Long execution runs belong in `run-milestone.sh`, where every task gets a fresh context.

## Rules

- Do not edit statuses, documents or code yourself. Every change happens inside the skill you route to.
- Do not skip steps. Every document and plan must exist before the step that needs it.
- Never push and never merge into the base branch outside `08-planning-tasks`.
