#!/usr/bin/env bash
# SpecCraft autopilot: runs the workflow unattended, from the brief to a built
# milestone, one step per fresh agent process. Run from the repository root.
# Settings: .speccraft/autopilot.md. Guide: .speccraft/Readme.md -> "Autopilot".

set -uo pipefail

usage() {
  cat <<'EOF'
Usage: .agents/skills/00-next/scripts/autopilot.sh ["brief"] [options]

Runs the SpecCraft workflow on its own. Every step is one skill, executed by a
new agent process with a fresh context:

  01 idea from your brief -> 02 roast rounds (fixes applied) -> 03 PRD
  -> 04 design -> 05 interface -> 06 tech stack -> 07 roadmap
  -> 08 milestone tasks -> 09 implementation plans
  -> build (run-milestone.sh: implement, independent review, merge per task)
  -> milestone waits for your review

The autopilot decides from the files in .speccraft/ which step comes next, so it
continues from wherever the project is: start it on an empty project, or after
steps you ran yourself. It commits the workflow files after every step and never
pushes. It never accepts a milestone on its own; pass --accept after your review.

Brief:
  "text"                the product idea in your own words (same as --brief)
  --brief TEXT          saved to .speccraft/autopilot.md -> Brief
  --brief-file FILE     read the brief from a file

Where to stop (default from .speccraft/autopilot.md, else milestone):
  --stop-at spec        when the specification and the roadmap are ready
  --stop-at plan        when the next milestone is planned, before any code
  --stop-at milestone   when the next milestone is built and waits for review
  --max-steps N         after N steps (1 = run only the next step)

Workflow:
  --feature TEXT        a feature or bug fix for the existing product: runs
                        12-feature-advisor (spec update and a new milestone),
                        then continues with the normal loop
  --changes TEXT        your feedback on the milestone waiting for review: it
                        gets rework tasks and is built again
  --roast-rounds N      maximum roast rounds before the PRD (default from
                        .speccraft/autopilot.md, else 3; 0 = skip the roast)
  --accept Mnn          your acceptance of milestone Mnn, which waits for review:
                        the autopilot accepts it, merges it and continues with
                        the next milestone
  --dry-run             show the status and the next step; run nothing

Agent and limits (also passed to run-milestone.sh for the build):
  --agent NAME          claude (default), codex, antigravity, gemini, or custom
                        (default from .speccraft/autopilot.md -> Agent)
  --model NAME          model for the agent, e.g. opus or sonnet for claude
                        (default from .speccraft/autopilot.md -> Model, else
                        the agent's own default)
  --agent-cmd CMD       command for --agent custom; the prompt is appended as
                        the last argument
  --timeout SEC         time limit per step (default 5400; 0 = none; needs
                        timeout or gtimeout, e.g. brew install coreutils)
  --max-retries N       attempts without progress before giving up (default 3)
  --retry-wait SEC      pause between attempts without progress (default 300)
  --no-caffeinate       do not keep macOS awake

Build only (passed to run-milestone.sh):
  --parallel N          implement up to N independent tasks at once
  --max-tasks N         stop the build after N tasks
  --worktrees-dir DIR   where parallel worktrees are created

  -h, --help            show this help

Examples:
  autopilot.sh "A mobile-first app for climbing gyms to log routes and ..."
  autopilot.sh --stop-at spec            # only the specification, then review it
  autopilot.sh                           # continue from the current state
  autopilot.sh --accept M01 --parallel 3 # accept M01, build M02
  autopilot.sh --dry-run                 # status and next step
EOF
}

# Keep macOS awake for the whole run (re-exec under caffeinate once).
for arg in "$@"; do [ "$arg" = "--no-caffeinate" ] && SPECCRAFT_CAFFEINATED=1; done
if [ -z "${SPECCRAFT_CAFFEINATED:-}" ] && command -v caffeinate >/dev/null 2>&1; then
  export SPECCRAFT_CAFFEINATED=1
  exec caffeinate -is "$0" "$@"
fi

AGENT="${AGENT:-}"
AGENT_CMD="${AGENT_CMD:-}"
MODEL="${MODEL:-}"
FEATURE=""
CHANGES=""
STEP_TIMEOUT=5400
MAX_RETRIES=3
RETRY_WAIT=300
STOP_AT=""
ROAST_ROUNDS=""
ACCEPT=""
MAX_STEPS=0
DRY=0
BRIEF=""
BRIEF_FILE=""
BUILD_ARGS=()
MILESTONES_AT_START=""

need() { [ $# -ge 2 ] || { echo "Option $1 needs a value." >&2; exit 2; }; }
while [ $# -gt 0 ]; do
  case "$1" in
    --brief) need "$@"; BRIEF="$2"; shift 2 ;;
    --brief-file) need "$@"; BRIEF_FILE="$2"; shift 2 ;;
    --stop-at) need "$@"; STOP_AT="$2"; shift 2 ;;
    --roast-rounds) need "$@"; ROAST_ROUNDS="$2"; shift 2 ;;
    --accept) need "$@"; ACCEPT="$2"; shift 2 ;;
    --max-steps) need "$@"; MAX_STEPS="$2"; shift 2 ;;
    --dry-run|--status) DRY=1; shift ;;
    --agent) need "$@"; AGENT="$2"; shift 2 ;;
    --model) need "$@"; MODEL="$2"; shift 2 ;;
    --feature) need "$@"; FEATURE="$2"; shift 2 ;;
    --changes) need "$@"; CHANGES="$2"; shift 2 ;;
    --agent-cmd) need "$@"; AGENT="custom"; AGENT_CMD="$2"; BUILD_ARGS+=(--agent-cmd "$2"); shift 2 ;;
    --timeout) need "$@"; STEP_TIMEOUT="$2"; BUILD_ARGS+=(--timeout "$2"); shift 2 ;;
    --max-retries) need "$@"; MAX_RETRIES="$2"; BUILD_ARGS+=(--max-retries "$2"); shift 2 ;;
    --retry-wait) need "$@"; RETRY_WAIT="$2"; BUILD_ARGS+=(--retry-wait "$2"); shift 2 ;;
    --parallel|--max-tasks|--worktrees-dir) need "$@"; BUILD_ARGS+=("$1" "$2"); shift 2 ;;
    --no-caffeinate) shift ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
    *) [ -z "$BRIEF" ] || { echo "Only one brief can be given (quote it)." >&2; exit 2; }
       BRIEF="$1"; shift ;;
  esac
done

log() { local line; line="[$(date '+%Y-%m-%d %H:%M:%S')] $*"; echo "$line"; [ -n "${RUN_DIR:-}" ] && echo "$line" >> "$RUN_DIR/autopilot.log"; return 0; }
die() { echo "Error: $*" >&2; exit 1; }
nap() { sleep "$1" & wait $!; }

# --- paths and preconditions -------------------------------------------------

WORKSPACE=".speccraft"
AUTOPILOT_FILE="$WORKSPACE/autopilot.md"
DOCS="$WORKSPACE/docs"
MILESTONES_FILE="$WORKSPACE/milestones.md"
RUNS_DIR="$WORKSPACE/.runs"
PROJECT_DIR="$(pwd -P)"
SKILLS_DIR="$(cd "$(dirname "$0")/../.." && pwd -P)"
case "$SKILLS_DIR" in "$PROJECT_DIR"/*) SKILLS_DIR="${SKILLS_DIR#"$PROJECT_DIR"/}" ;; esac
RUN_MILESTONE="$SKILLS_DIR/10-execution-tasks/scripts/run-milestone.sh"
STATE_JS="$SKILLS_DIR/00-next/scripts/state.mjs"

[ -d "$WORKSPACE" ] || die "No $WORKSPACE/ here. Run the autopilot from the repository root."
[ -f "$RUN_MILESTONE" ] || die "$RUN_MILESTONE not found."
[ -f "$STATE_JS" ] || die "$STATE_JS not found."
command -v node >/dev/null 2>&1 || die "Node.js 18+ is required (the state engine $STATE_JS runs on it)."
git rev-parse --is-inside-work-tree >/dev/null 2>&1 \
  || die "Not a git repository. Run: git init && git add -A && git commit -m 'Initial commit'"
git rev-parse -q --verify HEAD >/dev/null \
  || die "The repository has no commits. Run: git add -A && git commit -m 'Initial commit'"

if [ -n "$BRIEF_FILE" ]; then
  [ -f "$BRIEF_FILE" ] || die "Brief file not found: $BRIEF_FILE"
  [ -z "$BRIEF" ] || die "Use either a brief text or --brief-file, not both."
  BRIEF="$(cat "$BRIEF_FILE")"
fi

for n in "$MAX_STEPS" "$STEP_TIMEOUT" "$MAX_RETRIES" "$RETRY_WAIT"; do
  case "$n" in ''|*[!0-9]*) die "Numeric option expected, got '$n'." ;; esac
done
case "$ACCEPT" in ''|M[0-9][0-9]) ;; *) die "--accept expects a milestone id such as M01." ;; esac

# Run logs must never be committed.
EXCLUDE_FILE="$(git rev-parse --git-path info/exclude)"
mkdir -p "$(dirname "$EXCLUDE_FILE")"
grep -qx "$RUNS_DIR/" "$EXCLUDE_FILE" 2>/dev/null || echo "$RUNS_DIR/" >> "$EXCLUDE_FILE"

# --- helpers -----------------------------------------------------------------

has_text() { [ -f "$1" ] && grep -q '[^[:space:]]' "$1"; }
section() { awk -v h="## $2" '$0 == h {f=1; next} /^## / {f=0} f' "$1" 2>/dev/null; }
strip_comments() { perl -0pe 's/<!--.*?-->//gs'; }
brief_text() { section "$AUTOPILOT_FILE" "Brief" | strip_comments | sed '/^[[:space:]]*$/d'; }
setting() {
  sed -n "s/^- $1:[[:space:]]*//p" "$AUTOPILOT_FILE" 2>/dev/null | head -1 | tr -d '`' | awk '{print $1}'
}
decisions_count() { section "$AUTOPILOT_FILE" "Decisions to review" | strip_comments | grep -c '^- ' || true; }

ensure_autopilot_file() {
  [ -f "$AUTOPILOT_FILE" ] && return
  cat > "$AUTOPILOT_FILE" <<'EOF'
# Autopilot

Settings for running the SpecCraft workflow on its own. Guide: `.speccraft/Readme.md` → "Autopilot".

## Settings

- Stop at: milestone
- Roast rounds: 3

## Brief

<!-- Describe the product in your own words: the problem, who it is for, what v1 must do, the type of product and any fixed constraints. -->

## Decisions to review

<!-- The autopilot adds a line here for every choice it made in place of asking you: date · skill · decision — why. -->
EOF
  log "Created $AUTOPILOT_FILE."
}

# Replace the content of the "Brief" section (the heading is added if missing).
set_brief() {
  local tmp="$RUNS_DIR/brief.$$"
  printf '%s\n' "$1" > "$tmp.text"
  grep -qx '## Brief' "$AUTOPILOT_FILE" || printf '\n## Brief\n' >> "$AUTOPILOT_FILE"
  awk -v f="$tmp.text" '
    $0 == "## Brief" { print; print ""; while ((getline l < f) > 0) print l; print ""; skip = 1; next }
    skip && /^## / { skip = 0 }
    !skip { print }
  ' "$AUTOPILOT_FILE" > "$tmp" && mv "$tmp" "$AUTOPILOT_FILE"
  rm -f "$tmp.text"
}

workflow_paths() {
  echo "$WORKSPACE"
  for p in AGENTS.md CLAUDE.md; do
    { [ -e "$p" ] || git ls-files --error-unmatch "$p" >/dev/null 2>&1; } && echo "$p"
  done
}
workflow_dirty() { git status --porcelain -- $(workflow_paths) | grep -q .; }
# Product files with uncommitted changes (the engine's definition: everything but workflow and toolkit files).
product_dirty() { node "$STATE_JS" --dirty; }
commit_workflow() {
  workflow_dirty || return 0
  git add -A -- $(workflow_paths) \
    && git commit -q -m "$1" \
    && log "Committed: $1" \
    || log "Warning: could not commit the workflow files ($1)."
}

# --- the decision ------------------------------------------------------------
# The state engine (00-next/scripts/state.mjs) decides, by the same rules as 00-next and SpecCraft
# Board. It sets STEP (skill name, "build", or empty for a stop), KEY (identifies the step and its
# input state: the same key twice means no progress), NOTE (extra prompt line), STOP_KIND (gate |
# point | done), STOP_MSG, and REVIEW / ACTIVE / ACTIVE_DIR / MILESTONES about the roadmap.

decide() {
  local out
  STEP=""; KEY=""; NOTE=""; STOP_KIND=""; STOP_MSG=""; REVIEW=""; ACTIVE=""; ACTIVE_DIR=""; MILESTONES=0
  out="$(node "$STATE_JS" --shell --stop-at "$STOP_AT" --roast-rounds "$ROAST_ROUNDS" \
    ${ACCEPT:+--accept "$ACCEPT"} ${CHANGES:+--changes "$CHANGES"} ${FEATURE:+--feature "$FEATURE"} \
    ${MILESTONES_AT_START:+--milestones-at-start "$MILESTONES_AT_START"})" \
    || die "The state engine failed: $out"
  eval "$out"
}

show_status() {
  node "$STATE_JS" --status --roast-rounds "$ROAST_ROUNDS"
  echo "Stop at:    $STOP_AT    Agent: $AGENT${MODEL:+ ($MODEL)}"
}

run_agent() {
  local prompt="$1" cmd
  case "$AGENT" in
    claude) set -- claude -p "$prompt" --dangerously-skip-permissions ${MODEL:+--model "$MODEL"} ;;
    codex)  set -- codex exec -s workspace-write -c sandbox_workspace_write.network_access=true ${MODEL:+-m "$MODEL"} "$prompt" ;;
    antigravity) set -- agy -p "$prompt" --dangerously-skip-permissions ;;
    gemini) set -- gemini --yolo ${MODEL:+-m "$MODEL"} -p "$prompt" ;;
    custom) cmd="$AGENT_CMD \"\$1\""; set -- sh -c "$cmd" autopilot "$prompt" ;;
  esac
  if [ -n "$TIMEOUT_BIN" ]; then
    "$TIMEOUT_BIN" --kill-after=60 "$STEP_TIMEOUT" "$@" </dev/null
  else
    "$@" </dev/null
  fi
}

step_prompt() {
  cat <<EOF
AUTONOMOUS MODE — SpecCraft autopilot. No operator is available while this step runs.

Execute exactly one step: the skill $STEP. Read $SKILLS_DIR/$STEP/SKILL.md and follow it completely, including its "Autonomous mode" section if it has one. Do not start another skill afterwards.
$NOTE

Rules for this step:
- Never ask questions and never wait for input. Where the skill says to ask or confirm with the operator, decide yourself: choose what best fits .speccraft/autopilot.md -> "Brief" and the documents in .speccraft/docs/, write it into the document as an assumption, and add one line to .speccraft/autopilot.md -> "Decisions to review": "- YYYY-MM-DD · $STEP · <decision> — <why>". Add only the decisions the operator would want to check, not every detail.
- What the operator wrote in the Brief is a fixed requirement. Do not contradict it.
- Write documents in the language of the Brief, or in the language of the existing documents in .speccraft/docs/ when there is no brief.
- Change only workflow files in .speccraft/. Write no product code and do not modify .agents/ or .claude/.
- Commit only where the skill's own Git section tells you to. The autopilot commits the remaining .speccraft/ changes after this step. Never push.
- If the step cannot be completed (information that cannot reasonably be assumed, a broken environment), write the reason to .speccraft/.runs/STOP and end.
EOF
}

# Commit message suffix, e.g. " round 2" or " plan M01".
step_label() {
  case "$KEY" in
    02:*) echo " round $(( ${KEY#02:} + 1 ))" ;;
    08:*|09:*) echo " ${KEY#*:}" | tr ':' ' ' ;;
  esac
}

finish() {
  local code="$1" decisions
  [ -n "${FINISHED:-}" ] && return
  FINISHED=1
  echo
  log "Autopilot stopped: $STOP_REASON"
  show_status
  decisions="$(decisions_count)"
  [ "${decisions:-0}" -gt 0 ] && echo "Decisions:  $decisions to review in $AUTOPILOT_FILE -> \"Decisions to review\""
  [ -n "${RUN_DIR:-}" ] && echo "Logs:       $RUN_DIR/ ($STEPS step(s), $(( ($(date +%s) - START_TS) / 60 )) min)"
  exit "$code"
}

# --- settings ----------------------------------------------------------------

[ "$DRY" = 1 ] || ensure_autopilot_file
[ -n "$STOP_AT" ] || STOP_AT="$(setting 'Stop at')"
[ -n "$STOP_AT" ] || STOP_AT=milestone
case "$STOP_AT" in spec|plan|milestone) ;; *) die "Stop at must be spec, plan or milestone (got '$STOP_AT')." ;; esac
[ -n "$ROAST_ROUNDS" ] || ROAST_ROUNDS="$(setting 'Roast rounds')"
[ -n "$ROAST_ROUNDS" ] || ROAST_ROUNDS=3
case "$ROAST_ROUNDS" in *[!0-9]*) die "Roast rounds must be a number (got '$ROAST_ROUNDS')." ;; esac
FILE_AGENT="$(setting 'Agent')"
[ -n "$AGENT" ] || AGENT="${FILE_AGENT:-claude}"
# The model in autopilot.md belongs to the agent named there.
[ -n "$MODEL" ] || [ "$AGENT" != "${FILE_AGENT:-claude}" ] || MODEL="$(setting 'Model')"
[ "$MODEL" = default ] && MODEL=""
case "$AGENT" in
  claude|codex|gemini) command -v "$AGENT" >/dev/null 2>&1 || [ "$DRY" = 1 ] || die "'$AGENT' CLI not found in PATH." ;;
  antigravity) command -v agy >/dev/null 2>&1 || [ "$DRY" = 1 ] || die "'agy' (Antigravity CLI) not found in PATH." ;;
  custom) [ -n "$AGENT_CMD" ] || die "--agent custom requires --agent-cmd." ;;
  *) die "Unknown agent '$AGENT'. Use claude, codex, antigravity, gemini or custom." ;;
esac
# The build (run-milestone.sh) uses the same agent and model.
[ "$AGENT" = custom ] || BUILD_ARGS+=(--agent "$AGENT")
[ -n "$MODEL" ] && BUILD_ARGS+=(--model "$MODEL")

TIMEOUT_BIN=""
if [ "$STEP_TIMEOUT" -gt 0 ]; then
  TIMEOUT_BIN="$(command -v timeout || command -v gtimeout || true)"
fi

# --- start -------------------------------------------------------------------

# The workflow state of an active milestone lives on its branch.
switch_to_milestone_branch() {
  local candidates
  case "$(git branch --show-current)" in milestone/*) return ;; esac
  [ -z "$(git status --porcelain)" ] || return 0
  candidates="$(git for-each-ref --format='%(refname:short)' 'refs/heads/milestone/*')"
  case "$(printf '%s\n' "$candidates" | grep -c .)" in
    0) ;;
    1) git switch -q "$candidates" && log "Switched to $candidates." || die "Cannot switch to $candidates." ;;
    *) die "Several milestone branches exist; switch to the active one first: $(echo $candidates)" ;;
  esac
}

if [ "$DRY" = 1 ]; then
  switch_to_milestone_branch
  decide
  echo "SpecCraft status"
  show_status
  if [ -n "$STEP" ]; then
    echo "Next:       $STEP — $TITLE"; [ -z "$NOTE" ] || echo "            $NOTE"
  else
    echo "Stop:       $STOP_MSG"
  fi
  exit 0
fi

mkdir -p "$RUNS_DIR"
mkdir "$RUNS_DIR/autopilot.lock" 2>/dev/null \
  || die "Another autopilot run is in progress ($RUNS_DIR/autopilot.lock exists). Remove it if no run is active."
RUN_ID="$(date +%Y-%m-%d-%H%M%S)"
RUN_DIR="$RUNS_DIR/autopilot-$RUN_ID"
mkdir -p "$RUN_DIR"
echo "$RUN_DIR" > "$RUNS_DIR/autopilot.lock/run"
START_TS="$(date +%s)"
STEPS=0
STOP_REASON="interrupted"
trap 'rm -rf "$RUNS_DIR/autopilot.lock"' EXIT
trap 'STOP_REASON="interrupted"; finish 130' INT TERM
rm -f "$RUNS_DIR/STOP"

# The operator's own edits of workflow files (e.g. the brief) are committed first.
commit_workflow "docs(autopilot): operator changes before the run"

if [ -n "$BRIEF" ]; then
  current="$(brief_text)"
  if [ -n "$current" ] && [ "$current" != "$(printf '%s\n' "$BRIEF" | sed '/^[[:space:]]*$/d')" ]; then
    die "$AUTOPILOT_FILE already has a different brief. Edit it there, or start without a brief to use it."
  fi
  if [ -z "$current" ]; then
    set_brief "$BRIEF"
    commit_workflow "docs(autopilot): brief"
  fi
  has_text "$DOCS/01-Idea.md" && log "Note: 01-Idea.md already exists, so the brief is kept for reference and the idea is not generated again."
fi

switch_to_milestone_branch
decide
MILESTONES_AT_START="$MILESTONES"

if [ -n "$ACCEPT" ] && [ "$REVIEW" != "$ACCEPT" ]; then
  die "--accept $ACCEPT: milestone $ACCEPT is not waiting for review ([?] in $MILESTONES_FILE)."
fi
[ "$STEP_TIMEOUT" -gt 0 ] && [ -z "$TIMEOUT_BIN" ] && log "Warning: timeout/gtimeout not found, steps run without a time limit."

log "Autopilot $RUN_ID started: agent=$AGENT${MODEL:+ ($MODEL)}, stop at $STOP_AT, roast rounds $ROAST_ROUNDS."
show_status

if [ -n "$FEATURE" ] && [ "$MILESTONES_AT_START" -eq 0 ]; then
  die "--feature needs an existing roadmap (.speccraft/milestones.md). For a new product, give the idea as the brief instead."
fi
if [ -n "$CHANGES" ] && [ -z "$REVIEW" ]; then
  die "--changes: no milestone is waiting for review."
fi
LAST_KEY=""
RETRIES=0
while true; do
  if [ -f "$RUNS_DIR/STOP" ]; then
    STOP_REASON="the agent stopped: $(head -c 500 "$RUNS_DIR/STOP")"; finish 1
  fi
  decide
  if [ -z "$STEP" ]; then
    STOP_REASON="$STOP_MSG"; finish 0
  fi
  if [ "$MAX_STEPS" -gt 0 ] && [ "$STEPS" -ge "$MAX_STEPS" ]; then
    STOP_REASON="--max-steps $MAX_STEPS reached; next would be $STEP"; finish 0
  fi
  if [ "$KEY" = "$LAST_KEY" ]; then
    if [ "$STEP" = build ]; then
      SUMMARY="$(ls -t "${ACTIVE_DIR:-.}"/run-summary-*.md 2>/dev/null | head -1)"
      STOP_REASON="the build ended before the milestone was complete${SUMMARY:+: $(sed -n 's/^- \*\*Stop reason:\*\* //p' "$SUMMARY" | head -1). See $SUMMARY}"
      finish 1
    fi
    RETRIES=$((RETRIES + 1))
    if [ "$RETRIES" -ge "$MAX_RETRIES" ]; then
      STOP_REASON="no progress on $STEP after $MAX_RETRIES attempts. See the last log in $RUN_DIR/"; finish 1
    fi
    log "No progress on $STEP (attempt $RETRIES/$MAX_RETRIES); retrying in ${RETRY_WAIT}s."
    nap "$RETRY_WAIT"
  else
    RETRIES=0
  fi
  LAST_KEY="$KEY"
  STEPS=$((STEPS + 1))
  echo "$STEP" > "$RUNS_DIR/autopilot.lock/step"
  STEP_START="$(date +%s)"

  if [ "$STEP" = build ]; then
    log "Step $STEPS: build milestone $ACTIVE with run-milestone.sh"
    commit_workflow "docs(autopilot): workflow state before the build"
    bash "$RUN_MILESTONE" --no-caffeinate ${BUILD_ARGS[@]+"${BUILD_ARGS[@]}"}
    log "Build run ended (exit $?) after $(( ($(date +%s) - STEP_START) / 60 )) min."
    continue
  fi

  STEP_LOG="$RUN_DIR/step-$(printf '%02d' "$STEPS")-$STEP.log"
  log "Step $STEPS: $STEP${NOTE:+ — ${NOTE:0:120}}"
  run_agent "$(step_prompt)" 2>&1 | tee "$STEP_LOG"
  RC=${PIPESTATUS[0]}
  log "Step $STEPS finished (exit $RC) after $(( ($(date +%s) - STEP_START) / 60 )) min."

  if git rev-parse -q --verify MERGE_HEAD >/dev/null; then
    git merge --abort >/dev/null 2>&1
    STOP_REASON="$STEP left an unfinished merge (aborted). See $STEP_LOG"; finish 1
  fi
  dirty="$(product_dirty)"
  if [ -n "$dirty" ]; then
    STOP_REASON="$STEP changed files outside .speccraft/ ($(echo $dirty | LC_ALL=C cut -c1-200)). Review them, commit or discard, then start again"; finish 1
  fi
  commit_workflow "docs(autopilot): $STEP$(step_label)"
done
