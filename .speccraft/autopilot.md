# Autopilot

Settings for running the SpecCraft workflow on its own, from the idea to a built milestone. Two ways to start it:

- in an agent session: `/00-next autopilot full` (Claude Code, Antigravity) or `$00-next autopilot full` (Codex);
- unattended, one fresh agent process per step: `.agents/skills/00-next/scripts/autopilot.sh`.

Options passed to the script override these settings for that run. Guide: `.speccraft/Readme.md` → "Autopilot".

## Settings

- Stop at: milestone
- Roast rounds: 3
- Agent: claude
- Model: default

`Stop at`:
- `spec`: stop when the specification and the roadmap are ready, before any milestone is planned;
- `plan`: stop when the next milestone has its tasks and implementation plans, before any code is written;
- `milestone`: build the next milestone and stop when it waits for your review.

The autopilot never accepts a milestone on your behalf. `Roast rounds` is the maximum number of roast rounds (`0` skips the roast). The rounds stop earlier when the roast finds nothing important left to fix. `Agent` (claude, codex, antigravity, gemini) and `Model` (`default` = the CLI's own default, or e.g. `opus`, `sonnet`) are used by `autopilot.sh` when you start it from the terminal without `--agent` / `--model`; SpecCraft Board keeps its own choice per machine.

## Brief

<!-- Describe the product in your own words: the problem, who it is for, what v1 must do, the type of product (web app, mobile app, CLI, API, ...) and any fixed constraints (platform, stack, deadline, budget). A few sentences are enough. The autopilot keeps what you state here and records everything it assumes. -->

## Decisions to review

<!-- The autopilot adds a line here for every choice it made in place of asking you: date · skill · decision — why. -->

- 2026-11-22 · 08-planning-tasks · Applied all three "Spec changes" rows of the M07 report to `.speccraft/docs/` without asking — none of them changes the product direction: they only record the `downloads` permission and the download-completion behaviour that M07 already implemented (`src/editor/exporter.ts` uses `chrome.downloads.download()` + `onChanged`), so the specification now matches the code.
- 2026-11-22 · 08-planning-tasks · Did not plan a next milestone: M07 was the last entry in `milestones.md` and no `[ ]` milestone remains. Inventing a new one would be a product decision, so the roadmap is reported as complete instead. The report's open recommendations (native context menu, keyboard shortcuts, system clipboard, real interrupted downloads on the target platform) are the natural candidates for a new milestone via `12-feature-advisor`.
- 2026-11-22 · 08-planning-tasks · Documented in `02-General-PRD.md` §6.2 that `clipboardWrite` is not declared, because M07 removed clipboard export (FR-02) and the empty-editor paste uses the `paste` event — the old conditional wording contradicted the shipped `public/manifest.json`.
- 2026-11-22 · 08-planning-tasks · Repaired two roadmap/coverage table rows in `milestones.md` that were separated from their table by a blank line and therefore did not render as table rows (M07 in "Roadmap" and in "Coverage"). Formatting only, no content change.
