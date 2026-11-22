#!/usr/bin/env bash
# Claude Code hook for SpecCraft Board: keeps the live state of an interactive session current.
# The agent writes .speccraft/.runs/activity.json when it starts a step (see AGENTS.md);
# this hook only marks it busy (after every tool call, on every prompt) or waiting (when the
# agent stops and the turn goes back to you). It never prints and always exits 0.
RUNS="${CLAUDE_PROJECT_DIR:-$PWD}/.speccraft/.runs"
[ -f "$RUNS/activity.json" ] || exit 0
case "${1:-}" in
  busy) rm -f "$RUNS/activity.idle" 2>/dev/null; touch "$RUNS/activity.json" 2>/dev/null ;;
  idle) touch "$RUNS/activity.idle" 2>/dev/null ;;
esac
exit 0
