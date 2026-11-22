# task execution checklist

Use this checklist silently for every step.

## parallel worktree mode (prompt says PARALLEL WORKTREE MODE)

- stay in the worktree on the given task branch; never switch or merge into the milestone branch
- workflow files read-only; notes for later tasks go into `report.md`
- install dependencies first; use the resources of `SPECCRAFT_SLOT` from `progress.md` → "Parallel isolation"
- finish: commit, then write `done` or `blocked` to `.speccraft/.runs/RESULT`

## orient

- read `.speccraft/milestones.md` → active milestone `[>]`: type, scope, exit criteria
- read `.speccraft/milestones/[Mnn]-[slug]/tasks.md`, `.speccraft/progress.md`
- `git status`: clean tree, on the milestone branch `milestone/[Mnn]-[slug]`?

## select

- no active milestone → `.speccraft/.runs/STOP` (autonomous) or report (interactive)
- a task is `[~]` → review it first (see "review" below)
- next task = first `[ ]` task of the active milestone whose "Depends on" tasks are all `[x]`; `review.md` with changes requested → fix those findings first
- all tasks of the milestone `[x]` → milestone completion
- nothing eligible but `[ ]`/`[!]` left → milestone blocked → STOP / report
- create `task/[NNN]-[slug]` from the milestone branch, or resume an existing `task/[NNN]-*` after merging the milestone branch into it

## pre-check

- open `.speccraft/milestones/[Mnn]-[slug]/[NNN]-[slug]/implementation-plan.md` (create it if missing)
- read `report.md` of dependencies and the `.speccraft/docs/` sections from "Sources"
- plan goal and scope match the task line and stay within the milestone scope
- files and contracts the plan relies on exist (compare with `progress.md`); product paths follow the project structure, workflow stays in `.speccraft/`
- hidden dependency on an unfinished task → add to "Depends on", select another task
- plan covers the essentials the task needs (e.g. auth/validation for data-changing endpoints, UI states, tests), in proportion to the milestone type
- minor discrepancy → `Execution adjustments`; material → ask (interactive) or least risky option + assumption (autonomous)

## implement

- follow the plan steps in order, stay within task and milestone scope
- reuse helpers and conventions from `progress.md`
- prototype: data only through the mock data-access layer, no backend or external calls
- authorization, validation, logging and error handling written together with the feature (non-prototype)
- tests from the plan added or updated
- design tokens and components from `03-Design.md`, states from `04-Interface-spec.md`
- `.env.example` updated for new variables
- non-interactive commands, no watch mode, background processes stopped

## verify

- lint, typecheck, tests, build (and migrations / e2e when relevant) actually run and pass
- nothing product-related was written to `.speccraft/`, `.agents/` or `.claude/`; scaffolding did not overwrite them or replace `.gitignore`, `AGENTS.md` or `CLAUDE.md`
- every `TC-xx` in the plan met
- no secrets committed
- no regressions in earlier tasks and milestones
- max 3 fix-and-verify rounds, then blocked

## record — hand over

- `report.md` (assumptions, spec impact, review fixes, notes for next tasks), commit `feat(task-NNN): <name>` on the task branch
- on the milestone branch: `[ ]` → `[~]`, commit `chore(task-NNN): ready for review`; keep the task branch
- autonomous one-step: end the step; interactive: review in a fresh sub-agent or a separate pass

## review (fresh context, inputs: task line, plan, report, review.md, diff `milestone...task`)

- run lint, typecheck, tests, build on the task branch yourself
- every `TC-xx` met with evidence; scope respected; tests meaningful (incl. unhappy paths); essentials present; no secrets; conventions followed
- approved → `merge --no-ff --no-commit`, `[~]` → `[x]`, `review.md`, `progress.md`, commit `merge(task-NNN)`, delete task branch
- changes requested → `review.md` with concrete blocking findings, `[~]` → `[ ]`, commit; 3rd rejection → blocked
- never edit product code as reviewer; never push

## record — blocked

- environment problem? → STOP, do not mark the task
- commit partial work `wip(task-NNN)` on the task branch, keep the branch, switch to the milestone branch
- on the milestone branch: `blocker.md`, `[ ]` → `[!]`, update `progress.md`, commit `chore(task-NNN): mark as blocked`

## milestone completion

- verify every exit criterion with real evidence (demo walkthrough, full test suite)
- small gaps within scope: fix (max 3 rounds); otherwise mark `NOT MET`
- collect spec changes (task "Spec impact", deviations, decisions) into the report; do not edit `.speccraft/docs/`
- write `milestone-report.md` with demo steps, exit criteria table, assumptions, spec changes, recommendations
- milestone `[>]` → `[?]`, update `progress.md`, commit `chore(Mnn): ready for review` on the milestone branch
- STOP: never start the next milestone, never set `[x]`, never merge into the base branch
