# SpecCraft — Product Starter

SpecCraft is a set of agent skills that takes a product from a rough idea to working, reviewed code. Each skill does one step: it reads the documents from the previous steps and writes the next one. You stay in control at every milestone.

- **Works for any kind of product:** web or mobile app, API or backend service, CLI, library/SDK, browser extension, desktop app, game, data or ML pipeline, multi-package workspace.
- **Starts in an empty repository or an existing one.** With an existing codebase, the skills build on its structure and conventions instead of scaffolding from scratch.
- **Works out of the box in Claude Code, Codex and Antigravity:** the skills are plain Markdown in `.agents/skills/`, and the repository already contains the wiring each tool needs (see [Agent support](#agent-support)). Any other agent that can read files and run commands can follow them too.

---

## Quick start

> **See everything in the browser:** `npx speccraft board` (or `.speccraft/board`) starts **SpecCraft Board** and opens it, from any folder of the project. It shows the roadmap, the active milestone with its task board, the next step, every document rendered, review findings, blockers, the progress log, git activity and the live log of autonomous runs. It is also the control panel: pick the agent CLI and model, write your idea, then press **Next** for one step at a time or start the **full autopilot**. See [SpecCraft Board](#speccraft-board).

### New product

1. Create a folder and install SpecCraft in it (Node.js 18+ and git needed):

   ```bash
   mkdir my-product && cd my-product
   npx speccraft@latest
   ```

   It creates `.speccraft/`, the skills, `AGENTS.md` and `CLAUDE.md`, initialises git and makes the first commit.

   From a local clone of SpecCraft instead of npm: run `npm link` once in the clone, then `speccraft` in the project folder (and `speccraft board`, `speccraft autopilot`, …). After `git pull` in the clone, `speccraft` updates the project.
2. Optional: put mockups, screenshots or sketches into `.speccraft/mockup/`.
3. Open the board with `npx speccraft board`, write your idea, choose the agent and press **Next**, or start the full autopilot.
4. Or work from your agent or the terminal. Every option reads the state from the files, so you can switch between them at any time:

   | You want to | Run |
   |---|---|
   | click through it | SpecCraft Board (`npx speccraft board`): **Next**, or **Start autopilot** |
   | run each step yourself | the skills one by one: `/01-discovery-idea`, `/02-discovery-idea-roast`, … |
   | be told the next step and run it | `/00-next` (or just say "next" / "dalej") |
   | chain steps, stopping whenever you are needed | `/00-next autopilot` |
   | hand over everything, from the idea to a built first milestone | `npx speccraft autopilot "<your idea>"`, or `/00-next autopilot full <your idea>` in a session |

   See [Autopilot](#autopilot).

### Existing product

1. From the root of your repository, run the installer:

   ```bash
   npx speccraft@latest --dry-run   # see what would change
   npx speccraft@latest             # install
   ```

   It installs four things:
   - **skills:** copied into `.agents/skills/`; your other skills there are kept;
   - **Claude Code wiring:** `.claude/skills` is linked to them. If you already have a `.claude/skills` folder, each SpecCraft skill is linked inside it;
   - **workspace:** the `.speccraft/` skeleton, including the board;
   - **agent instructions and git:** the SpecCraft section goes into `AGENTS.md` and `CLAUDE.md`, after your title, with your content kept, and `.speccraft/.runs/` is added to `.gitignore`.

   Run `npx speccraft@latest` again at any time to update the toolkit, also from a subfolder of the project. It replaces only SpecCraft's own files and sections, removes skills a newer version no longer has, and never touches your documents, milestones, progress, autopilot brief or your own skills. Then commit the result.

   Without npm, from a clone of the SpecCraft repository: `bash /path/to/product-starter/.speccraft/install.sh` does the same.
2. **To add a feature or fix a bug**, run `/12-feature-advisor` and describe it. It analyzes your code, updates the specification after your approval and adds a milestone, which then runs through the normal loop: tasks, build, independent review, your acceptance.
3. **To plan a larger change**, run the pipeline from `/01-discovery-idea` (or from `/03-discovery-prd` with a written brief). The planning skills read your code and extend the current stack rather than replacing it.

---

## Repository layout

```text
./                         the product: source, tests, manifests, config, README.md, .env.example, CI
├── .agents/skills/        the skills (instructions, templates, scripts)
├── .claude/skills         symlink to .agents/skills for Claude Code
├── AGENTS.md              shared agent instructions (Codex, Antigravity; imported by CLAUDE.md)
├── CLAUDE.md              Claude Code entry point: imports AGENTS.md
└── .speccraft/            the workflow workspace
    ├── Readme.md          this guide
    ├── docs/              product documents (idea, PRD, design, interface, tech stack, reports)
    ├── mockup/            your visual references, read by every skill
    ├── milestones.md      the milestone plan with statuses
    ├── milestones/        one folder per planned milestone (see below)
    ├── progress.md        project memory shared by all tasks
    ├── autopilot.md       autopilot settings, your brief, decisions to review
    ├── viewer/            SpecCraft Board: local dashboard of everything below
    ├── board              starts SpecCraft Board: one command
    ├── VERSION            installed SpecCraft version (manifest.json: its skills)
    └── .runs/             logs of autonomous runs (git-ignored)
```

Each milestone gets its own folder when its tasks are planned. The folder holds the milestone's task list, one subfolder per task and the milestone report:

```text
.speccraft/milestones/
├── M01-clickable-prototype/
│   ├── tasks.md                       task list with statuses
│   ├── 001-scaffold-nextjs-project/
│   │   ├── implementation-plan.md     how to build it (09)
│   │   ├── report.md                  what was built (10, implementer)
│   │   └── review.md                  independent review verdicts (10, reviewer)
│   ├── 002-implement-design-tokens/
│   ├── ...
│   └── milestone-report.md            what to review (10)
└── M02-foundations/
    ├── tasks.md
    └── ...
```

Task numbers are global (`001`, `002`, … continuing across milestones), so every task has a unique id for folders, commits and dependencies.

Two rules keep the repository clean:

- **Workflow and product never mix.** Product code, dependencies and build output never go into `.speccraft/`, `.agents/` or `.claude/`. Workflow documents never go into the product tree.
- **The product owns the repository root.** Its layout follows the stack chosen in `.speccraft/docs/05-Tech-Stack.md`, e.g. `src/` + `package.json`, `pyproject.toml`, or `apps/` + `packages/` for a monorepo. There is no extra wrapper directory.

---

## Pipeline

```text
ENTRY POINT      00 next — shows the status and runs the right step; autopilot (guided or full)

DISCOVERY        01 idea ──► 02 roast (one or more rounds) ──► 03 PRD
                                            │
PLANNING         04 design ──► 05 interface ──► 06 tech stack ──► 07 milestones ──► ⏸ you review the spec
                                                                                         │
MILESTONE LOOP   ┌──► 08 tasks ──► 09 task details ──► 10 build ⇄ independent review ──► ⏸ you review
                 └──────── accept (spec synced, merged to main) / request changes ◄────────┘

AFTER v1         12 feature advisor ──► new milestone (feature / fix) ──► same loop
ANY TIME         11 security review
```

Run steps 01–07 once. Then repeat 08 → 09 → 10 → review for each milestone until the product is done. `/00-next` keeps track of this for you. New features and fixes go through `/12-feature-advisor`, which adds milestones to the same loop.

### Skills

| # | Skill | What it does | Writes |
|---|---|---|---|
| 00 | `/00-next` | Entry point: reads the project state, shows a status and runs the next skill. In autopilot it chains steps and stops only at gates that need you. | — |
| 01 | `/01-discovery-idea` | Interviews you and turns a rough idea into a clear concept: problem, audience, value, v1 scope, risks. | `docs/01-Idea.md` |
| 02 | `/02-discovery-idea-roast` | Stress-tests the idea: competitor research, weak assumptions, unrealistic scope. It strengthens the idea rather than killing it. | `docs/01-Idea.md` (updated) |
| 03 | `/03-discovery-prd` | Writes the product requirements: functional requirements, flows, edge cases, non-functional requirements, metrics. | `docs/02-General-PRD.md` |
| 04 | `/04-planning-design-system` | Defines the visual language as a DESIGN.md: tokens plus rationale. For products without a GUI, it covers output, API or library conventions instead. | `docs/03-Design.md` |
| 05 | `/05-planning-interface` | Specifies the full interface: screens, flows, states and responsiveness. For other products, it specifies the command tree, endpoints, public API or game scenes. | `docs/04-Interface-spec.md` |
| 06 | `/06-planning-tech-stack` | Picks one opinionated stack, the architecture and the project structure, with alternatives and risks. | `docs/05-Tech-Stack.md` |
| 07 | `/07-planning-milestones` | Plans v1 as a phased roadmap (look & feel → clickable prototype → foundations → core features → complete features → quality → release). Each milestone has a visible outcome, a demo and exit criteria. | `milestones.md` |
| 08 | `/08-planning-tasks` | Milestone gate: records your acceptance, or adds rework tasks. Then plans the ordered tasks of the next milestone. | `milestones/Mnn-*/tasks.md`, statuses in `milestones.md` |
| 09 | `/09-planning-task-details` | Writes a precise implementation plan for every pending task of the active milestone, with acceptance criteria limited to what each task really needs. | `milestones/Mnn-*/NNN-*/implementation-plan.md` |
| 10 | `/10-execution-tasks` | Implements the active milestone task by task, each on its own branch. A reviewer with a fresh context approves every task before it is merged. Then it writes a milestone report, with the spec changes it needs, and stops for your review. | product code, `progress.md`, task and milestone reports |
| 11 | `/11-security-researcher` | Reviews the codebase for security issues, applies safe fixes and documents the rest. | fixes, `docs/06-security-report-YYYY-MM-DD.md` |
| 12 | `/12-feature-advisor` | Turns a feature request or bug report into an impact analysis, spec updates (after your approval) and a new milestone of type `feature` or `fix`. It does not write code. | `docs/07-feature-plan-<name>.md`, spec updates, new milestone in `milestones.md` |

All paths in the table are relative to `.speccraft/`. How to call a skill in each tool is described in [Agent support](#agent-support).

---

## The roadmap: watch the product grow

`/07-planning-milestones` plans v1 like a waterfall you can watch: a fixed sequence of phases, each finished and accepted before the next one starts, each ending with something new you can see.

| # | Phase | What you see at the end |
|---|---|---|
| 1 | Look & feel | the real app shows a style guide: colors, fonts and every component |
| 2 | Clickable prototype | every screen and flow, clickable on sample data |
| 3 | Foundations | real sign-in, data that survives a restart, first screen on real data |
| 4 | Core features | the main user journey working on real data |
| 5 | Complete features | all remaining v1 features and integrations |
| 6 | Quality | end-to-end tests, performance, accessibility and security checks |
| 7 | Release | deployable product, final docs and a full walkthrough |

Details:

- **Product size:** small products merge neighboring phases (e.g. 1+2, 6+7), and a large phase is split into several milestones. The order of phases never changes.
- **Products without a GUI** (CLI, API, library) get matching phases: interface contract (`--help`, mock API) → walking skeleton → foundations → … → packaging.
- **The roadmap table** at the top of `milestones.md` shows each phase with its milestones, its visible outcome and its status: `planned`, `in progress`, `in review` or `done`.
- **"What you will see":** every milestone describes its outcome before → after, in plain language.
- **Milestone report:** its "What you can see now" section compares the result with that promise. For UI products it adds screenshots of the key screens in `milestones/Mnn-*/screenshots/`, so you can look back at how the product grew.
- **`/00-next`** shows the roadmap progress in its status line.

---

## The milestone loop

Milestones are where you keep control. The agent may work autonomously inside the active milestone, but it never moves on to the next one by itself.

1. **`/08-planning-tasks`** plans the tasks of the next milestone and marks it active.
2. **`/09-planning-task-details`** writes an implementation plan for each task.
3. **`/10-execution-tasks`** implements and verifies each task, then hands it to an **independent review**: a fresh agent that runs the checks itself, compares the diff with the plan, and approves and merges the task or sends it back with concrete findings (at most 3 rounds). When all tasks are merged, it writes `milestones/Mnn-*/milestone-report.md`, including the **spec changes** the build made necessary, and marks the milestone as awaiting review.
4. **You review it.** Follow the demo steps in the report, check the exit criteria and assumptions, and look at the diff.
5. **You decide.** Tell `/08-planning-tasks` "accept M01": it applies the spec changes to `.speccraft/docs/` (except the ones you struck out in the report), merges the milestone into `main` and plans the next one. To request changes, describe them; they become rework tasks in the same milestone.

Because the spec is synced at every acceptance, the next milestone is always planned against documents that match the code. Re-run `/07-planning-milestones` if a review changed the direction of the remaining milestones.

### Statuses

Milestone headings in `milestones.md`:

| Status | Meaning | Set by |
|---|---|---|
| `[ ]` | planned | 07 |
| `[>]` | active, being executed | 08 |
| `[?]` | done, waiting for your review | 10 |
| `[x]` | accepted | you, or 08 on your explicit acceptance |

Task lines in `milestones/Mnn-*/tasks.md`:

| Status | Meaning |
|---|---|
| `[ ]` | pending, or sent back by the reviewer (findings in `review.md`) |
| `[~]` | implemented and verified, waiting for independent review |
| `[x]` | approved by the reviewer and merged into the milestone branch |
| `[!]` | blocked; see `blocker.md` in the task folder |

To unblock a task: provide what `blocker.md` asks for, change `[!]` back to `[ ]`, and run execution again. The partial work is kept on the task's `task/NNN-slug` branch, and the next run resumes from it.

### What the agent remembers

Every task can start from a fresh context, because all state lives in files:

- `progress.md` holds the project memory: commands, structure, conventions, decisions and open assumptions.
- `milestones/Mnn-*/NNN-*/report.md` records what each task delivered and what later tasks need to know.
- Git history: every task is a merge commit on the milestone branch (see [Git workflow](#git-workflow)).

---

## Git workflow

Every task gets its own branch. Nothing reaches `main` until you accept the milestone.

```text
main ──────────────────────────────────────────●── merge(M02) after "accept M02"
  └─ milestone/M02-foundations ──●──────●─────●┘   docs(M02): plan tasks / plans, merges, report
       ├─ task/009-set-up-database ─●─●─┘           feat(task-009)  → merge(task-009)
       └─ task/010-add-logging ─────────●─┘         feat(task-010)  → merge(task-010)
```

| Step | Who | Git |
|---|---|---|
| Plan a milestone | `/08-planning-tasks` | commits pending spec changes on `main`, creates `milestone/Mnn-slug`, commits the task list |
| Plan task details | `/09-planning-task-details` | commits the plans on the milestone branch |
| Each task | `/10-execution-tasks` | `task/NNN-slug` from the milestone branch → code, tests and report → verified → `[~]` → independent review → approved: `merge --no-ff` into the milestone branch with `[x]`, task branch deleted; changes requested: back to `[ ]`, same branch continues |
| Blocked task | `/10-execution-tasks` | partial work stays on `task/NNN-slug`; blocker recorded on the milestone branch; resumed later from that branch |
| Milestone done | `/10-execution-tasks` | report + `[?]` committed on the milestone branch; **no merge** |
| You accept | `/08-planning-tasks` "accept Mnn" | `[x]` and spec changes committed, `merge --no-ff` milestone → `main`, milestone branch deleted, next milestone branch created |
| You request changes | `/08-planning-tasks` | rework tasks added on the same milestone branch |

Why this shape:

- **`main` only contains accepted, demoed milestones.** It is always in a state you approved.
- **The milestone branch is the integration branch.** Each task merges into it only after its checks pass, so later tasks always start from verified code. A failed or interrupted task never pollutes it.
- **Review is easy:** `git log --oneline --first-parent milestone/Mnn-slug` shows a `merge(task-NNN)` commit per task, and `git diff main...milestone/Mnn-slug` shows the whole milestone.
- **Rollback is easy:** reverting a task is `git revert -m 1 <merge commit>`, and an unwanted milestone is simply never merged.

Rules the agents follow:

- never push, force-push or rewrite merged history;
- never commit directly to `main` during a milestone;
- never delete unmerged work (abandoned attempts are renamed to `attic/...`);
- merge conflicts with `main` are handed to you.

Pushing branches or opening pull requests is up to you. For example, push `milestone/Mnn-slug` and open a PR for team review before you say "accept".

---

## Autopilot

The autopilot runs the workflow without you, from an idea in a few sentences to a built milestone waiting for your review:

```text
your brief ─► 01 idea ─► 02 roast, round 1 … N (fixes applied) ─► 03 PRD ─► 04 design ─► 05 interface
          ─► 06 tech stack ─► 07 roadmap ─► 08 tasks ─► 09 plans ─► build (implement ⇄ independent review)
          ─► ⏸ you review the milestone
```

### Three levels

| Mode | Start | Stops at |
|---|---|---|
| **Step by step** | `/00-next` | after every step |
| **Guided autopilot** | `/00-next autopilot` | every point where you are needed: your idea and the discovery questions, the specification review before any code, each milestone review, blockers |
| **Full autopilot** | `autopilot.sh "<idea>"` or `/00-next autopilot full <idea>` | only where it must: the point you chose (`Stop at`), a milestone review, a blocker, changes it did not make |

In full autopilot nothing is asked. Whenever a skill would ask you, the agent chooses what best fits your brief and records the choice in two places: as an assumption in the document, and as a line in `autopilot.md` → **Decisions to review**. What your brief states is treated as a fixed requirement.

### One decision, three places

Which step comes next is decided by one script, the state engine: `node .agents/skills/00-next/scripts/state.mjs`. It reads `.speccraft/` and git and applies the rules of `00-next`. `/00-next`, `autopilot.sh` and SpecCraft Board all use it, so the board's Next button, the autopilot and an agent session always agree. Run it yourself for a quick status (`--json` gives every milestone and task as JSON).

### Unattended: `autopilot.sh`

```bash
.agents/skills/00-next/scripts/autopilot.sh "A mobile-first app for climbing gyms: members log the routes they climbed, setters see which routes are popular. Web app first."
```

Each step runs in a new agent process with a fresh context, like `run-milestone.sh`. The script decides the next step from the files, runs it, commits `.speccraft/` (`docs(autopilot): <skill>`), and moves on. When it reaches the build, it hands over to `run-milestone.sh`. It continues from wherever the project is, so you can run a few skills yourself and then start it, or stop it and continue by hand.

| Option | Purpose |
|---|---|
| `"text"`, `--brief`, `--brief-file F` | Your idea. It is saved in `autopilot.md` → Brief. Not needed once `01-Idea.md` exists. |
| `--stop-at spec` | Stop when the specification and the roadmap are ready, so you can review them before any code. |
| `--stop-at plan` | Stop when the next milestone has its tasks and implementation plans. |
| `--stop-at milestone` | Default: build the next milestone and stop when it waits for your review. |
| `--roast-rounds N` | Maximum roast rounds (default 3, `0` skips the roast). |
| `--accept Mnn` | Your acceptance of a reviewed milestone: it is accepted, merged into `main`, and the autopilot continues with the next one. |
| `--max-steps N` | Run at most N steps (`1` = only the next step). |
| `--dry-run` | Show the status and the next step. |
| `--feature "text"` | A feature or fix for the existing product: `12-feature-advisor` updates the specification and adds a milestone, then the loop continues. |
| `--changes "text"` | Your feedback on the milestone waiting for review: it gets rework tasks and is built again. |
| `--agent`, `--model` | Agent CLI and model (default: `Agent` and `Model` in `autopilot.md`). `--model` is passed as `--model` to Claude Code and `-m` to Codex and Gemini. |
| `--agent-cmd`, `--timeout`, `--max-retries`, `--retry-wait` | As in `run-milestone.sh`. |
| `--parallel N`, `--max-tasks N`, `--worktrees-dir D` | Passed to `run-milestone.sh` for the build. |

A typical project:

```bash
autopilot.sh "<idea>" --stop-at spec   # idea, roast, PRD, design, interface, stack, roadmap
# read .speccraft/docs/, .speccraft/milestones.md and the decisions to review; edit what you disagree with
autopilot.sh                           # plan M01 and build it; stops at your review
# review M01 (milestone-report.md, the demo)
autopilot.sh --accept M01 --parallel 3 # accept M01, then plan and build M02
```

(`autopilot.sh` stands for `.agents/skills/00-next/scripts/autopilot.sh`.)

### The roast rounds

The idea goes through several rounds of `02-discovery-idea-roast` before the PRD. Every round researches the market, rates seven dimensions (problem, users, value, competition, v1 scope, business model, risks), applies the fixes to `01-Idea.md` and saves itself in `docs/01-Idea-roast.md`. From the second round on, it checks whether the previous fixes worked.

The roast may narrow your audience, cut v1 features, sharpen the value proposition, and add competitors and risks. It never pivots: a different problem, different users or a different kind of product goes to **Decisions to review** as a recommendation. The rounds stop at `Roast rounds`, or earlier when a round says `Next round needed: no` (nothing material is left that more editing could fix).

### Settings: `autopilot.md`

```markdown
## Settings
- Stop at: milestone
- Roast rounds: 3

## Brief
<your idea; written there by the script or by /00-next autopilot full>

## Decisions to review
- 2026-11-21 · 01-discovery-idea · Web app first, mobile later — the brief names no platform
```

Options of the script override the settings for one run. SpecCraft Board shows the settings, the decisions and the live step on its **Autopilot** page.

### What the autopilot never does

- accept a milestone for you: only you do that (`--accept Mnn` or "accept Mnn" to `08-planning-tasks`);
- push, or merge into `main` anything other than a milestone you accepted;
- commit changes it did not make: uncommitted product files stop the run;
- continue past a blocker: blocked tasks wait for you.

The same safety rules as for overnight runs apply: an unattended agent runs without approval prompts, so use a separate clone or a container with no production credentials (see below).

---

## Autonomous (overnight) runs

`10-execution-tasks` can run a whole milestone unattended. Every step runs in a fresh agent session (implementing a task, reviewing a task, completing the milestone), so the reviewer never shares a context with the implementer.

```bash
# from the repository root, with an active milestone and its task plans ready
.agents/skills/10-execution-tasks/scripts/run-milestone.sh                         # Claude Code
.agents/skills/10-execution-tasks/scripts/run-milestone.sh --agent codex           # Codex CLI
.agents/skills/10-execution-tasks/scripts/run-milestone.sh --agent antigravity     # Antigravity CLI (agy)
.agents/skills/10-execution-tasks/scripts/run-milestone.sh --agent gemini          # Gemini CLI
.agents/skills/10-execution-tasks/scripts/run-milestone.sh --agent-cmd "my-agent --yes"
```

Useful options:

| Option | Purpose |
|---|---|
| `--max-tasks N` | Stop after N tasks. Use `--max-tasks 2` while watching your first run. |
| `--timeout SEC` | Time limit per step. Default 5400. Needs `timeout`/`gtimeout`. |
| `--max-retries N`, `--retry-wait SEC` | Survive usage limits and transient failures. |
| `--stash-dirty` | Stash uncommitted changes instead of refusing to start. |
| `--parallel N` | Implement up to N independent tasks at once, each in its own git worktree (see below). |
| `--worktrees-dir DIR` | Where the parallel worktrees go. The default is a folder in `$TMPDIR`. |

The run stops when:

- the milestone is ready for review;
- the milestone is blocked or the environment is broken;
- a limit is reached.

At the end it writes `milestones/Mnn-*/run-summary-<run-id>.md`. Live logs are in `.runs/` (git-ignored).

### Parallel tasks

With `--parallel N`, independent tasks are implemented at the same time, each by its own agent in its own git worktree and on its own task branch. Reviews, merges, `exclusive` tasks and the milestone completion stay one at a time in the main repository.

- **Which tasks run together:** a task joins the parallel lane only when all of these hold:
  - its implementation plan says `Parallel: safe`. `/09-planning-task-details` decides this: no new dependencies, no migrations, no global config, isolated tests;
  - its dependencies are merged;
  - its files do not overlap with another task that is running or not yet merged.
- **No conflicts in the workflow files:** workers never touch the milestone branch. The script records their results and restores workflow files a worker should not have changed.
- **Conflicts in code** with tasks merged in the meantime are caught at review: the reviewer first merges the milestone branch into the task branch, and a conflict sends the task back to its implementer.
- **Shared services:** every worker gets `SPECCRAFT_SLOT=1..N` for its own ports and test database, set up once as a foundation task. Tasks that need a shared database exclusively are marked `exclusive`.

Start with `--parallel 2 --max-tasks 4` while you watch. Details and caveats are in `autonomous-run.md` → "Parallel runs".

**Safety:** an unattended agent runs without approval prompts. Use a separate clone, or better a container, with no production credentials. Read `.agents/skills/10-execution-tasks/references/autonomous-run.md` before your first night run. It covers the pre-run checklist, isolation levels and how to review the result.

---

## Agent support

| Tool | How it finds the skills | How you call a skill | Project instructions |
|---|---|---|---|
| **Claude Code** | `.claude/skills` → symlink to `.agents/skills` | `/01-discovery-idea` | `CLAUDE.md`, which imports `AGENTS.md` |
| **Codex** (CLI, IDE, app) | `.agents/skills` natively | `$01-discovery-idea`, or pick it from `/skills` | `AGENTS.md` |
| **Antigravity** (IDE, app, CLI) | `.agents/skills` natively | `/01-discovery-idea` | `AGENTS.md` |

All three also pick a skill on their own when your request matches its description, e.g. "plan the tasks of the next milestone". `.agents/skills/` is the single source of truth: edit skills only there.

`AGENTS.md` holds the instructions every agent should know, even without calling a skill: where the documents live, where statuses are kept, and what must never be touched. Keep the SpecCraft section between its markers and add your product's own instructions below it.

**Windows:** git may check out the `.claude/skills` symlink as a plain text file. Enable symlinks (`git config core.symlinks true` with Developer Mode on) before cloning, or recreate the link with `mklink /D .claude\skills ..\.agents\skills`.

---

## SpecCraft Board

```bash
.speccraft/board                 # start the board of this project and open it in the browser
.speccraft/board --no-open       # start without opening the browser
.speccraft/board --read-only     # dashboard only, no controls
.speccraft/board --port 5000     # a fixed port
npx speccraft board              # the same from any folder of the project
```

With `npm install -g speccraft` the command is just `speccraft board`.

Running it again while the board of the same project is open just reopens the browser tab. Each project gets its own port: the first free one from 4545 up. The board stops with Ctrl+C; runs started from it keep going.

A dashboard over the files in `.speccraft/` and a control panel for the agents. It has no dependencies, listens on `127.0.0.1` only, and updates in place as the agents work. While a run or the autopilot is active, the top bar shows on every page what the agents are doing right now and for how long. While agents work, the logo, the browser tab icon and the tab title move with them, the active milestone in the sidebar spins, and every change (a task merged, sent back or blocked, a milestone started or built, a document written) briefly highlights its card and shows a short notice. The board uses a dark theme. The button at the top left (or the `[` key) collapses the sidebar to a narrow rail of icons; the board remembers the choice.

### Control panel

The top of the Overview drives the whole workflow, so you do not need a terminal:

| Control | What it does |
|---|---|
| **Agent** | the agent CLIs found on your `PATH` (Claude Code, Codex, Gemini, Antigravity), with their versions; missing ones are greyed out |
| **Model** | `default` (the CLI's own default, shown as "CLI default: …" when it is configured in `~/.claude/settings.json`, `~/.codex/config.toml` or `~/.gemini/settings.json`), the Claude aliases `opus`, `sonnet`, `haiku`, or any model name you type. Antigravity has no model option. |
| **Mode** | **Step by step**: the **Next** button runs exactly one step in a fresh agent process (at the build: one task, implemented and independently reviewed). **Full autopilot**: **Start autopilot** runs until **Stop at** (spec ready, milestone planned, milestone built), optionally with **Parallel** tasks. |
| **Stop** | ends the run started from the board and every agent it started; finished work stays committed, unfinished work stays on its task branch |

The next-step panel asks for what only you can give:

- **No idea yet:** a text box for the idea. **Start with this idea** saves it as the brief and starts (one step, or the full autopilot).
- **Milestone waiting for review:** **Accept Mnn** (after a confirmation), or **Request changes** with your feedback, which becomes rework tasks.
- **Request a feature or a fix** (below the board, once there is a roadmap): runs `12-feature-advisor`, which updates the specification and adds a milestone; in full autopilot it is then planned and built too.

Everything runs through `autopilot.sh` with the agent and model you chose, so a run started from the board behaves exactly like one started in the terminal and keeps running if you close the board. Its output is under "last run" → **log**. The choices are stored per machine in `.speccraft/.runs/board/` (git-ignored).

### Agent chat

The chat button at the top right (or the `]` key) opens a chat with your agent CLI on the right side of the board. It is a real session of Claude Code, Codex, Gemini or Antigravity running in this project, with all the skills, so you can go through the whole flow from the board, from shaping the idea to accepting the last milestone.

- **Agent and model:** pick any CLI the board found and a model (the CLI's default, the Claude aliases `opus`, `sonnet`, `haiku`, or any name you type).
- **What the agent may do:** *Full access* (edits files and runs commands such as git and tests without asking, like the scripts), *Edits only* (changes files, skips commands that need approval) or *Read only* (answers and plans, changes nothing).
- **Quick actions** above the message box follow the stage: *Where are we?*, *Next step*, *Shape my idea*, *Write the PRD*, *Plan M03 tasks*, *Build 009*, *Review 007*, *Unblock 008*, *Summarize M03*, *Accept M03*, *Request changes*, *Feature or fix*, *Security review*. Actions ending in "…" put the start of a message in the box for you to finish. "do it in the chat →" next to the next step does the same.
- **Live:** the reply streams in, every file read, edit and command the agent runs is listed under it, and the whole board shows the work live (stage, task cards, top bar). **■ Stop** ends the turn.
- **One conversation per chat:** Claude Code and Codex continue their own session with every message; Gemini and Antigravity get the conversation so far as text. Earlier chats are in the list at the top; they are kept per machine in `.speccraft/.runs/chat/` (git-ignored).
- **Next to everything else:** the Next button, the autopilot and your terminal work on the same files. While a script or the autopilot runs, the chat accepts *Read only* messages; while the chat works, Next and Start autopilot wait.

Each message runs the CLI once, with the same permissions as the scripts when *Full access* is chosen, so the safety notes below apply to the chat too.

### Work in an agent session shows up live too

The board does not only follow the scripts. When you work in Claude Code, Codex or Antigravity yourself (`/00-next`, `/10-execution-tasks`, …), the agent writes what it is doing to `.speccraft/.runs/activity.json` when it starts a step, and removes it at the end (the rule is in `AGENTS.md`). The board then shows the same live state as for a script run: the animated stage, "Now: …", the task card marked *implementing* or *reviewing*, and the top bar.

- **Claude Code** also gets three hooks in `.claude/settings.json` (added by the installer, your own settings are kept): after every tool call the session counts as busy, and when the agent stops and hands the turn back to you, the board shows **Waiting for you**.
- **Without hooks** (Codex, Antigravity), recent changes to files count as a sign of life. After 15 minutes without any, the board shows **no activity** with a **Clear** button, in case the session ended without cleaning up.
- **Without the file at all**, a `task/NNN-…` branch with fresh uncommitted changes is still shown as task NNN being implemented.

While a session works, **Next** and **Start autopilot** are disabled, so a script never runs on top of it.

**Safety.** The board starts agents without approval prompts, like the scripts. Only the page served by the board can start or stop them: every request needs a token generated when the server starts, requests from other sites and other host names are refused, and the server listens on `127.0.0.1` only. Start it with `--read-only` to hide all controls, e.g. when you only want to watch a run.

| Page | What it shows |
|---|---|
| **Overview** | where the project is: the six stages (specification, roadmap, milestone tasks, task plans, build, your review) with the current one highlighted, then one panel for that stage showing what is being done now or what comes next. Specification: every document in order, done, in progress or to do. Roadmap and milestone tasks: the milestones and the one to plan next. Task plans: which tasks have their implementation plan. Build: the active milestone with its task board and the agents at work. Your review: exit criteria, accept or request changes. The agent, model, mode and the **Next** / **Start autopilot** button sit at the bottom of that panel. Below: the live log, the roadmap line, what needs attention, recent activity, the specification documents and a box to request a feature or a fix |
| **Roadmap** | every phase with its milestones, outcomes and progress, plus the coverage table |
| **Milestone** | goal, scope, demo, exit criteria (checked off), a task board (pending, in progress, blocked, done; the tasks agents are working on right now are marked live), the milestone report, screenshots and run summaries |
| **Task** | the implementation plan, the report, the independent reviews and the blocker, plus parallel safety and dependencies |
| **Specification** | the documents 01–05 and reports, rendered, with a table of contents; colors from `03-Design.md` shown as swatches |
| **Autopilot** | settings, your brief, the decisions to review and the step running now (opened from the overview's decisions and the top bar, `#/autopilot`) |
| **Progress log, Runs, Mockups** | `progress.md`; the logs of autonomous runs, including active workers; your mockups as a gallery (Runs opens from "live log →"; Runs and Mockups are not in the sidebar: `#/runs`, `#/mockups`) |

Everything the board shows comes from the markdown files, so it always matches what the agents see. The only files it writes itself are the brief in `autopilot.md` and its own settings; everything else is done by the agents it starts.

---

## Mockups

Anything in `.speccraft/mockup/` is input for the skills: wireframes, screenshots, Figma exports, sketches, brand assets, reference products. The idea, PRD, design, interface and tech stack skills read it. The planning and execution skills use it for UI work. Mockups take precedence over generic design defaults.

---

## Conventions

- **Language:** the documents are written in your language. Templates and headings keep their defined structure.
- **Missing inputs:** a skill stops and names the step to run first. An empty file counts as missing.
- **No outward actions:** the execution skill never pushes, deploys, publishes or contacts real services. Deployment tasks only prepare configuration and documentation.
- **Commits and branches:** in a git repository, every mode follows the [Git workflow](#git-workflow). Ask the agent to work without git if you want to.
- **Editing documents:** every document in `.speccraft/docs/` is yours to edit. Downstream skills always read the current version.
