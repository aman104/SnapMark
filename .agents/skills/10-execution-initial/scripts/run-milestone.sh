#!/usr/bin/env bash
# Unattended execution of the active milestone: one step per fresh agent session.
# Run from the repository root (the product lives there; workflow state in .speccraft/). See ../references/autonomous-run.md.

set -uo pipefail

usage() {
  cat <<'EOF'
Usage: .agents/skills/10-execution-initial/scripts/run-milestone.sh [options]

Runs the 10-execution-initial skill in AUTONOMOUS MODE for the active milestone
([>] in .speccraft/milestones.md). Every iteration starts a new agent process that
executes exactly one step: the review of a task waiting for review ([~]), the
implementation of the next task, or the milestone completion when all its tasks
are done. Each step gets a fresh context, so reviews are independent.

The run never crosses the milestone boundary. It ends when the milestone is
ready for your review ([?]), the agent writes .speccraft/.runs/STOP (milestone
blocked, broken environment), a limit is reached, or the agent stops making
progress. After reviewing, accept the milestone or request changes with the
08-planning-tasks skill, then plan its tasks and start the next run.

Options:
  --agent NAME        claude (default), codex, antigravity, gemini, or custom
  --agent-cmd CMD     command for --agent custom; the prompt is appended as the
                      last argument, e.g. --agent-cmd "my-agent run --yes"
  --max-tasks N       stop after N tasks finished (done or blocked) in this run
  --timeout SEC       time limit per step (default 5400; 0 = none; needs
                      timeout or gtimeout, e.g. brew install coreutils)
  --max-retries N     attempts without progress before giving up (default 3)
  --retry-wait SEC    pause between attempts without progress (default 300)
  --stash-dirty       stash uncommitted changes at start instead of failing
  --parallel N        implement up to N independent tasks at the same time, each
                      in its own git worktree (default 1 = one step at a time).
                      Only tasks whose plan says "Parallel: safe", whose
                      dependencies are merged and whose files do not overlap
                      run together; reviews, merges and "exclusive" tasks stay
                      serial in the main worktree
  --worktrees-dir DIR where parallel worktrees are created (default: a folder in
                      $TMPDIR); must be outside the repository
  --no-caffeinate     do not keep macOS awake
  -h, --help          show this help

Environment: AGENT and AGENT_CMD can be used instead of the options.
EOF
}

# Keep macOS awake for the whole run (re-exec under caffeinate once).
for arg in "$@"; do [ "$arg" = "--no-caffeinate" ] && RUN_TASKS_CAFFEINATED=1; done
if [ -z "${RUN_TASKS_CAFFEINATED:-}" ] && command -v caffeinate >/dev/null 2>&1; then
  export RUN_TASKS_CAFFEINATED=1
  exec caffeinate -is "$0" "$@"
fi

AGENT="${AGENT:-claude}"
AGENT_CMD="${AGENT_CMD:-}"
MAX_TASKS=0
TASK_TIMEOUT=5400
MAX_RETRIES=3
RETRY_WAIT=300
STASH_DIRTY=0
PARALLEL=1
WORKTREES_DIR=""
POLL=5

while [ $# -gt 0 ]; do
  case "$1" in
    --agent) AGENT="$2"; shift 2 ;;
    --agent-cmd) AGENT="custom"; AGENT_CMD="$2"; shift 2 ;;
    --max-tasks) MAX_TASKS="$2"; shift 2 ;;
    --timeout) TASK_TIMEOUT="$2"; shift 2 ;;
    --max-retries) MAX_RETRIES="$2"; shift 2 ;;
    --retry-wait) RETRY_WAIT="$2"; shift 2 ;;
    --stash-dirty) STASH_DIRTY=1; shift ;;
    --parallel) PARALLEL="$2"; shift 2 ;;
    --worktrees-dir) WORKTREES_DIR="$2"; shift 2 ;;
    --no-caffeinate) shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
die() { echo "Error: $*" >&2; exit 1; }

# --- preconditions -----------------------------------------------------------

WORKSPACE=".speccraft"
MILESTONES_FILE="$WORKSPACE/milestones.md"
MILESTONES_DIR="$WORKSPACE/milestones"
PROGRESS_FILE="$WORKSPACE/progress.md"
RUNS_DIR="$WORKSPACE/.runs"
PROJECT_DIR="$(pwd -P)"
SKILL_FILE="$(cd "$(dirname "$0")/.." && pwd -P)/SKILL.md"
case "$SKILL_FILE" in "$PROJECT_DIR"/*) SKILL_FILE="${SKILL_FILE#"$PROJECT_DIR"/}" ;; esac

git rev-parse --is-inside-work-tree >/dev/null 2>&1 \
  || die "Not a git repository. Run: git init && git add -A && git commit -m 'Initial commit'"
START_HEAD="$(git rev-parse HEAD 2>/dev/null)" \
  || die "The repository has no commits. Run: git add -A && git commit -m 'Initial commit'"

# Run logs must never be committed by the agent.
EXCLUDE_FILE="$(git rev-parse --git-path info/exclude)"
mkdir -p "$(dirname "$EXCLUDE_FILE")"
grep -qx "$RUNS_DIR/" "$EXCLUDE_FILE" 2>/dev/null || echo "$RUNS_DIR/" >> "$EXCLUDE_FILE"

if [ -n "$(git status --porcelain)" ]; then
  if [ "$STASH_DIRTY" = 1 ]; then
    git stash push -u -q -m "run-milestone: uncommitted changes before run" || die "git stash failed."
    log "Stashed uncommitted changes (git stash list)."
  else
    die "Working tree has uncommitted changes. Commit them or use --stash-dirty."
  fi
fi

# Start from the milestone branch. Milestone files may exist only there, so switch
# before reading them when the current branch is not a milestone branch.
case "$(git branch --show-current)" in
  milestone/*) ;;
  *)
    CANDIDATES="$(git for-each-ref --format='%(refname:short)' 'refs/heads/milestone/*')"
    case "$(printf '%s\n' "$CANDIDATES" | grep -c .)" in
      0) ;;
      1) git switch -q "$CANDIDATES" || die "Cannot switch to $CANDIDATES."; log "Switched to $CANDIDATES." ;;
      *) die "Several milestone branches exist; switch to the active one first: $(echo $CANDIDATES)" ;;
    esac
    ;;
esac


[ -f "$MILESTONES_FILE" ] || die "$MILESTONES_FILE not found. Run from the project root after 07-planning-milestones."
first_dir() {
  for d in "$@"; do
    [ -d "$d" ] && { echo "${d%/}"; return; }
  done
}
milestone_with_status() { sed -n "s/^## \[$1\] \(M[0-9][0-9]\) - .*/\1/p" "$MILESTONES_FILE" | head -1; }

ACTIVE="$(milestone_with_status '>')"
if [ -z "$ACTIVE" ]; then
  REVIEW="$(milestone_with_status '?')"
  [ -n "$REVIEW" ] && die "Milestone $REVIEW is waiting for your review ($MILESTONES_DIR/$REVIEW-*/milestone-report.md). Accept it or request changes with 08-planning-tasks, then plan the next milestone."
  die "No active milestone. Run 08-planning-tasks to plan the next milestone, then 09-planning-task-details."
fi
ACTIVE_NAME="$(sed -n "s/^## \[.\] $ACTIVE - //p" "$MILESTONES_FILE" | head -1)"
MILESTONE_DIR="$(first_dir "$MILESTONES_DIR/$ACTIVE"-*/)"
[ -n "$MILESTONE_DIR" ] || die "Milestone $ACTIVE has no folder in $MILESTONES_DIR/. Run 08-planning-tasks."
TASKS_FILE="$MILESTONE_DIR/tasks.md"
[ -f "$TASKS_FILE" ] || die "$TASKS_FILE not found. Run 08-planning-tasks."

MILESTONE_BRANCH="milestone/$(basename "$MILESTONE_DIR")"
if [ "$(git branch --show-current)" != "$MILESTONE_BRANCH" ]; then
  if git show-ref --verify -q "refs/heads/$MILESTONE_BRANCH"; then
    git switch -q "$MILESTONE_BRANCH" || die "Cannot switch to $MILESTONE_BRANCH."
  else
    git switch -q -c "$MILESTONE_BRANCH" || die "Cannot create $MILESTONE_BRANCH."
    log "Created branch $MILESTONE_BRANCH."
  fi
fi
START_HEAD="$(git rev-parse HEAD)"

case "$PARALLEL" in ''|*[!0-9]*|0) die "--parallel needs a positive number." ;; esac

case "$AGENT" in
  claude|codex|gemini) command -v "$AGENT" >/dev/null 2>&1 || die "'$AGENT' CLI not found in PATH." ;;
  antigravity) command -v agy >/dev/null 2>&1 || die "'agy' (Antigravity CLI) not found in PATH." ;;
  custom) [ -n "$AGENT_CMD" ] || die "--agent custom requires --agent-cmd." ;;
  *) die "Unknown agent '$AGENT'. Use claude, codex, antigravity, gemini or custom." ;;
esac

TIMEOUT_BIN=""
if [ "$TASK_TIMEOUT" -gt 0 ]; then
  TIMEOUT_BIN="$(command -v timeout || command -v gtimeout || true)"
  [ -n "$TIMEOUT_BIN" ] || log "Warning: timeout/gtimeout not found, steps run without a time limit."
fi

mkdir -p "$RUNS_DIR"
mkdir "$RUNS_DIR/lock" 2>/dev/null \
  || die "Another run is in progress ($RUNS_DIR/lock exists). Remove it if no run is active."

RUN_ID="$(date +%Y-%m-%d-%H%M%S)"
RUN_DIR="$RUNS_DIR/$ACTIVE-$RUN_ID"
mkdir -p "$RUN_DIR"
cp "$TASKS_FILE" "$RUN_DIR/tasks.start.md"
rm -f "$RUNS_DIR/STOP"
START_TS="$(date +%s)"
STOP_REASON="unknown"
ITERATION=0
SUMMARY_WRITTEN=0

# --- helpers -----------------------------------------------------------------

# Task lines of the active milestone.
milestone_tasks() { grep '^\[.\] [0-9][0-9][0-9] - ' "$TASKS_FILE" || true; }
count_status() { milestone_tasks | grep -c "^\[$1\] " || true; }
task_numbers() { milestone_tasks | sed -n "s/^\[$1\] \([0-9][0-9][0-9]\) - .*/\1/p"; }
task_name() { grep "^\[.\] $1 - " "$TASKS_FILE" | head -1 | awk -F' - ' '{print $2}'; }
task_dir() { first_dir "$MILESTONE_DIR/$1"-*/; }
# The agent must end every step on the milestone branch. If it did not (crash,
# timeout, unfinished merge), keep its work on the branch it left and go back.
park_and_return() {
  local cur
  git merge --abort >/dev/null 2>&1 || true
  cur="$(git branch --show-current)"
  [ "$cur" = "$MILESTONE_BRANCH" ] && return
  [ -n "$cur" ] || { cur="attic/detached-$RUN_ID-$ITERATION"; git switch -q -c "$cur"; }
  if [ -n "$(git status --porcelain)" ]; then
    git add -A && git commit -q -m "wip: leftovers of iteration $ITERATION ($RUN_ID)" \
      && log "Committed leftovers on $cur."
  fi
  git switch -q "$MILESTONE_BRANCH" && log "Agent ended on $cur; switched back to $MILESTONE_BRANCH (branch kept)."
}
milestone_status() { sed -n "s/^## \[\(.\)\] $ACTIVE - .*/\1/p" "$MILESTONES_FILE" | head -1; }
state_checksum() { cat "$TASKS_FILE" "$MILESTONES_FILE" | cksum; }
# Tasks of the milestone that reached a status during this run.
finished_in_run() {
  for num in $(task_numbers "$1"); do
    grep -q "^\[$1\] $num - " "$RUN_DIR/tasks.start.md" || echo "$num"
  done
}
section() { awk -v h="## $2" '$0 == h {f=1; next} /^## / {f=0} f' "$1"; }

run_agent() {
  local prompt="$1"
  local cmd
  case "$AGENT" in
    claude) set -- claude -p "$prompt" --dangerously-skip-permissions ;;
    codex)  set -- codex exec --full-auto -c sandbox_workspace_write.network_access=true "$prompt" ;;
    antigravity) set -- agy -p "$prompt" --dangerously-skip-permissions ;;
    gemini) set -- gemini --yolo -p "$prompt" ;;
    custom) cmd="$AGENT_CMD \"\$1\""; set -- sh -c "$cmd" run-milestone "$prompt" ;;
  esac
  if [ -n "$TIMEOUT_BIN" ]; then
    "$TIMEOUT_BIN" --kill-after=60 "$TASK_TIMEOUT" "$@" </dev/null
  else
    "$@" </dev/null
  fi
}

write_summary() {
  [ "$SUMMARY_WRITTEN" = 1 ] && return
  SUMMARY_WRITTEN=1
  park_and_return
  local mdir summary elapsed total done blocked pending review status next num dir items text
  mdir="$MILESTONE_DIR"
  summary="$mdir/run-summary-$RUN_ID.md"
  elapsed=$(( ($(date +%s) - START_TS) / 60 ))
  total=$(milestone_tasks | wc -l | tr -d ' ')
  done=$(count_status x)
  blocked=$(count_status !)
  pending=$(count_status ' ')
  review=$(count_status '~')
  status=$(milestone_status)
  next=$(milestone_tasks | grep -m1 "^\[ \] " | awk -F' - ' '{print $1 " - " $2}' | sed 's/^\[ \] //')

  {
    echo "# Run summary $ACTIVE / $RUN_ID"
    echo
    echo "- **Milestone:** $ACTIVE - $ACTIVE_NAME, status \`[$status]\`"
    echo "- **Branch:** \`$MILESTONE_BRANCH\`"
    echo "- **Agent:** $AGENT"
    echo "- **Duration:** ${elapsed} min, $ITERATION iteration(s)"
    echo "- **Stop reason:** $STOP_REASON"
    echo "- **Milestone progress:** $done / $total done, $review in review, $blocked blocked, $pending pending"
    echo "- **Next pending task:** ${next:-none}"
    echo "- **Logs:** \`$RUN_DIR/\`"
    if [ "$status" = "?" ]; then
      echo "- **Milestone report:** \`$mdir/milestone-report.md\`"
    fi
    echo
    echo "## Completed in this run"
    echo
    text=""
    for num in $(finished_in_run x); do text="$text- $num - $(task_name "$num")
"; done
    printf '%s' "${text:-- none
}"
    echo
    echo "## Blocked"
    echo
    text=""
    for num in $(task_numbers !); do
      dir=$(task_dir "$num")
      text="$text### $num - $(task_name "$num")

"
      if [ -n "$dir" ] && [ -f "$dir/blocker.md" ]; then
        text="$text$(section "$dir/blocker.md" "What is needed")

See \`$dir/blocker.md\`.

"
      fi
    done
    printf '%s' "${text:-- none
}"
    echo
    echo "## Assumptions to review"
    echo
    text=""
    for num in $(finished_in_run x); do
      dir=$(task_dir "$num")
      [ -n "$dir" ] && [ -f "$dir/report.md" ] || continue
      items=$(section "$dir/report.md" "Assumptions" | grep -v '^[[:space:]]*$' | grep -iv '^- none' || true)
      [ -n "$items" ] && text="$text**$num**
$items

"
    done
    printf '%s' "${text:-- none
}"
    echo
    echo "## Commits"
    echo
    echo '```text'
    git log --oneline "$START_HEAD"..HEAD 2>/dev/null
    echo '```'
    echo
    echo "## Next steps for the operator"
    echo
    if [ "$status" = "?" ]; then
      echo "- review the milestone using \`$mdir/milestone-report.md\` (demo steps, exit criteria)"
      echo "- accept: tell 08-planning-tasks \"accept $ACTIVE\"; it plans the next milestone"
      echo "- or request changes: write feedback in the report and run 08-planning-tasks"
    else
      echo "- resolve blocked tasks and change \`[!]\` back to \`[ ]\`; partial work is on the \`task/NNN-*\` branches"
      echo "- then start the run again to finish milestone $ACTIVE"
    fi
    echo "- review the code: \`git log --oneline --first-parent $MILESTONE_BRANCH\` (one merge per task), \`git diff $(git rev-parse --short "$START_HEAD")..HEAD --stat\` (this run)"
  } > "$summary"

  git add "$summary" >/dev/null 2>&1 && git commit -q -m "docs($ACTIVE): add run summary $RUN_ID" >/dev/null 2>&1
  log "Summary: $summary"
}

cleanup() {
  [ "$PARALLEL" -gt 1 ] && stop_parallel
  write_summary
  rmdir "$RUNS_DIR/lock" 2>/dev/null
}
trap cleanup EXIT
trap 'STOP_REASON="interrupted"; exit 130' INT TERM

# --- main loop ---------------------------------------------------------------

PROMPT="AUTONOMOUS MODE - unattended run $RUN_ID. Nobody will answer questions or approve anything.
Read the skill instructions in $SKILL_FILE and follow them in autonomous mode.
The active milestone is $ACTIVE - $ACTIVE_NAME. Work only within this milestone.
Your working directory is the repository root. The product lives directly in the repository root, laid out as defined in $WORKSPACE/docs/05-Tech-Stack.md. Keep workflow documents, reports and progress in $WORKSPACE/ and never put product code there. Do not modify .agents/ or .claude/.
Follow the Git workflow of the skill: you are on $MILESTONE_BRANCH; do the task on its own task/NNN-slug branch, merge it into $MILESTONE_BRANCH after verification, and end the step on $MILESTONE_BRANCH. Never push and never merge into the base branch.
Execute exactly ONE step: if a task in $TASKS_FILE is [~], review it as the independent reviewer; otherwise implement the next eligible task of $ACTIVE up to [~] (ready for review); or run the milestone completion if all its tasks are [x]. Then stop.
You start with a fresh context: orient using $MILESTONES_FILE, $TASKS_FILE and $PROGRESS_FILE as described in the skill.
If no step is possible (milestone blocked, broken environment), write the reason to $RUNS_DIR/STOP and stop without changing statuses."

MILESTONE_TASKS=$(milestone_tasks | wc -l | tr -d ' ')
MAX_ITERATIONS=$(( MILESTONE_TASKS * 4 + 5 ))   # implement + review, plus fix rounds
RETRIES=0


# --- parallel mode -----------------------------------------------------------
# Main lane (this worktree, one agent at a time): reviews, merges, "exclusive"
# tasks and the milestone completion. Worker lanes (one git worktree each, up to
# --parallel N): implementation of "Parallel: safe" tasks. Workers never touch
# the milestone branch; this script records their outcome there.

WORKERS_DIR="$RUN_DIR/workers"
MAIN_PID=""
MAIN_BEFORE=""
MAIN_LOG=""
STOPPING=""
HOLD_UNTIL=0
WT_ROOT=""

# Interruptible pause: signals are handled at once instead of after the sleep.
nap() { sleep "$1" & wait $! 2>/dev/null; }
kill_tree() {
  local c
  for c in $(pgrep -P "$1" 2>/dev/null); do kill_tree "$c"; done
  kill -TERM "$1" 2>/dev/null
}
plan_file() {
  local d
  d="$(task_dir "$1")"
  [ -n "$d" ] && [ -f "$d/implementation-plan.md" ] && echo "$d/implementation-plan.md"
}
plan_deps() {
  local f
  f="$(plan_file "$1")" || return 0
  sed -n 's/^- \*\*Depends on:\*\*//p' "$f" | head -1 | grep -oE '[0-9]{3}' || true
}
plan_files() {
  local f
  f="$(plan_file "$1")" || return 0
  awk '/^## 6\. Files/ {f=1; next} /^## / {f=0} f' "$f" \
    | sed -n 's/^| *`\([^`]*\)`.*/\1/p' | sed 's/[*{].*$//' | grep . || true
}
# Parallel-safe only when the plan says so and lists its files.
plan_is_safe() {
  local f
  f="$(plan_file "$1")" || return 1
  grep -qiE '^- \*\*Parallel:\*\* *`?safe' "$f" || return 1
  [ -n "$(plan_files "$1")" ]
}
# Dependencies inside this milestone must be [x]; earlier milestones are accepted.
deps_done() {
  local d
  for d in $(plan_deps "$1"); do
    [ "$d" = "$1" ] && continue
    if grep -q "^\[.\] $d - " "$TASKS_FILE"; then
      grep -q "^\[x\] $d - " "$TASKS_FILE" || return 1
    fi
  done
  return 0
}
paths_overlap() {
  local a b
  while read -r a; do
    [ -n "$a" ] || continue
    while read -r b; do
      [ -n "$b" ] || continue
      case "$a" in "$b"*) return 0 ;; esac
      case "$b" in "$a"*) return 0 ;; esac
    done < "$2"
  done < "$1"
  return 1
}
running_workers() {
  local w
  for w in "$WORKERS_DIR"/[0-9][0-9][0-9]; do
    [ -f "$w" ] && [ ! -f "$w.fin" ] && basename "$w"
  done
  return 0
}
finished_workers() {
  local w
  for w in "$WORKERS_DIR"/[0-9][0-9][0-9]; do
    [ -f "$w.fin" ] && basename "$w"
  done
  return 0
}
free_slot() {
  local i w used
  for i in $(seq 1 "$PARALLEL"); do
    used=""
    for w in $(running_workers) $(finished_workers); do
      [ "$(awk '{print $4}' "$WORKERS_DIR/$w")" = "$i" ] && used=1
    done
    [ -z "$used" ] && { echo "$i"; return; }
  done
}
fails_of() { cat "$WORKERS_DIR/$1.fails" 2>/dev/null || echo 0; }
set_status() {
  sed "s/^\[.\] $1 - /[$2] $1 - /" "$TASKS_FILE" > "$TASKS_FILE.tmp" && mv "$TASKS_FILE.tmp" "$TASKS_FILE"
}

# Commit what a worker left on its task branch, then remove its worktree.
release_worktree() {
  local wt="$1" n="$2"
  [ -n "$wt" ] && [ -d "$wt" ] || { git worktree prune; return 0; }
  (
    cd "$wt" || exit 0
    git merge --abort >/dev/null 2>&1 || true
    # Workflow state belongs to the milestone branch, never to a task branch.
    base="$(git merge-base HEAD "$MILESTONE_BRANCH" 2>/dev/null)"
    if [ -n "$base" ]; then
      for f in "$TASKS_FILE" "$MILESTONES_FILE" "$PROGRESS_FILE"; do
        git diff --quiet "$base" HEAD -- "$f" 2>/dev/null || git checkout -q "$base" -- "$f" 2>/dev/null
      done
    fi
    if [ -n "$(git status --porcelain)" ]; then
      git add -A && git commit -q -m "wip(task-$n): leftovers and restored workflow files ($RUN_ID)"
    fi
  )
  git worktree remove --force "$wt" 2>/dev/null \
    || log "Warning: could not remove worktree $wt; remove it manually and run 'git worktree prune'."
}

start_worker() {
  local n="$1" slot="$2" name branch wt prompt env_file
  name="$(basename "$(task_dir "$n")")"
  branch="task/$name"
  wt="$WT_ROOT/$name"
  [ -d "$wt" ] && release_worktree "$wt" "$n"
  git worktree prune
  if git show-ref --verify -q "refs/heads/$branch"; then
    git worktree add -q "$wt" "$branch" || { log "Cannot create a worktree for $branch."; return 1; }
  else
    git worktree add -q -b "$branch" "$wt" "$MILESTONE_BRANCH" || { log "Cannot create a worktree for task $n."; return 1; }
  fi
  # Local, git-ignored configuration the product needs to run.
  for env_file in .env .env.local .env.development.local .env.test.local; do
    [ -f "$env_file" ] && cp "$env_file" "$wt/$env_file"
  done
  mkdir -p "$wt/$RUNS_DIR"
  ITERATION=$((ITERATION + 1))
  prompt="AUTONOMOUS MODE - PARALLEL WORKTREE MODE - unattended run $RUN_ID, slot $slot. Nobody will answer questions or approve anything.
Read the skill instructions in $SKILL_FILE and follow section \"Parallel worktree mode\" together with the task execution cycle.
Your working directory is a separate git worktree, already on branch $branch (created from $MILESTONE_BRANCH). Implement ONLY task $n - $(task_name "$n") of milestone $ACTIVE.
Do not switch branches, do not merge into $MILESTONE_BRANCH, and do not change $TASKS_FILE, $MILESTONES_FILE or $PROGRESS_FILE.
Other agents work on other tasks at the same time. Use the isolation for slot SPECCRAFT_SLOT=$slot described in $PROGRESS_FILE (ports, databases).
When finished, commit everything on $branch and write one word to $RUNS_DIR/RESULT in this worktree: done (verified, report.md written) or blocked (blocker.md written).
On an environment problem, write the reason to $RUNS_DIR/STOP in this worktree and stop."
  (
    cd "$wt" || exit 1
    export SPECCRAFT_SLOT="$slot" SPECCRAFT_PARALLEL=1
    run_agent "$prompt"
  ) > "$RUN_DIR/task-$n-$(printf '%03d' "$ITERATION").log" 2>&1 &
  echo "$! $wt $branch $slot" > "$WORKERS_DIR/$n"
  log "Worker $slot: implement $n - $(task_name "$n") in $wt"
}

# Record a finished worker on the milestone branch (only while the main lane is idle).
finalize_worker() {
  local n="$1" pid wt branch slot result tdir
  read -r pid wt branch slot < "$WORKERS_DIR/$n"
  result="$(head -1 "$wt/$RUNS_DIR/RESULT" 2>/dev/null | tr -d '[:space:]')"
  [ -f "$wt/$RUNS_DIR/STOP" ] && cp "$wt/$RUNS_DIR/STOP" "$RUNS_DIR/STOP"
  release_worktree "$wt" "$n"
  tdir="$(task_dir "$n")"
  case "$result" in
    done)
      set_status "$n" '~'
      git add -A "$WORKSPACE" && git commit -q -m "chore(task-$n): ready for review"
      log "Worker $slot: task $n ready for review."
      ;;
    blocked)
      git show "$branch:$tdir/blocker.md" > "$RUN_DIR/blocker.tmp" 2>/dev/null \
        && mv "$RUN_DIR/blocker.tmp" "$tdir/blocker.md"
      set_status "$n" '!'
      [ -f "$PROGRESS_FILE" ] \
        && echo "- [$n] [!] $(date +%Y-%m-%d) — blocked in parallel run $RUN_ID, see $tdir/blocker.md" >> "$PROGRESS_FILE"
      git add -A "$WORKSPACE" && git commit -q -m "chore(task-$n): mark as blocked"
      log "Worker $slot: task $n blocked."
      ;;
    *)
      echo $(( $(fails_of "$n") + 1 )) > "$WORKERS_DIR/$n.fails"
      HOLD_UNTIL=$(( $(date +%s) + RETRY_WAIT ))
      log "Worker $slot: task $n ended without a result (attempt $(fails_of "$n")/$MAX_RETRIES), see $RUN_DIR/task-$n-*.log"
      ;;
  esac
  mkdir -p "$WORKERS_DIR/done"
  mv "$WORKERS_DIR/$n" "$WORKERS_DIR/done/$n-$ITERATION"
  [ -f "$WORKERS_DIR/$n.fin" ] && mv "$WORKERS_DIR/$n.fin" "$WORKERS_DIR/done/$n-$ITERATION.fin"
  return 0
}

start_main() {
  local what="$1"
  if [ -n "$(git status --porcelain)" ]; then
    git stash push -u -q -m "run-milestone $RUN_ID: leftovers before main step" && log "Stashed leftovers."
  fi
  ITERATION=$((ITERATION + 1))
  MAIN_LOG="$RUN_DIR/main-$(printf '%03d' "$ITERATION").log"
  MAIN_BEFORE="$(state_checksum)"
  log "Main: $what"
  ( run_agent "$PROMPT
Parallel run: other tasks are being implemented in separate worktrees at the same time; ignore them. The scheduler chose this step for you: $what. Do only this step." ) > "$MAIN_LOG" 2>&1 &
  MAIN_PID=$!
}

reap() {
  local n pid rc
  if [ -n "$MAIN_PID" ] && ! kill -0 "$MAIN_PID" 2>/dev/null; then
    wait "$MAIN_PID"; rc=$?
    MAIN_PID=""
    park_and_return
    if [ "$(state_checksum)" != "$MAIN_BEFORE" ]; then
      RETRIES=0
      if [ -n "$(git status --porcelain)" ]; then
        git add -A && git commit -q -m "chore: commit leftovers of main step $ITERATION ($RUN_ID)"
      fi
      log "Main step finished (exit $rc). $ACTIVE: done $(count_status x), in review $(count_status '~'), blocked $(count_status !), pending $(count_status ' ')."
    else
      RETRIES=$((RETRIES + 1))
      HOLD_UNTIL=$(( $(date +%s) + RETRY_WAIT ))
      log "Main step made no progress (exit $rc), attempt $RETRIES/$MAX_RETRIES. See $MAIN_LOG"
      [ "$RETRIES" -ge "$MAX_RETRIES" ] && [ -z "$STOPPING" ] && STOPPING="no progress after $MAX_RETRIES attempts (see $MAIN_LOG)"
    fi
  fi
  for n in $(running_workers); do
    pid="$(awk '{print $1}' "$WORKERS_DIR/$n")"
    if ! kill -0 "$pid" 2>/dev/null; then
      wait "$pid" 2>/dev/null
      touch "$WORKERS_DIR/$n.fin"
    fi
  done
  return 0
}

# First task (in list order) that may be implemented now, and its lane.
next_implementation() {
  local n running r
  running="$(running_workers)"
  for n in $(task_numbers ' '); do
    case " $(echo $running) " in *" $n "*) continue ;; esac
    [ "$(fails_of "$n")" -ge "$MAX_RETRIES" ] && continue
    deps_done "$n" || continue
    if ! plan_is_safe "$n"; then
      echo "exclusive $n"; return
    fi
    plan_files "$n" > "$RUN_DIR/files-a"
    # Wait for overlapping tasks until they are merged, not only implemented.
    for r in $running $(finished_workers) $(task_numbers '~'); do
      plan_files "$r" > "$RUN_DIR/files-b"
      paths_overlap "$RUN_DIR/files-a" "$RUN_DIR/files-b" && continue 2
    done
    echo "safe $n"; return
  done
}

impl_budget_left() {
  [ "$MAX_TASKS" -eq 0 ] && return 0
  local finished inflight
  finished=$(( $(finished_in_run x | wc -l) + $(finished_in_run ! | wc -l) ))
  inflight=$(( $(running_workers | wc -l) + $(count_status '~') ))
  [ $(( finished + inflight )) -lt "$MAX_TASKS" ]
}

stop_parallel() {
  local n pid
  [ -d "$WORKERS_DIR" ] || return 0
  [ -n "$MAIN_PID" ] && kill_tree "$MAIN_PID"
  for n in $(running_workers); do
    pid="$(awk '{print $1}' "$WORKERS_DIR/$n")"
    kill_tree "$pid"
  done
  sleep 1
  MAIN_PID=""
  park_and_return
  for n in $(running_workers) $(finished_workers); do finalize_worker "$n"; done
  return 0
}

run_parallel() {
  local pick lane n slot n_review
  WT_ROOT="${WORKTREES_DIR:-${TMPDIR:-/tmp}/speccraft-worktrees/$(basename "$PROJECT_DIR")-$RUN_ID}"
  WT_ROOT="${WT_ROOT%/}"
  mkdir -p "$WT_ROOT" "$WORKERS_DIR"
  case "$(cd "$WT_ROOT" && pwd -P)/" in
    "$PROJECT_DIR"/*) die "--worktrees-dir must be outside the repository." ;;
  esac
  git worktree prune
  log "Parallel mode: up to $PARALLEL workers, worktrees in $WT_ROOT"

  while true; do
    reap
    if [ -z "$MAIN_PID" ]; then
      for n in $(finished_workers); do finalize_worker "$n"; done
    fi
    [ -f "$RUNS_DIR/STOP" ] && [ -z "$STOPPING" ] && STOPPING="agent stopped: $(head -c 500 "$RUNS_DIR/STOP")"
    case "$(milestone_status)" in
      '?') [ -z "$STOPPING" ] && STOPPING="milestone $ACTIVE ready for review" ;;
      '>') ;;
      *) [ -z "$STOPPING" ] && STOPPING="milestone $ACTIVE is no longer active" ;;
    esac
    [ "$ITERATION" -ge "$MAX_ITERATIONS" ] && [ -z "$STOPPING" ] && STOPPING="iteration limit ($MAX_ITERATIONS) reached"

    if [ -n "$STOPPING" ]; then
      # Let running agents finish; start nothing new.
      if [ -z "$MAIN_PID" ] && [ -z "$(running_workers)" ] && [ -z "$(finished_workers)" ]; then
        STOP_REASON="$STOPPING"; break
      fi
      nap "$POLL"; continue
    fi

    if [ "$(date +%s)" -lt "$HOLD_UNTIL" ]; then nap "$POLL"; continue; fi

    pick="$(next_implementation)"; lane="${pick%% *}"; n="${pick#* }"

    # Main lane: reviews first, then the milestone completion, then an exclusive task.
    if [ -z "$MAIN_PID" ] && [ -z "$(finished_workers)" ]; then
      n_review="$(task_numbers '~' | head -1)"
      if [ -n "$n_review" ]; then
        start_main "review task $n_review (independent review; merge it if approved)"
      elif [ -z "$(running_workers)" ] && [ "$(count_status x)" = "$(milestone_tasks | wc -l | tr -d ' ')" ]; then
        start_main "milestone completion"
      elif [ "$lane" = "exclusive" ] && [ -z "$(running_workers)" ] && impl_budget_left; then
        start_main "implement task $n (exclusive: not parallel-safe)"
        lane=""
      fi
    fi

    # Worker lanes: parallel-safe tasks, unless an exclusive task is next in line.
    while [ "$lane" = "safe" ] && [ "$(running_workers | wc -l)" -lt "$PARALLEL" ] \
          && impl_budget_left && [ "$ITERATION" -lt "$MAX_ITERATIONS" ]; do
      slot="$(free_slot)"; [ -n "$slot" ] || break
      start_worker "$n" "$slot" || echo "$MAX_RETRIES" > "$WORKERS_DIR/$n.fails"
      pick="$(next_implementation)"; lane="${pick%% *}"; n="${pick#* }"
    done

    if [ -z "$MAIN_PID" ] && [ -z "$(running_workers)" ] && [ -z "$(finished_workers)" ] \
       && [ "$(milestone_status)" = ">" ] && [ -z "$(task_numbers '~')" ]; then
      STOP_REASON="no runnable step: milestone blocked or tasks failed repeatedly (pending: $(echo $(task_numbers ' ')); blocked: $(echo $(task_numbers '!')))"
      break
    fi
    nap "$POLL"
  done
}

if [ "$PARALLEL" -gt 1 ]; then
  log "Run $RUN_ID started: milestone $ACTIVE - $ACTIVE_NAME, agent=$AGENT, $(count_status ' ') pending task(s), parallel=$PARALLEL."
  run_parallel
  log "Run finished: $STOP_REASON"
  exit 0
fi

log "Run $RUN_ID started: milestone $ACTIVE - $ACTIVE_NAME, agent=$AGENT, $(count_status ' ') pending task(s)."

while true; do
  STATUS="$(milestone_status)"
  if [ "$STATUS" = "?" ]; then
    STOP_REASON="milestone $ACTIVE ready for review"; break
  elif [ "$STATUS" != ">" ]; then
    STOP_REASON="milestone $ACTIVE is no longer active (status [$STATUS])"; break
  fi
  FINISHED=$(( $(finished_in_run x | wc -l) + $(finished_in_run ! | wc -l) ))
  if [ "$MAX_TASKS" -gt 0 ] && [ "$FINISHED" -ge "$MAX_TASKS" ]; then
    STOP_REASON="--max-tasks $MAX_TASKS reached"; break
  fi
  if [ "$ITERATION" -ge "$MAX_ITERATIONS" ]; then
    STOP_REASON="iteration limit ($MAX_ITERATIONS) reached"; break
  fi

  # Leftovers of an interrupted iteration: keep them in the stash, start clean.
  if [ -n "$(git status --porcelain)" ]; then
    git stash push -u -q -m "run-milestone $RUN_ID: leftovers before iteration $((ITERATION + 1))" \
      && log "Stashed leftovers of the previous iteration."
  fi

  ITERATION=$((ITERATION + 1))
  ITER_LOG="$RUN_DIR/iteration-$(printf '%03d' "$ITERATION").log"
  BEFORE="$(state_checksum)"
  REVIEW_NEXT="$(milestone_tasks | grep -m1 '^\[~\] ' | cut -c5-80)"
  NEXT="$(milestone_tasks | grep -m1 '^\[ \] ' | cut -c5-80)"
  if [ -n "$REVIEW_NEXT" ]; then
    log "Iteration $ITERATION: review $REVIEW_NEXT..."
  elif [ -n "$NEXT" ]; then
    log "Iteration $ITERATION: implement $NEXT..."
  else
    log "Iteration $ITERATION: no pending task, milestone completion or blocked"
  fi

  run_agent "$PROMPT" 2>&1 | tee "$ITER_LOG"
  RC=${PIPESTATUS[0]}
  park_and_return

  if [ "$(state_checksum)" != "$BEFORE" ]; then
    RETRIES=0
    if [ -n "$(git status --porcelain)" ]; then
      git add -A && git commit -q -m "chore: commit leftovers of iteration $ITERATION ($RUN_ID)" \
        && log "Agent left uncommitted changes; committed them."
    fi
    log "Iteration $ITERATION finished (exit $RC). $ACTIVE: done $(count_status x), in review $(count_status '~'), blocked $(count_status !), pending $(count_status ' ')."
  fi

  if [ -f "$RUNS_DIR/STOP" ]; then
    STOP_REASON="agent stopped: $(head -c 500 "$RUNS_DIR/STOP")"; break
  fi

  if [ "$(state_checksum)" = "$BEFORE" ]; then
    RETRIES=$((RETRIES + 1))
    log "Iteration $ITERATION made no progress (exit $RC), attempt $RETRIES/$MAX_RETRIES. See $ITER_LOG"
    if [ "$RETRIES" -ge "$MAX_RETRIES" ]; then
      STOP_REASON="no progress after $MAX_RETRIES attempts (last exit code $RC, see $ITER_LOG)"; break
    fi
    sleep "$RETRY_WAIT"
  fi
done

log "Run finished: $STOP_REASON"
