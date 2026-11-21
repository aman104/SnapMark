---
name: 10-execution-initial
description: build the active milestone task by task from its .speccraft/milestones/[Mnn]-[slug]/tasks.md — implement each task on its own git branch following its implementation plan and .speccraft/progress.md, verify it, hand it to an independent fresh-context review ([~]) that merges it into the milestone branch ([x]) or sends it back, mark blockers ([!]), then verify exit criteria and write a milestone report with spec changes for the operator ([?]). interactive or autonomous (scripts/run-milestone.sh). use after 09-planning-task-details.
---

# Execution Initial

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

Build the product incrementally, one milestone at a time. Within the **active milestone** (`[>]` in `.speccraft/milestones.md`), execute the tasks listed in its folder's `tasks.md` (`.speccraft/milestones/[Mnn]-[slug]/tasks.md`) in order. Every task goes through the same cycle:

**orient → select → pre-check → implement → verify → hand over → independent review → merge → next**

A task is merged only after a reviewer with a fresh context has approved it (see "7. Independent review").

When every task of the milestone is done, run the **milestone completion**: verify the exit criteria, write `milestone-report.md`, and set the milestone to `[?]` (awaiting review). Then stop. The operator reviews the milestone and either accepts it or requests changes through `08-planning-tasks`. Autonomy never crosses a milestone boundary.

All state lives in files (`.speccraft/milestones.md`, the milestone's `tasks.md`, `.speccraft/progress.md`, reports, git history), so every task can be executed from a fresh context, and the run can be stopped and resumed at any point.

## Modes

### Interactive mode (default)

Used when the user runs the skill in a conversation. Execute pending tasks of the active milestone one after another in the same session. When a task becomes blocked, mark it `[!]`, report it and stop so the user can decide. At the end of the milestone, present the milestone report and stop. Branches and commits follow "Git workflow" unless the user asks to work without git.

### Autonomous mode

Used when the prompt says `AUTONOMOUS MODE` (this is what `scripts/run-milestone.sh` sends), or when the user explicitly asks for an unattended run. Nobody is watching, so:

- **Never ask the user anything and never wait for input.** Resolve ambiguity with the least risky option consistent with the documents, and record it as an assumption (see "Recording").
- **Do not stop the milestone because of one task.** A task that cannot be completed is marked `[!]`, its partial work is parked on its task branch, and execution continues with the next eligible task of the same milestone.
- **Follow "Git workflow" strictly:** one branch per task, merged into the milestone branch after verification.
- **Execute exactly one step per invocation** when the prompt says so. The run script does this, so every step starts with a fresh context. A step is one of: implementing a task (up to `[~]`), reviewing a task, or the milestone completion. Otherwise loop until the milestone is completed or blocked.
- **Never go beyond the active milestone,** and never set a milestone to `[x]`. Only the operator accepts milestones.
- **Take no outward actions** (see "Environment rules").

## Statuses

### Milestones in .speccraft/milestones.md

Headings `## [status] Mnn - Name`:

| Status | Meaning | Set by |
|---|---|---|
| `[ ]` | planned | `07-planning-milestones` |
| `[>]` | active: tasks defined, execution in progress | `08-planning-tasks` |
| `[?]` | all tasks done, waiting for the operator's review | this skill |
| `[x]` | accepted by the operator | operator / `08-planning-tasks` |

### Tasks in .speccraft/milestones/[Mnn]-[slug]/tasks.md

Every milestone folder has its own `tasks.md`: a title line `# Mnn - Name`, then one line per task. Task numbers are global across milestones.

```text
# M01 - Clickable prototype

[ ] 001 - Task name - Description in 3-4 sentences.
```

| Status | Meaning |
|---|---|
| `[ ]` | pending (or sent back by the reviewer; findings in `review.md`) |
| `[~]` | implemented and verified by the implementer, waiting for independent review |
| `[x]` | reviewed, approved and merged into the milestone branch |
| `[!]` | blocked; details in `blocker.md` in the task folder |

The task folder is `.speccraft/milestones/[Mnn]-[slug]/[NNN]-[slug]/` (find it with `.speccraft/milestones/M*/NNN-*/`).

To unblock a task, the user resolves the problem described in `blocker.md` and changes `[!]` back to `[ ]`. Never change `[!]` to `[ ]` yourself.

## Git workflow

Applies in both modes whenever the project is a git repository with at least one commit. Without git, skip every git step (autonomous runs require git).

| Branch | Created by | Contains | Merged into |
|---|---|---|---|
| base (`main`) | — | accepted milestones only | — |
| `milestone/[Mnn]-[slug]` | `08-planning-tasks`, from base | task list, plans, every finished task, milestone report | base, by `08-planning-tasks` after the operator accepts |
| `task/[NNN]-[slug]` | this skill, from the milestone branch | the work on one task | the milestone branch, by this skill after verification |

- **Base branch:** the one recorded in `progress.md` → "Git"; otherwise `main`, else `master`. Record it there.
- **Milestone branch:** same name as the milestone folder, e.g. `milestone/M02-foundations`. If it does not exist (e.g. tasks were planned without git), create it from the current `HEAD`.
- Task slug = the task folder name, e.g. `task/011-implement-authentication`.
- **Where things are committed:**
  - on the task branch: product code, tests, the task's `report.md` and plan adjustments;
  - on the milestone branch: workflow state, i.e. statuses in `tasks.md`, `progress.md`, `review.md` and `blocker.md`.

  This keeps merges free of conflicts and lets the run script see progress.

**Per task:**

1. **Start** (after step 2 "Select"): be on the milestone branch with a clean tree, then `git switch -c task/[NNN]-[slug]`.
   - If a branch `task/[NNN]-*` already exists, it is an earlier attempt that was interrupted or blocked. Switch to it and run `git merge milestone/[Mnn]-[slug]` to bring it up to date. Review its diff against the milestone branch.
   - If the earlier work is usable, continue from it. If it is not, rename it (`git branch -m <branch> attic/task-[NNN]-<YYYYMMDD-HHMM>`) and start a fresh branch.
2. **Work** on the task branch. Intermediate commits are fine (`wip(task-NNN): ...`).
3. **Hand over for review** (verification passed):
   ```bash
   git add -A && git commit -m "feat(task-NNN): <task name>"     # on the task branch: code, tests, report.md
   git switch milestone/[Mnn]-[slug]
   # set [ ] → [~] in tasks.md
   git add -A .speccraft && git commit -m "chore(task-NNN): ready for review"
   ```
   Keep the task branch.
4. **Approved by the reviewer:** merge it, with the status change inside the merge commit, then delete the branch:
   ```bash
   git switch milestone/[Mnn]-[slug]
   git merge --no-ff --no-commit task/[NNN]-[slug]
   # set [~] → [x], write review.md, update progress.md
   git add -A .speccraft && git commit -m "merge(task-NNN): <task name>"
   git branch -d task/[NNN]-[slug]
   ```
   No conflicts are expected, because tasks run one at a time. If the merge does conflict, run `git merge --abort` and send the task back with the conflict as a finding.
5. **Changes requested by the reviewer:** on the milestone branch, write `review.md`, set `[~]` → `[ ]` and commit `chore(task-NNN): changes requested (round N)`. Keep the task branch: the implementer resumes it (step 1).
6. **Blocked:** park the partial work on the task branch, then record the blocker on the milestone branch. This way later tasks build only on verified code:
   ```bash
   git add -A && git commit -m "wip(task-NNN): partial work, blocked"   # on the task branch
   git switch milestone/[Mnn]-[slug]
   # write blocker.md, set [!], update progress.md (step 6b), then:
   git add -A .speccraft && git commit -m "chore(task-NNN): mark as blocked"
   ```
   Keep the task branch. It is resumed when the operator sets the task back to `[ ]`.

**Milestone completion** runs on the milestone branch and ends with a commit. This skill never merges into the base branch: the operator's acceptance does that through `08-planning-tasks`.

**Never:**
- push or force-push;
- rewrite history (rebase, amend or reset of commits that are already merged);
- commit to the base branch during a milestone;
- delete an unmerged branch (rename it to `attic/...` instead).

## Task execution cycle

### 1. Orient (fresh context)

Assume you know nothing from previous work. Read, in this order:

1. `.speccraft/milestones.md`: find the active milestone (`[>]`) and read its type, scope and exit criteria
2. `.speccraft/milestones/[Mnn]-[slug]/tasks.md` of the active milestone: statuses of its tasks
3. `.speccraft/progress.md`: project memory with commands, structure, conventions, decisions and log. If it does not exist yet, you will create it when recording.
4. the selected task's `implementation-plan.md`
5. `report.md` of the tasks listed in the plan's "Depends on", especially "Notes for next tasks"
6. the `.speccraft/docs/` sections listed in the plan's "Sources". Read whole documents only when the referenced sections are not enough. Check `.speccraft/mockup/` for UI tasks.

Run `git status` and `git branch --show-current`. You must be on the milestone branch with a clean tree (see "Git workflow"). If the working tree contains leftovers from an interrupted attempt, do not build on them blindly. In autonomous mode the run script stashes them and returns to the milestone branch before each iteration. In interactive mode, report them to the user.

If `.speccraft/milestones.md` or `.speccraft/milestones/[Mnn]-[slug]/tasks.md` is missing, stop and name the planning skill to run first.

### 2. Select

- **A task is `[~]`:** review it first ("7. Independent review"). Do not start a new task while one waits for review.

- **No active milestone:**
  - if a milestone is `[?]`, it awaits the operator's review,
  - otherwise the next milestone has not been planned yet.
  
  Autonomous mode: write the reason to `.speccraft/.runs/STOP` and end. Interactive mode: tell the user to review the milestone or run `08-planning-tasks`.
- **Next task:** otherwise, the first `[ ]` task **of the active milestone** whose dependencies are all `[x]` (dependencies = "Depends on" in its plan). Tasks whose dependencies are `[ ]` or `[!]` are skipped and stay `[ ]`.
- **All tasks of the active milestone are `[x]`:** go to "Milestone completion".
- **No eligible task and nothing in review, but some are `[ ]` or `[!]`:** the milestone is blocked. Autonomous mode: write `Milestone Mnn blocked: tasks NNN, ...` to `.speccraft/.runs/STOP` and end. Interactive mode: report the blocked tasks.

Also:

- Never work on two tasks at the same time.
- Never execute tasks of another milestone.
- Do not re-execute `[x]` tasks unless the user explicitly asks.
- If the user limits the run ("only the next task", "up to task 012"), respect the limit.

Announce the task briefly: `Mnn / Task NNN - Task name`, then create or resume its task branch (see "Git workflow"). If the task folder contains `review.md` with "changes requested", this is a fix round: fix every blocking finding first, and list them under "Review fixes" in `report.md`.

### 3. Pre-check (verify the task before implementing)

- **Plan exists.** If the task has no folder or plan, create `.speccraft/milestones/[Mnn]-[slug]/[NNN]-[slug]/implementation-plan.md` first, following the structure and rules of the `09-planning-task-details` skill.
- **Plan matches the task and the milestone.** Goal and scope match the task line in `tasks.md` and stay within the milestone's scope.
- **Plan matches the codebase.** Files, modules and contracts the plan relies on exist as expected (compare with `progress.md` → "Project state").
- **Hidden dependencies.** If the task needs something owned by a task that is not `[x]`, add that task to "Depends on" in the plan, leave this task `[ ]`, and go back to step 2.
- **Plan covers the essentials.** The plan's acceptance criteria and steps cover what the task obviously needs, in proportion to the milestone type. Examples: authorization and server-side validation for endpoints that change data, UI states, tests for logic. Do not add ceremony the task does not need.

Resolve discrepancies:

- **Minor** (renamed file, different folder, a missing essential criterion, an obsolete package): adjust, and append an entry to section 12 of the plan under the heading `Execution adjustments`.
- **Material** (the plan contradicts the PRD, the Tech Stack or the milestone scope, or the task needs a product decision):
  - Interactive mode: block the task and ask the user.
  - Autonomous mode: choose the least risky option consistent with the PRD and the milestone scope, continue, and record it as an assumption. Block only when no defensible option exists.

### 4. Implement

- Follow the implementation steps of the plan in order.
- Stay within the task scope and the milestone scope. Do not implement items owned by later tasks or milestones. Tiny implied steps required to make the task work are fine.
- Write the quality concerns the task needs together with the feature, not afterwards: authorization, validation, logging, error handling, tests.
- Respect `05-Tech-Stack.md`: do not substitute frameworks, databases, styling approaches or package managers.
- Follow the conventions recorded in `progress.md`. Reuse existing helpers instead of creating parallel ones.
- For UI work, implement `03-Design.md` and `04-Interface-spec.md` precisely: tokens, components, states and responsive behavior. No lorem ipsum, no starter leftovers, no TODOs in delivered user flows.
- **Prototype milestones:**
  - screens read data only through the data-access layer with mock fixtures, never inline in components;
  - no real backend, authentication or external calls;
  - keep the code production-quality, because later milestones build on it.
- Add or update the tests listed in the plan. Keep `.env.example` updated for every new environment variable.

### 5. Verify (after implementing)

Run the checks for real; never assume they pass.

1. **Definition of done:**
   - the project checks pass: lint, typecheck, tests and build as defined in `05-Tech-Stack.md` / `progress.md`, plus migrations / e2e when the plan says so;
   - no secrets are committed;
   - `.env.example` covers every new variable.
2. **Acceptance criteria:** every `TC-xx` from section 9 of the plan, using the verification steps in section 11.
3. **No regressions:** tests from earlier tasks and milestones still pass.

If something fails, fix it and verify again, **up to 3 fix-and-verify rounds**. If it still fails, the task is blocked (step 6b).

### 6a. Record: hand over for review

Only after verification fully passes:

1. Write `report.md` in the task folder (see "Task report").
2. Commit on the task branch (`feat(task-NNN): <task name>`; use `fix`/`chore`/`test`/`docs` when it fits better).
3. On the milestone branch, change this task's status in `tasks.md` from `[ ]` to `[~]` (change nothing else) and commit. See "Git workflow" step 3.
4. Autonomous one-step mode: end the step here; the review runs as the next step in a new process. Interactive mode: continue with "7. Independent review".

### 6b. Record: task blocked

A task is blocked when it cannot be completed. That means one of:

- verification still fails after 3 rounds,
- the task requires something that cannot be provided locally and cannot be mocked,
- a material conflict has no defensible resolution.

Problems with the **environment** are not task blockers. Examples: a missing runtime or tool, Docker or the database not running, no network, a full disk, an invalid agent session. In that case do not mark the task. Write the reason to `.speccraft/.runs/STOP` (autonomous mode) or report it (interactive mode) and end, because every following task would fail the same way.

For a blocked task:

1. Park the partial work on the task branch and switch back to the milestone branch (see "Git workflow"). Steps 2–5 happen on the milestone branch.
2. Write `blocker.md` in the task folder:
   ```markdown
   # Task [NNN] blocked: [Task name]

   ## Reason
   What exactly fails or is missing.

   ## What was tried
   Fix attempts and their results (commands and key error output).

   ## What is needed
   Concrete action required from the user (e.g. "provide STRIPE_SECRET_KEY test key in .env", "decide whether X or Y").

   ## Impact
   Tasks of this milestone that depend on this one and will be skipped.

   ## How to resume
   Resolve the above, change `[!]` to `[ ]` in .speccraft/milestones/[Mnn]-[slug]/tasks.md. The partial work is on branch `task/[NNN]-[slug]`; the next run resumes from it.
   ```
3. Change the status in `.speccraft/milestones/[Mnn]-[slug]/tasks.md` from `[ ]` (or `[~]` after a third rejection) to `[!]`.
4. Add the task to `progress.md` → "Log" and "Blocked".
5. Commit on the milestone branch: `git add -A .speccraft && git commit -m "chore(task-NNN): mark as blocked"`.

### 7. Independent review

Every implemented task (`[~]`) is reviewed before it is merged. The reviewer judges only the result, not the intentions behind it.

**Who reviews:**
- **Autonomous one-step mode:** the review is its own step, so the run script starts it in a new agent process with a fresh context.
- **Interactive mode:** if your tool can start a sub-agent with its own context (e.g. the Agent/Task tool in Claude Code), give the review to it, with only the inputs below. Otherwise do the review yourself as a separate pass based only on those inputs, not on what you remember from implementing.

**Inputs:**
- the task line;
- `implementation-plan.md`;
- `report.md`;
- earlier rounds in `review.md`;
- `progress.md` → conventions;
- the diff: `git diff milestone/[Mnn]-[slug]...task/[NNN]-[slug]`.

**Update first.** Switch to the task branch and run `git merge milestone/[Mnn]-[slug]`. In parallel runs, other tasks may have been merged since this branch was created, and the checks must run on the combined code. If the merge conflicts:
- run `git merge --abort`;
- set the task back to `[ ]` with the finding "conflicts with work merged since: merge the milestone branch into the task branch and resolve";
- this does not count as a rejection.

**Checks** (on the updated task branch; return to the milestone branch afterwards):
1. **Run the definition of done yourself:** lint, typecheck, tests and build. Do not trust the report.
2. **Acceptance criteria:** every `TC-xx` is met, with evidence in the code or the tests.
3. **Scope:** no changes outside the plan and the milestone scope, and no unrelated edits. No debug leftovers, commented-out code or TODOs in delivered flows.
4. **Tests:** they assert the behavior from the plan, including the unhappy paths. They are not trivially passing, skipped or weakened.
5. **Essentials the task needs:** e.g. validation, authorization, error handling, UI states. No secrets in the code.
6. **Consistency:** follows `05-Tech-Stack.md` and the conventions in `progress.md`. Nothing product-related in `.speccraft/`, `.agents/` or `.claude/`.

**Verdict:**
- **approved:** possibly with non-blocking notes. Merge as described in "Git workflow" step 4.
- **changes requested:** only blocking findings. Each one is concrete (file and line, the problem, the expected fix). Style preferences are never blocking. Follow "Git workflow" step 5.
- **Third time "changes requested"** for the same task: mark it blocked (6b), with `blocker.md` pointing to `review.md`.

The reviewer never edits product code. It only judges, records and merges. The update merge is the only commit it makes on a task branch.

`review.md` in the task folder. Append one section per round:

```markdown
## Round [N] — [approved | changes requested] — YYYY-MM-DD

**Checks run:** `<commands>` — result

| # | Severity | Where | Problem | Expected fix |
|---|---|---|---|---|
| 1 | blocking | `src/x.ts:42` | ... | ... |

**Notes (non-blocking):** ...
```

### 8. Next

In autonomous one-step mode, end with a 1–2 line result: `Task NNN ready for review`, `Task NNN approved and merged`, `Task NNN: changes requested` or `Task NNN blocked: reason`. Otherwise report the result briefly and go back to step 1.

## Milestone completion

Runs when every task of the active milestone is `[x]`. It counts as one step.

1. **Verify the exit criteria** from `.speccraft/milestones.md` one by one, with real evidence: run the commands, start the app and walk through the demo, run the full test suite.
2. **Fix small gaps** within the milestone's scope (up to 3 fix-and-verify rounds), recording them as `Milestone completion fixes` in the report. Do not start larger work. Report any exit criterion that is still not met as `NOT MET` in the report; the operator decides.
3. **Collect spec changes.** Go through the task reports ("Spec impact", "Deviations from the plan", "Assumptions"), the review notes and `progress.md` → "Decisions and deviations". For everything that makes a document in `.speccraft/docs/` inaccurate (a screen works differently, a field was added, a library was swapped, a requirement was dropped), write one concrete row in "Spec changes" of the report. Do not edit the documents now: they are updated when the operator accepts the milestone.
4. **Capture what is visible.** Compare the result with the milestone's "What you will see" in `.speccraft/milestones.md`. For products with a UI, take screenshots of the key screens when a headless browser is available in the stack (e.g. Playwright). Save them to `.speccraft/milestones/[Mnn]-[slug]/screenshots/` with names like `01-dashboard.png`. Skip this without blocking when no browser tool is available.
5. **Write** `.speccraft/milestones/[Mnn]-[slug]/milestone-report.md` (see "Milestone report").
6. **Set the milestone status** in `.speccraft/milestones.md` from `[>]` to `[?]`, and its phase in the roadmap table to `in review`. Change nothing else.
7. **Update** `progress.md` → "Milestones" and "Log".
8. **Commit** on the milestone branch: `git add -A && git commit -m "chore(Mnn): ready for review"`. Do not merge it into the base branch.
9. **Stop.**
   - Autonomous mode: write `Milestone Mnn ready for review: .speccraft/milestones/[Mnn]-[slug]/milestone-report.md` to `.speccraft/.runs/STOP`.
   - Interactive mode: present the demo steps and exit criteria results. Tell the operator to accept the milestone or request changes with `08-planning-tasks`.

## Task report

`report.md` in the task folder, short and factual:

```markdown
# Task [NNN] report: [Task name]

## Changes
- key files created or modified

## Verification
- commands run and their result (e.g. `pnpm test` — 42 passed)
- TC-01 … TC-xx: met

## Deviations from the plan
- none / list of `Execution adjustments`

## Spec impact
- none / document and section in `.speccraft/docs/` that no longer matches what was built, and how

## Review fixes
- only in fix rounds: each blocking finding from `review.md` and how it was fixed

## Assumptions
- none / decisions made without the user that should be reviewed (with the chosen option and the alternative)

## Notes for next tasks
- anything later tasks must know (new helpers, conventions, known limitations)
```

## Milestone report

`.speccraft/milestones/[Mnn]-[slug]/milestone-report.md` is written for the operator. Use plain language and make it actionable:

```markdown
# Milestone [Mnn] report: [Milestone name]

## Summary
What was delivered, in 3–5 sentences.

## What you can see now
**Phase:** [n — phase name], milestone [k] of [m] in this phase.
Before → after, in plain language, matching "What you will see" from `milestones.md`. Say honestly where the result differs from it. List screenshots, if any: `screenshots/01-dashboard.png` — what it shows.

## How to review
Exact demo steps: setup commands, URLs, demo accounts, what to click or call, what to look at.

Code: branch `milestone/[Mnn]-[slug]`.
- `git log --oneline --first-parent milestone/[Mnn]-[slug]` lists one merge per task.
- `git diff [base]...milestone/[Mnn]-[slug]` shows the whole change.

## Exit criteria
| Criterion | Status | Evidence |
|---|---|---|
| ... | MET / NOT MET | command output, screen, test name |

## Tasks
| Task | Status | Note |
|---|---|---|
| 001 - ... | done | |

## Assumptions to review
Collected from the task reports of this milestone.

## Known limitations and deviations
Including `Milestone completion fixes`.

## Spec changes
Changes the specification needs so that it matches what was built and decided. `08-planning-tasks` applies them to `.speccraft/docs/` when you accept the milestone. Strike out or comment on any row you disagree with in "Feedback".

| Document | Section | Change | Reason |
|---|---|---|---|
| `04-Interface-spec.md` | §5 "Projects" | list is sorted by last update, not by name | task 010, decision in progress.md |

(or "none")

## Recommendations for next milestones
E.g. suggested updates to `03-Design.md` / `04-Interface-spec.md` after the prototype, risks found, scope worth reconsidering.

## Operator decision
- [ ] Accept: tell `08-planning-tasks` "accept Mnn". It merges `milestone/[Mnn]-[slug]` into the base branch and plans the next milestone
- [ ] Request changes: describe them below and run `08-planning-tasks`

### Feedback
(for the operator)
```

## Project memory: .speccraft/progress.md

`progress.md` is the compact memory that lets every task start from a fresh context. Create it after the first task and update it after every task and milestone completion.

Keep it short:

- "Project state" is rewritten to stay current, max ~80 lines.
- Log entries are appended and never exceed 2 lines.

```markdown
# Progress: [product name]

## Project state
- **Commands:** install, dev, lint, typecheck, test, e2e, build, db migrate/seed — exact commands, with the working directory when it is not the repository root
- **Structure:** key directories and what lives where
- **Key modules and helpers:** e.g. `authorize()` in `src/server/auth/authorize.ts`, data-access layer in `src/data/` (mock / real per entity)
- **Conventions:** naming, error handling, validation, testing patterns established so far
- **Environment:** required services (and how to start them), env variables, mocked integrations
- **Parallel isolation:** how a task in slot `SPECCRAFT_SLOT` gets its own ports, test database or other resources (e.g. dev port `3000 + SLOT*10`, database `app_test_$SPECCRAFT_SLOT`). Write `not set up` until a foundation task provides it
- **Git:** base branch (e.g. `main`), active milestone branch

## Milestones
- [Mnn] status, one line: what it delivered / what is in progress

## Decisions and deviations
- [NNN] decision or deviation from the docs/plan and why

## Open assumptions to review
- [NNN] assumption made without the user (chosen option / alternative)

## Blocked
- [NNN] short reason — see `<task folder>/blocker.md`

## Log
- [NNN] [x] YYYY-MM-DD — one-line summary of what was delivered
- [NNN] [!] YYYY-MM-DD — one-line reason
- [Mnn] [?] YYYY-MM-DD — ready for review
```

Remove an entry from "Blocked" when the task is later completed.

## Parallel worktree mode

Used when the prompt says `PARALLEL WORKTREE MODE`, which `run-milestone.sh --parallel N` sends.

- **Workers:** several implementers work at the same time, each in its own git worktree on its own task branch.
- **Main worktree:** reviews, merges, `exclusive` tasks and the milestone completion stay serial there, in normal autonomous mode.
- **The run script** is the only one that records worker results on the milestone branch.

As a worker:

1. **Stay in your worktree and on your task branch.**
   - The working directory is the worktree, already on `task/[NNN]-[slug]`.
   - Never switch branches and never merge into the milestone branch.
   - If the branch existed before (a fix round or a resumed task), first run `git merge milestone/[Mnn]-[slug]`, as in "Git workflow" step 1.
2. **Workflow files are read-only:** `.speccraft/milestones.md`, the milestone's `tasks.md` and `.speccraft/progress.md`. The script restores them if they change. Put everything later tasks need into `report.md` → "Notes for next tasks"; the reviewer carries it into `progress.md`.
3. **Prepare the worktree.**
   - Dependencies are not shared between worktrees: run the install command from `progress.md`.
   - Local `.env` files are copied in by the script.
4. **Isolate.** Use the resources of your slot (`SPECCRAFT_SLOT`, 1…N) as described in `progress.md` → "Parallel isolation": ports, test database, temp directories.
   - Never run migrations or seeds against a shared database.
   - Never stop or reset services that other agents may be using.
   - If the task cannot run isolated, it must run alone. Mark it blocked, with "What is needed: run this task alone (set `Parallel: exclusive` in its plan, then change `[!]` to `[ ]`)".
5. **Run the normal cycle:** pre-check, implement, verify (steps 3–5).
6. **Finish by committing on the task branch and writing one word to `.speccraft/.runs/RESULT` in the worktree:**
   - **done:** verification passed; code, tests and `report.md` are committed;
   - **blocked:** partial work and `blocker.md` (6b format) are committed.
   - On an environment problem (6b), write the reason to `.speccraft/.runs/STOP` in the worktree instead.

The script then removes the worktree (the branch stays) and records the result on the milestone branch: `[~]` for done, `[!]` and `blocker.md` for blocked. A task's review starts only after this.

## Environment rules

These apply in both modes and are critical for unattended runs.

- **Non-interactive commands only.** Use flags such as `--yes`, `-y`, `--no-interactive`, `--default`, and set `CI=true` where tools may prompt. Never run a command that waits for keyboard input.
- **No watch modes.** Run tests once (e.g. `vitest run`, `jest --watchAll=false`).
- **Background processes.**
  - Start dev servers and similar long-running processes in the background and record their PID.
  - Check that the port is free before starting.
  - Wait for readiness with a bounded timeout.
  - Stop them after verification and never leave orphan processes.
- **Bounded waits.** Use timeouts on commands that may hang (`curl --max-time`, test timeouts).
- **External services without credentials.**
  - Use mocks, local emulators or official test modes.
  - Document the variables in `.env.example` and record an assumption.
  - Do not block a task only because a real third-party key is missing, unless the task is explicitly about the real integration.
- **Stay inside the project.** Do not modify files outside the project directory. Prefer project-local dependencies over global installs.
- **No outward actions.**
  - Never `git push`, deploy to real environments, publish packages, send emails or messages to real recipients, or call paid production APIs.
  - Deployment tasks prepare configuration and documentation only.
- **Dependencies.** Do not upgrade unrelated packages or regenerate lockfiles without a reason.

## README

`README.md` in the repository root is the product's README. It is created by the first milestone (or extended, if the repository already has one) and kept current by the tasks that change setup or commands. Use `references/readme-template.md`, make it specific to the actual project, and ensure every command in it works. In a prototype milestone the README documents the demo. The release milestone finalizes it.

## Rules

- Task statuses live only in `.speccraft/milestones/[Mnn]-[slug]/tasks.md`, milestone statuses only in `.speccraft/milestones.md`. Change only:
  - the task you implemented: `[ ]` → `[~]` after passing verification, or `[ ]` → `[!]` when blocked,
  - the task you reviewed: `[~]` → `[x]` (approved and merged), `[~]` → `[ ]` (changes requested) or `[~]` → `[!]` (third rejection),
  - the active milestone: `[>]` → `[?]` after milestone completion.
- Never set a milestone to `[x]`, never activate a milestone, never execute tasks outside the active milestone, never merge into the base branch.
- Do not modify task names, descriptions, numbering or milestone definitions. If the plan of the milestone itself is wrong:
  - autonomous mode: record it in `progress.md` → "Decisions and deviations" and in the milestone report,
  - interactive mode: tell the user.
- Do not change the plan's acceptance criteria or the milestone exit criteria to make something pass.
- Do not weaken or delete tests to make verification pass.
- Build the product directly in the repository root, laid out as defined in `05-Tech-Stack.md` (including the prototype and any multi-package workspace). Do not wrap it in an extra product-name or `app/` directory unless `05-Tech-Stack.md` says so.
- The repository root is not empty, so scaffold carefully: use the scaffolding tool's option for the current directory, or scaffold into a temporary directory outside the repository and move the files in. Never overwrite or delete `.agents/`, `.claude/` or `.speccraft/`; merge into an existing `.gitignore`, `README.md`, `AGENTS.md` or `CLAUDE.md` instead of replacing it (scaffolders such as create-next-app may generate their own `AGENTS.md`/`CLAUDE.md`; append their content below the SpecCraft section). Check and preserve existing product code before scaffolding.
- Never write product code, dependencies or build output into `.speccraft/`; workflow files (plans, reports, progress, run logs) stay there.
- If an older plan uses paths of a previous layout (e.g. an `app/` prefix, `_docs/` or `tasks/` at the root, or `.speccraft/tasks/`), map them to the current layout and record it in `Execution adjustments`; do not silently move existing code or change product scope.

## Reference files

- per-task execution checklist: `references/build-checklist.md`
- README structure: `references/readme-template.md`
- unattended runs (setup, permissions, isolation, review): `references/autonomous-run.md`
- run script: `scripts/run-milestone.sh`
