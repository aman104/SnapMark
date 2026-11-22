---
name: 00-next
description: single entry point of the SpecCraft workflow — reads the project state (.speccraft docs, milestones, tasks, git), shows a short status and runs the right next skill, or stops at an operator gate. three modes - one step, guided autopilot (chains steps, stops at every gate) and full autopilot (from a brief through idea, roast rounds, specs and planning to a built milestone, asking nothing). use when the user says next, continue, dalej, status, what now, autopilot, full auto, or starts working without naming a skill.
---

# Next step

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

The operator should not have to remember which skill comes next. This skill:

1. reads the state of the project,
2. shows a short status,
3. decides the next step,
4. runs it by following the target skill's `SKILL.md`, or stops at an operator gate.

It never duplicates the logic of other skills. It only routes to them.

## Modes

- **Single step (default):** run one step, then show the status again and propose the next step.
- **Guided autopilot:** used when the user says "autopilot", "run until review", "prowadź dalej" or similar. Chain steps one after another and stop at every operator gate (below). Show a one-line status between steps.
- **Full autopilot:** used when the user says "autopilot full", "full auto", "pełny autopilot", "zrób wszystko sam" or similar, usually together with the idea. Nothing is asked: the idea comes from the brief, the roast runs several rounds and applies its own fixes, every skill decides in place of the operator, and the run stops only at the hard gates. See "Full autopilot".
- **Status only:** used when the user asks only "status" or "where are we". Show the status and the proposed next step, and run nothing.

The operator can switch at any time: run any skill by hand, then continue with `00-next` in any mode. Every mode reads the state from the files, so it continues from wherever the project is.

## Full autopilot

Settings live in `.speccraft/autopilot.md`:

- **Brief:** the idea in the operator's words. When the user gives the idea with the command and the section is empty, write it there first, unchanged. If there is no brief and no `01-Idea.md`, stop and ask for the idea; that is the only question of the full autopilot.
- **Stop at:** `spec` (the specification and the roadmap are ready), `plan` (the next milestone has its tasks and plans, no code yet) or `milestone` (the next milestone is built and waits for review, the default). The user can override it in the command, e.g. "autopilot full until spec".
- **Roast rounds:** the maximum number of roast rounds before the PRD (default 3, `0` skips the roast).
- **Decisions to review:** every skill that decides something in place of the operator adds a line here. Show the count at every stop.

How the steps run:

- Follow each skill's "Autonomous mode" section where it has one (`01-discovery-idea` Mode 4, `02-discovery-idea-roast`). Where any skill says to ask or confirm with the operator, decide yourself: choose what best fits the brief and the documents, record it as an assumption in the document and as a line in "Decisions to review". The brief is a fixed requirement; never contradict it.
- **Roast rounds:** run `02-discovery-idea-roast` once per round. Start another round while the number of `## Round` sections in `.speccraft/docs/01-Idea-roast.md` is below "Roast rounds" and the last round says `**Next round needed:** yes`. Then run `03-discovery-prd`.
- **Spec review (rule 7)** is not a gate: continue unless "Stop at" is `spec`.
- **Commits:** after each step from 01 to 07, commit the changed `.speccraft/` files on the current branch: `docs(autopilot): <skill>`. Skills 08 and 09 commit by their own Git sections.
- **Build:** the milestone build is long. In an agent session, recommend continuing with the unattended script below, which gives every task a fresh context and an independent reviewer. Build in this session only when the user asked for it or the milestone is small, and stop when the context gets long.
- **Hard gates stay:** rule 1 (changes you did not make), rule 9 (milestone review: never accept on the operator's behalf), rule 13 (blocked tasks), a step that cannot complete, and "Stop at".

**Unattended run.** The same autopilot runs from the terminal with a fresh agent process per step, which suits long runs and overnight work:

```bash
.agents/skills/00-next/scripts/autopilot.sh "<the idea in a few sentences>"   # from the start
.agents/skills/00-next/scripts/autopilot.sh                                  # continue from the current state
.agents/skills/00-next/scripts/autopilot.sh --stop-at spec                   # only the specification
.agents/skills/00-next/scripts/autopilot.sh --accept M01 --parallel 3        # after your review: accept M01, build M02
.agents/skills/00-next/scripts/autopilot.sh --dry-run                        # status and the next step
```

It takes the same `--agent` options as `run-milestone.sh` (claude, codex, antigravity, gemini, custom) and hands the build over to it. Offer it whenever the user wants full autopilot for a long stretch. Details: `.speccraft/Readme.md` → "Autopilot".

## Step 1: Read the state

Run the state engine from the repository root:

```bash
node .agents/skills/00-next/scripts/state.mjs          # status and the next step
node .agents/skills/00-next/scripts/state.mjs --json   # the same as JSON, with every milestone and task
```

It reads the files below and applies the table in Step 3. `autopilot.sh` and SpecCraft Board use the same engine, so all three always agree. Take its "Next" line as the decision, then read whatever the step needs (e.g. `progress.md`, the milestone report at a gate). If Node.js is not available, check the same things yourself, without modifying anything, and apply the table:

- `.speccraft/docs/01-Idea.md` … `05-Tech-Stack.md`: which exist and are non-empty
- `.speccraft/milestones.md`: the roadmap table (phases), milestone headings and statuses, and the "What you will see" of the active milestone
- for the milestone that is `[>]` or `[?]`: its folder `.speccraft/milestones/Mnn-*/`, its `tasks.md` (counts of `[ ]`, `[~]`, `[x]`, `[!]`), which pending tasks lack `implementation-plan.md`, and whether `milestone-report.md` exists
- git, when the project is a repository: current branch, clean or dirty tree, `milestone/*` and `task/*` branches, and whether a milestone marked `[x]` still has an unmerged `milestone/*` branch
- `.speccraft/progress.md` → "Blocked" and "Open assumptions to review"
- `.speccraft/autopilot.md` → settings, whether "Brief" has text, the number of "Decisions to review"; `.speccraft/docs/01-Idea-roast.md` → number of rounds and the last "Next round needed"

## Step 2: Show the status

Show the engine's output, adding only what helps (e.g. the roadmap phases). Keep it short:

```text
SpecCraft status
Spec:       Idea ✓  PRD ✓  Design ✓  Interface ✓  Tech stack ✓
Roadmap:    1 Look & feel ✓  2 Prototype ✓  3 Foundations ▶  4 Core  5 Complete  6–7 Quality & release
Milestones: M01 [x]  M02 [x]  M03 [>]  M04 [ ]  M05 [ ]  M06 [ ]
Active:     M03 - Foundations — 3 done, 1 in review, 4 pending, 1 blocked (011)
            You will see: real sign-in, data saved, first screen on real data
Git:        milestone/M02-foundations, clean
Autopilot:  stop at milestone · roast 2/3 converged · 4 decisions to review
Next:       10-execution-tasks — review task 012, then continue with 013
```

Show the "Autopilot" line only when `.speccraft/autopilot.md` has a brief or decisions. Mention once per session that the same status, with every document, task board and the live run log, is available in the browser, where the operator can also press Next or start the autopilot: `npx speccraft board` (or `.speccraft/board`).

## Step 3: Decide the next step

The first rule that matches decides. The state engine implements exactly this table.

| # | State | Next step |
|---|---|---|
| 1 | Uncommitted product changes (outside `.speccraft/`, `.agents/`, `.claude/`, `AGENTS.md`, `CLAUDE.md`), or a merge in progress | **Gate:** show the files and ask the operator how to proceed |
| 2 | No `01-Idea.md` | **Gate:** `01-discovery-idea` needs the operator's idea. Ask for it, then run the skill. Full autopilot: with a brief, run `01-discovery-idea` Mode 4 instead |
| 3 | Idea exists, no PRD | `02-discovery-idea-roast` while rounds remain: fewer `## Round` sections in `01-Idea-roast.md` than "Roast rounds" in `autopilot.md` (default 3) and the last round did not say `**Next round needed:** no`. Then `03-discovery-prd`. The roast is optional: offer to skip it, and skip it when the operator says so or "Roast rounds" is `0` |
| 4 | PRD exists, no `03-Design.md` | `04-planning-design-system` |
| 5 | no `04-Interface-spec.md` | `05-planning-interface` |
| 6 | no `05-Tech-Stack.md` | `06-planning-tech-stack` |
| 7 | no milestones in `milestones.md` | `07-planning-milestones`, then **gate:** ask the operator to review the specification and milestones before any code is written. Full autopilot: no gate, unless "Stop at" is `spec` |
| 8 | A milestone is `[x]` but its `milestone/*` branch is unmerged | `08-planning-tasks` (merges it) |
| 9 | A milestone is `[?]` | **Gate (in every mode):** summarize its `milestone-report.md`: demo steps, exit criteria, assumptions, spec changes, and the "Decisions to review" of the autopilot. Ask the operator to accept or request changes, then run `08-planning-tasks` with the answer. After an acceptance, full autopilot continues with the next milestone |
| 10 | No milestone is `[>]` and one is `[ ]` | `08-planning-tasks` (plans the next milestone) |
| 11 | A milestone is `[>]` and a pending task has no `implementation-plan.md` | `09-planning-task-details` (a `[>]` milestone without `tasks.md` is a **gate**: run `08-planning-tasks` for it) |
| 12 | A milestone is `[>]` and some task is `[~]` or an eligible `[ ]` | `10-execution-tasks`. Offer the autonomous run for long milestones: `.agents/skills/10-execution-tasks/scripts/run-milestone.sh`, with `--parallel 3` when several pending tasks are `Parallel: safe` |
| 13 | A milestone is `[>]`, nothing is in review or eligible, and blocked tasks remain (pending tasks, if any, depend on them) | **Gate:** list each blocked task with "What is needed" from its `blocker.md`. After the operator resolves them, they change `[!]` to `[ ]` (or tell you to) |
| 14 | A milestone is `[>]`, and all its tasks are `[x]` | `10-execution-tasks` (milestone completion) |
| 15 | All milestones are `[x]` | Report that the planned product is complete. Suggest `11-security-researcher` (if no recent report) and `12-feature-advisor` for new features or bug fixes. It adds a new milestone, and the loop continues |

## Step 4: Run it

- Announce the step in one line: `Next: 09-planning-task-details for M02 (6 tasks)`.
- Write `.speccraft/.runs/activity.json` for the step, as `AGENTS.md` → "Show what you are doing on SpecCraft Board" describes, and delete it when the step ends. In autopilot, rewrite it for every step.
- Read the target skill's `SKILL.md` in `.agents/skills/` and follow it completely, including its own gates and its final summary.
- Then go back to Step 1. In single-step mode, stop after showing the new status. In autopilot, continue.

## Operator gates

In single-step mode and in guided autopilot, always stop and wait for the operator at:

- missing input only the operator can give (the idea, answers to discovery questions);
- the end of planning (rule 7), before the first line of code;
- milestone review (rule 9). **Never accept a milestone on the operator's behalf;**
- blocked tasks (rule 13);
- uncommitted or conflicting changes you did not make (rule 1);
- any material question raised by the skill being run.

Full autopilot keeps only the hard gates listed in "Full autopilot" and replaces the other questions by recorded decisions.

In both autopilots, also stop when the context is getting long, after a milestone completion, or when the operator interrupts. Long runs belong in `autopilot.sh` or `run-milestone.sh`, where every step gets a fresh context.

## Rules

- Do not edit statuses, documents or code yourself. Every change happens inside the skill you route to. The exceptions are the full autopilot's own records: the brief in `.speccraft/autopilot.md` and its commits of `.speccraft/`.
- Do not skip steps. Every document and plan must exist before the step that needs it.
- Never push and never merge into the base branch outside `08-planning-tasks`.
