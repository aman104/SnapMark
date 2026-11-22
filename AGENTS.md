# Agent instructions

<!-- speccraft:start — SpecCraft workflow section. Keep it; add project-specific instructions below the end marker. -->

## SpecCraft workflow

This repository is built with the SpecCraft skills, a spec-driven workflow that goes idea → PRD → design → interface → tech stack → milestones → tasks → code.

- **Skills:** `.agents/skills/<NN-name>/SKILL.md`. Codex and Antigravity read them natively. Claude Code reads them through the `.claude/skills` symlink. When a request matches a skill, follow its `SKILL.md`.
- **Workflow workspace:** `.speccraft/`. The guide is `.speccraft/Readme.md`.
  - `docs/`: `01-Idea.md` (with its roast `01-Idea-roast.md`), `02-General-PRD.md`, `03-Design.md`, `04-Interface-spec.md`, `05-Tech-Stack.md`, security reports, feature plans
  - `mockup/`: visual references supplied by the user
  - `milestones.md`: the milestone plan; milestone statuses live only here
  - `milestones/Mnn-slug/`: `tasks.md` (task statuses live only here), one `NNN-slug/` folder per task with `implementation-plan.md` and `report.md`, plus `milestone-report.md`
  - `progress.md`: project memory with commands, structure, conventions and decisions
  - `autopilot.md`: autopilot settings (`Stop at`, `Roast rounds`), the user's brief, and the decisions the autopilot made in the user's place
  - `viewer/`: SpecCraft Board, the local dashboard and control panel (`.speccraft/board`). It is tooling: never modify it as part of product work
- **Product code** lives in the repository root, laid out as defined in `.speccraft/docs/05-Tech-Stack.md`.

### Rules

- Never put product code, dependencies or build output in `.speccraft/`, `.agents/` or `.claude/`. Never put workflow documents in the product tree.
- Do not modify `.agents/` or `.claude/` unless the user asks.
- Before changing code, read `.speccraft/progress.md` and the relevant `.speccraft/docs/` documents. They describe the product, its stack and its conventions.
- Change task and milestone statuses only as the skills describe.
  - Task: `[ ]` pending → `[~]` waiting for independent review → `[x]` approved and merged, or `[!]` blocked.
  - Milestone: `[ ]` → `[>]` → `[?]` → `[x]`. Only the user accepts a milestone (`[x]`).
- Do not know what to do next? Follow `00-next`.
- **Show what you are doing on SpecCraft Board.** In an interactive session, when you start a SpecCraft step, write `.speccraft/.runs/activity.json` (git-ignored; create the folder if needed):
  `{"skill": "03-discovery-prd", "action": "write", "task": "007", "milestone": "M03", "title": "Writing the requirements (PRD)", "started": "2026-11-21T10:00:00Z"}`.
  `action` is one of `write`, `plan`, `implement`, `review`, `complete`; leave out `task` and `milestone` when they do not apply. Rewrite the file when you move to another task. Delete it when the step is finished or blocked, not when you only ask the user a question. Scripts report their own progress: skip this in `AUTONOMOUS MODE`.
- A prompt that starts with `AUTONOMOUS MODE` comes from a SpecCraft script (`autopilot.sh`, `run-milestone.sh`): nobody can answer questions. Follow its rules and the skill's "Autonomous mode" section.
- Never push, deploy or publish unless the user asks.

### Git

- The base branch (`main`) holds accepted milestones only.
- `milestone/Mnn-slug` is the integration branch of the active milestone.
- Every task is done on `task/NNN-slug`, created from the milestone branch. The task branch is merged back with `--no-ff` only after a reviewer with a fresh context approves it.
- Only `08-planning-tasks` merges a milestone into `main`, and only after the user accepts it.
- In parallel runs (`run-milestone.sh --parallel N`), workers stay in their own worktree and task branch, never edit `.speccraft/` workflow files, and use the resources of their `SPECCRAFT_SLOT`.
- Never push, force-push, rewrite merged history or delete unmerged branches.
- Details: `.agents/skills/10-execution-tasks/SKILL.md` → "Git workflow".

### Skills

| Step | Skill | Purpose |
|---|---|---|
| 00 | `00-next` | status and the next step; guided autopilot until a gate; full autopilot from a brief to a built milestone (`scripts/autopilot.sh` runs it unattended) |
| 01 | `01-discovery-idea` | shape the idea → `docs/01-Idea.md` |
| 02 | `02-discovery-idea-roast` | stress-test the idea |
| 03 | `03-discovery-prd` | requirements → `docs/02-General-PRD.md` |
| 04 | `04-planning-design-system` | design system → `docs/03-Design.md` |
| 05 | `05-planning-interface` | interface spec → `docs/04-Interface-spec.md` |
| 06 | `06-planning-tech-stack` | stack and structure → `docs/05-Tech-Stack.md` |
| 07 | `07-planning-milestones` | milestone plan → `milestones.md` |
| 08 | `08-planning-tasks` | milestone gate, tasks of the next milestone |
| 09 | `09-planning-task-details` | implementation plan per task |
| 10 | `10-execution-tasks` | implement tasks, independent review, merge; milestone report with spec changes |
| 11 | `11-security-researcher` | security review and fixes |
| 12 | `12-feature-advisor` | feature or bug fix → spec update + new milestone |

How to invoke a skill:

- **Claude Code:** `/00-next`, `/01-discovery-idea`, …
- **Codex:** `$00-next`, or pick it from `/skills`
- **Antigravity:** `/00-next`

<!-- speccraft:end -->

## Project-specific instructions

<!-- Add instructions for this product here: build and test commands, conventions, gotchas. -->
