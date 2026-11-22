# Autonomous (overnight) run

How to let an AI agent execute a milestone unattended, e.g. overnight, and how to review the result.

`run-milestone.sh` builds one planned milestone. To run everything before it as well (idea, roast rounds, specification, roadmap, task planning) and then the build, use the full autopilot: `.agents/skills/00-next/scripts/autopilot.sh`. It hands the build over to this script with the same agent options. See `.speccraft/Readme.md` → "Autopilot".

## Autonomy is per milestone

The operator stays in control at milestone boundaries:

```text
08-planning-tasks (plans M01, sets [>])
  → 09-planning-task-details
  → run-milestone.sh: autonomous, per task: implement → [~] → independent review → merge [x] (or back to [ ])
  → milestone completion: exit criteria, milestone-report.md, [?]
  → operator reviews the milestone
      accept           → 08-planning-tasks "accept M01" → spec updated, merged to main → plans M02 → ...
      request changes  → 08-planning-tasks adds rework tasks to M01 → [>] → run again
```

The run never starts the next milestone. Only the operator accepts milestones.

## How it works

`scripts/run-milestone.sh` runs a loop over the active milestone (`[>]` in `.speccraft/milestones.md`). Every iteration starts a **new agent process** with a prompt in `AUTONOMOUS MODE` that executes exactly one step: the review of a task waiting for review (`[~]`), the implementation of the next task, or the milestone completion when all tasks are done. Each step therefore starts from a fresh context. The reviewer never shares a context with the implementer. There is no context compression and no drift after many tasks. Everything the agent needs to know about previous work lives in files:

| File | Role |
|---|---|
| `.speccraft/milestones.md` | milestone statuses `[ ]` / `[>]` / `[?]` / `[x]`, scope and exit criteria |
| `.speccraft/milestones/Mnn-*/tasks.md` | task list of one milestone with statuses `[ ]` / `[~]` / `[x]` / `[!]` |
| `.speccraft/progress.md` | compact project memory: commands, structure, conventions, decisions, assumptions, log |
| `.speccraft/milestones/Mnn-*/NNN-*/report.md` | details of a finished task, including notes for next tasks |
| `.speccraft/milestones/Mnn-*/NNN-*/review.md` | verdicts and findings of the independent reviews |
| `.speccraft/milestones/Mnn-*/NNN-*/blocker.md` | why a task is blocked and what is needed from you |
| `.speccraft/milestones/Mnn-*/milestone-report.md` | what to review, demo steps, exit criteria results, your decision |
| git history | a task branch per task and one merge commit per approved task on the milestone branch |

The loop stops when:

- the milestone is ready for review (`[?]`)
- the agent writes `.speccraft/.runs/STOP` (milestone blocked, or a broken environment)
- `--max-tasks` is reached
- the agent makes no progress `--max-retries` times in a row (crash, usage limit, timeout)

At the end the script writes `.speccraft/milestones/Mnn-*/run-summary-[run-id].md` and commits it. It also writes the summary when you stop the run with Ctrl+C.

## Before the night: checklist

**Planning complete**
- `.speccraft/milestones.md` has an active milestone `[>]`, and `.speccraft/milestones/[Mnn]-[slug]/tasks.md` contains its tasks (`08-planning-tasks`).
- Run `09-planning-task-details` beforehand so every pending task of the milestone has an `implementation-plan.md`. Review a few plans; the night is better spent building than planning.

**Repository**
- The project is a git repository with at least one commit and a clean working tree.
- Branches are automatic. `08-planning-tasks` created `milestone/Mnn-slug`, and the run script switches to it. Every task gets its own `task/NNN-slug` branch, which is merged into the milestone branch after verification. Nothing reaches `main` before you accept the milestone.

**Environment**
- Runtime and package manager from `05-Tech-Stack.md` installed (node/pnpm, python/uv, ...).
- Local services running and reachable, e.g. `docker compose up -d` for the database.
- `.env` filled with **local or test** values only. No production credentials.
- Missing third-party keys are fine: the agent uses mocks or test modes and records it as an assumption.
- The agent CLI is installed and logged in; run one short prompt manually to confirm.
- Enough free disk space.

**Machine (macOS)**
- Plugged into power and with the lid open. The script runs under `caffeinate -is`, but closing the lid still puts most MacBooks to sleep.
- Notifications or updates that may restart the machine are postponed.

## Working directories

The runner and agent sessions start at the repository root. The product lives directly in the repository root (laid out as defined in `.speccraft/docs/05-Tech-Stack.md`), next to the workflow directories `.agents/`, `.claude/` and `.speccraft/`. Commands run from the repository root unless `05-Tech-Stack.md` / `progress.md` names another working directory. Product documentation and environment files are `README.md`, `.env` and `.env.example` in the repository root. All workflow state — plans, reports, progress, run logs — stays in `.speccraft/`.

## Starting the run

From the project root:

```bash
.agents/skills/10-execution-tasks/scripts/run-milestone.sh                    # Claude Code
.agents/skills/10-execution-tasks/scripts/run-milestone.sh --agent codex      # Codex CLI
.agents/skills/10-execution-tasks/scripts/run-milestone.sh --agent antigravity  # Antigravity CLI (agy)
.agents/skills/10-execution-tasks/scripts/run-milestone.sh --agent gemini     # Gemini CLI
.agents/skills/10-execution-tasks/scripts/run-milestone.sh --agent-cmd "my-agent --yes"   # anything else
```

Useful options:

- `--model NAME` — model for the agent: `--model` for Claude Code (e.g. `opus`, `sonnet`), `-m` for Codex and Gemini
- `--max-tasks 10` — limit the number of tasks (budget control, first trial run)
- `--timeout 5400` — time limit per step in seconds (needs `timeout`/`gtimeout`: `brew install coreutils`)
- `--parallel 3` — implement up to 3 independent tasks at once (see "Parallel runs")
- `--retry-wait 1800 --max-retries 6` — survive usage limits. A failed iteration is retried after the wait, which covers limits that reset after a few hours.

Recommended first run: `--max-tasks 2` while you watch, then the rest of the milestone.

Monitoring from another terminal:

```bash
tail -f .speccraft/.runs/*/iteration-*.log    # live agent output
git log --oneline                             # one commit per finished task
cat .speccraft/milestones/M02-*/tasks.md     # task statuses of the active milestone
```

## Parallel runs

```bash
.agents/skills/10-execution-tasks/scripts/run-milestone.sh --parallel 3
```

With `--parallel N`, up to N tasks are implemented at the same time, each by its own agent in its own git worktree (by default in `$TMPDIR/speccraft-worktrees/`; change it with `--worktrees-dir`).

| Lane | Runs | Where |
|---|---|---|
| worker (up to N) | implementation of `Parallel: safe` tasks | own worktree, own `task/NNN-slug` branch |
| main (one at a time) | reviews and merges, `exclusive` tasks, milestone completion | the repository, milestone branch |

**When tasks run together.** A task starts in a worker only when all of these hold:
- its plan says `Parallel: safe` and lists its files in §6;
- its dependencies are merged (`[x]`);
- its files do not overlap with a task that is running, or implemented but not merged yet.

An `exclusive` task waits until no worker is running, then runs alone in the main lane. Tasks keep their list order: while an exclusive task is next, no new workers start.

**What the script handles.** Workers never touch the milestone branch. The script:
- creates the worktree and copies the local `.env` files into it;
- after the worker finishes, commits its leftovers to the task branch and restores workflow files the worker should not have changed;
- removes the worktree (the branch stays);
- records `[~]` (ready for review) or `[!]` (blocked) on the milestone branch.

Reviews then run one by one in the main lane. Each review first merges the milestone branch into the task branch. If that conflicts, the task goes back to its implementer with the conflict as the finding.

**Before the first parallel run:**
- **Isolation per slot.** Workers get `SPECCRAFT_SLOT=1..N`. The project needs a way to use separate ports and a separate test database per slot, documented in `progress.md` → "Parallel isolation". Add it as a foundation task. Without it, mark tasks that use shared services as `exclusive`.
- **Dependencies are installed per worktree.** pnpm (shared store) is fast; npm or pip are slower and use more disk.
- **Agent sandboxes.** Workers commit inside worktrees, which writes to the repository's `.git` directory outside the worktree. Claude Code with `--dangerously-skip-permissions` and Antigravity handle this. Codex's workspace-write sandbox (`-s workspace-write`) may block writes outside the workspace: give it access to the repository's `.git` (`sandbox_workspace_write.writable_roots`) or use a container.
- **Containers.** Use `--worktrees-dir` with a path inside the container, e.g. `/tmp/speccraft-worktrees`.
- **Start small.** Use `--parallel 2 --max-tasks 4` while you watch, then increase. The cost is roughly N agents at once; the gain depends on how many tasks are `safe`.

Logs: `.speccraft/.runs/<run>/task-NNN-*.log` per worker, `main-*.log` for the main lane. Ctrl+C stops all agents, keeps their work on the task branches and removes the worktrees.

## Permissions

An unattended agent cannot wait for you to approve a command, so it must run with approvals disabled or with a pre-approved allowlist. That gives it the same access as your user account. **The safety of the run depends on what that account can reach, not on the agent's good behavior.** Choose one of the isolation levels below.

Presets used by the script:

| Agent | Command | Notes |
|---|---|---|
| Claude Code | `claude -p "<prompt>" --dangerously-skip-permissions` | No approvals at all. Refuses to run as root, so use a non-root user in containers. |
| Codex CLI | `codex exec -s workspace-write -c sandbox_workspace_write.network_access=true "<prompt>"` | Writes limited to the workspace by Codex's sandbox; network enabled for package installs. |
| Antigravity CLI | `agy -p "<prompt>" --dangerously-skip-permissions` | No approvals. Log in with `agy` interactively once first. Some `agy` versions have reported problems in print mode without a TTY (empty output or a hang); the per-step `--timeout` limits a hang, and progress is detected from the task files, not from the output. |
| Gemini CLI | `gemini --yolo -p "<prompt>"` | No approvals. Add `--sandbox` to run tools in Gemini's container sandbox. |

Less permissive alternative for Claude Code: define an allowlist in `.claude/settings.json` (`permissions.allow`, e.g. `Bash(pnpm *)`, `Bash(git add *)`, `Bash(git commit *)`, `Bash(npx prisma *)`) and run with `--agent-cmd "claude -p --permission-mode acceptEdits"`. Commands outside the allowlist fail instead of waiting, so expect more blocked tasks until the allowlist is complete.

Codex and Antigravity discover skills in `.agents/skills/` natively. Claude Code discovers them in `.claude/skills/`, which in this repository is a symlink to `.agents/skills/`. The script also passes the path to this `SKILL.md` explicitly, so it works with any agent.

## Isolation levels

### Level 1 — separate clone on your machine (minimum)

- A separate clone or `git worktree` of the project on a dedicated branch.
- No production credentials in `.env` or in your shell environment (`AWS_*`, `GITHUB_TOKEN`, database URLs of real environments).
- Risk: with approvals disabled the agent can technically read anything your user can read, such as `~/.ssh`, cloud CLI configs and other projects. The skill forbids outward actions, but a skill is an instruction, not a technical barrier. Use this level only on a machine without sensitive access, or use an agent with its own sandbox (Codex `-s workspace-write`, Gemini `--sandbox`).

### Level 2 — container (recommended)

The agent runs in a container that only sees the project directory and the keys you pass explicitly.

`Dockerfile.agent` (example for a Node.js project; adjust the runtime to `05-Tech-Stack.md`):

```dockerfile
FROM node:22-bookworm
RUN apt-get update \
 && apt-get install -y --no-install-recommends git curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN corepack enable \
 && npm install -g @anthropic-ai/claude-code   # or @openai/codex / @google/gemini-cli
USER node
RUN git config --global user.name "Autonomous agent" \
 && git config --global user.email "agent@localhost" \
 && git config --global --add safe.directory /workspace
WORKDIR /workspace
```

Build and run. `caffeinate` runs on the host, because the container cannot keep the Mac awake:

```bash
docker build -t speccraft-agent -f Dockerfile.agent .

caffeinate -is docker run --rm -it \
  -v "$PWD":/workspace \
  -v speccraft-agent-home:/home/node \
  -e ANTHROPIC_API_KEY \
  speccraft-agent \
  .agents/skills/10-execution-tasks/scripts/run-milestone.sh --no-caffeinate
```

- Pass only the agent's API key (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY` or `GEMINI_API_KEY`).
  - To use a subscription login instead, run the agent CLI once inside the container and log in. The named volume `speccraft-agent-home` keeps the login between runs.
- Do not mount `~/.ssh`, `~/.aws`, `~/.config/gh` or the Docker socket.
- Services from `docker compose` are reachable when the agent container joins the compose network (`--network <project>_default`) and `.env` uses service names as hosts (e.g. `postgres:5432`).
- Network access stays enabled, because package installation needs it.

## After the run

Open `.speccraft/milestones/Mnn-*/run-summary-[run-id].md`. It shows the stop reason, completed and blocked tasks, and assumptions.

### The milestone is blocked or unfinished

For each blocked task:

1. Read `blocker.md` and provide what is needed (key, decision, fix).
2. The partial work is on branch `task/NNN-slug`. The next run resumes from it, or you can finish it yourself on that branch.
3. Change `[!]` back to `[ ]` in the milestone's `tasks.md`.
4. Start the run again. Dependent tasks are picked up automatically.

### The milestone is ready for review (`[?]`)

1. Open `.speccraft/milestones/Mnn-*/milestone-report.md` and follow **How to review**: run the demo yourself.
2. Check the exit criteria table. Anything marked `NOT MET` needs your decision.
3. Review **Assumptions to review** and **Recommendations for next milestones**.
4. Review the code: `git log --oneline --first-parent milestone/Mnn-slug` shows one merge per task, and `git diff main...milestone/Mnn-slug --stat` shows the whole change.
5. Decide:
   - **Accept:** tell `08-planning-tasks` "accept Mnn". It marks the milestone `[x]`, merges `milestone/Mnn-slug` into `main`, creates the next milestone branch and plans its tasks. Then run `09-planning-task-details` and the next run.
   - **Request changes:** write feedback in "Operator decision → Feedback" of the milestone report, or tell `08-planning-tasks` directly. It adds rework tasks to the same milestone and sets it back to `[>]`.

After the **prototype milestone**, this is the moment to update `03-Design.md` and `04-Interface-spec.md` with what you learned. Re-run `07-planning-milestones` if the scope of later milestones changed.

If a run ended with **no progress**, read the last `.speccraft/.runs/[Mnn]-[run-id]/iteration-*.log`. Common causes are usage limits, an expired agent login, or a hanging command. If an iteration was interrupted, its uncommitted changes are kept in `git stash list`.
