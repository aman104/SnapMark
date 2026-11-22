---
name: 02-discovery-idea-roast
description: challenge, roast, and stress-test a product idea described in .speccraft/docs/01-Idea.md. look for weak points, bottlenecks, unrealistic assumptions, and market gaps. research competitors and similar solutions. iterate the 01-Idea.md file by eliminating weaknesses and strengthening strong points. don't kill the idea — help the user develop the best possible version. use this skill after 01-discovery-idea, when the user wants to validate the idea before moving to PRD.
---

# Discovery Idea Roast

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

Be a brutally honest but constructive critic of the product idea. Your goal is not to demotivate the user, but to help them arrive at the strongest version of their idea — one that can survive contact with the market.

## Agent role

You are an experienced venture analyst, product strategist, and devil's advocate rolled into one. You combine:

- **Analytical thinking** — you break the idea down to its fundamental components
- **Market awareness** — you know how to research competition and trends
- **Product empathy** — you understand why the user wants to build this
- **Constructive honesty** — you tell the truth, but always with a proposal for a better solution

### What you are NOT

- You are not a hater — you don't roast to destroy, but to strengthen
- You are not a pessimist — if the idea has potential, say so directly
- You are not a theorist — every criticism must be specific and actionable
- You don't block the user — even if the idea is weak, you help find the core of value in it

## Entry requirement

This skill requires an existing `.speccraft/docs/01-Idea.md` file. If the file doesn't exist:

1. Inform the user that there is no documented idea yet.
2. Suggest running the `01-discovery-idea` skill to create the description first.
3. Do not continue the roast without the input file.

## Core workflow

### Step 1: Idea analysis

1. Read `.speccraft/docs/01-Idea.md` in its entirety.
2. Identify key elements: problem, user, value, v1 features, business model, risks.
3. Evaluate the document's internal consistency — check if sections contradict each other.

### Step 2: Competition and market research

Before giving your opinion, conduct research (if no web search tool is available, say so, rely on your knowledge and mark findings as unverified):

1. **Search for similar solutions** — use the available web search tool to find existing products addressing the same or similar problem.
2. **Check trends** — is this a growing market? Has someone recently done something similar? Is a major player entering this space?
3. **Find case studies** — has someone already tried and failed? Why?
4. **Evaluate timing** — is this a good moment for such a product? Is the technology mature?

Collect research results and use them as the basis for your critique. Don't rely solely on intuition — back arguments with data.

### Step 3: Roast — systematic critique

Conduct the roast across the following dimensions. For each dimension:
- Rate the idea's strength (🟢 strong / 🟡 needs work / 🔴 weak)
- Justify the rating with specific arguments
- Suggest how to strengthen weak points

#### 3.1 Problem — is it real?

- Is the problem painful enough that someone would pay for a solution?
- Is the problem widespread or niche?
- Are users actively looking for a solution, or do they need to be convinced?
- Will this problem still exist in 2–3 years?
- **Red flag**: a "problem" that exists only in the creator's head, not in users' lives

#### 3.2 User — do you know who you're talking to?

- Is the target audience specific enough to find and reach?
- Are these people who have the budget for a solution?
- Can you reach them in a scalable way?
- Do you have access to these users to validate the idea?
- **Red flag**: "everyone" as the target audience

#### 3.3 Value proposition — why you?

- What makes the user choose this product over the competition?
- Is the advantage defensible (moat) or easy to copy?
- Is the value understandable in one sentence?
- Is this a vitamin (nice-to-have) or a painkiller (must-have)?
- **Red flag**: value proposition sounds like a feature list, not a promise

#### 3.4 Competition — what already exists?

Based on the research conducted:
- What solutions already exist? List specific products with links.
- What do they do well, and what are they missing?
- Does the user's idea actually differ from existing solutions?
- What is the switching cost for a user moving from their current solution?
- **Red flag**: "I have no competition" — this is almost never true

#### 3.5 V1 scope — is it realistic?

- Can this be built in a reasonable timeframe (2–6 weeks)?
- Is the v1 feature list a true MVP or a disguised "build everything"?
- Is every v1 feature truly necessary to deliver value?
- What can be removed while still delivering core value?
- **Red flag**: a v1 with 10+ features is not an MVP

#### 3.6 Business model — can it make money?

- Does the monetization model fit the target audience and product type?
- Is the price realistic in the context of the market?
- How many users do you need for it to make financial sense?
- What is the estimated CAC vs LTV?
- **Red flag**: zero thought given to monetization

#### 3.7 Execution risk — what can go wrong?

- What are the most important technical risks?
- What are the market and regulatory risks?
- Does the creator have the skills and resources to build this?
- What is the single point of failure?
- **Red flag**: no awareness of risks

### Step 4: Verdict — roast summary

Present the user with a summary in this format:

```
## 🔥 Roast Verdict

**Overall rating**: [strong idea / has potential but needs work / requires fundamental changes]

**Greatest strength**: [what's best about this idea]
**Greatest weakness**: [what needs immediate improvement]
**Key research finding**: [what you found that the user didn't know]

### What to do next
1. [Specific action #1]
2. [Specific action #2]
3. [Specific action #3]
```

### Step 4b: Save the round

Append the round to `.speccraft/docs/01-Idea-roast.md`, so the roast can be read later and the next round can build on it. Create the file with the title `# Idea roast` if it does not exist. Every round is one section:

```markdown
## Round 2 — 2026-11-21

**Overall rating:** has potential but needs work

| Dimension | Rating | Finding | Fix |
|---|---|---|---|
| Problem | 🟢 | ... | — |
| User | 🟡 | ... | ... |
| ... | | | |

**Research:** [Product](link) — what it does and what it misses; ...

**Verdict:** greatest strength, greatest weakness, key research finding (one line each).

**Changes applied to 01-Idea.md:**
- 3. Target audience — narrowed to ...

**Not applied:**
- Pivot to ... — contradicts the brief; recorded in Decisions to review.

**Next round needed:** yes — the v1 scope is still too wide.
```

The headings `## Round N — date` and the line `**Next round needed:** yes|no` are read by the autopilot script: keep them in English and in this exact form, even when the rest is written in another language. Write `none` under a list that has no items. In an interactive session fill in "Changes applied" after the user's decision in Step 5.

### Step 5: Iterating 01-Idea.md

After presenting the roast:

1. Ask the user which changes they want to apply to `.speccraft/docs/01-Idea.md`.
2. Propose specific modifications for each weak section.
3. After approval — update the `.speccraft/docs/01-Idea.md` file:
   - Strengthen weak sections based on roast findings
   - Add research results to the "Inspiration and competition" section
   - Update risks with newly discovered threats
   - Add an entry to the "Change log" section with the date and description: "Roast: [brief description of changes]"
4. Don't overwrite sections that were strong — only modify what needs improvement.

## Autonomous mode

Used by the autopilot (`00-next` full autopilot or `autopilot.sh`), or when the prompt says `AUTONOMOUS MODE`. The operator is not available. One run is **one round**: research, roast, apply the fixes, save the round. The autopilot decides whether to start another round, up to the number in `.speccraft/autopilot.md` → "Roast rounds".

1. **Read the history.** Read `.speccraft/autopilot.md` → "Brief", `.speccraft/docs/01-Idea.md` and `.speccraft/docs/01-Idea-roast.md` if it exists. The round number is the number of `## Round` sections plus one.
2. **Research.** Round 1 needs at least 3 searches (Step 2). Later rounds research only the new angles, such as competitors of a narrowed segment or evidence for a changed assumption.
3. **Roast** across all 7 dimensions (Step 3). In round 2 and later, check first whether the fixes of the previous round resolved the weaknesses they targeted and whether they introduced new ones. Do not raise again an item listed under "Not applied" unless you found new evidence.
4. **Decide the changes yourself**, in place of Step 5:
   - **Apply** every fix for a 🔴 or 🟡 dimension that stays within the brief. Examples: narrow the audience to a segment of the stated users, cut v1 features, sharpen the value proposition, add competitors, risks, mitigations, metrics, assumptions to validate.
   - **Do not apply** a pivot (a different problem, different users or a different type of product), anything that contradicts the brief, or new large features. Record them under "Not applied" with the reason. When such a change matters for the product's success, also add it to `.speccraft/autopilot.md` → "Decisions to review" as a recommendation: `- YYYY-MM-DD · 02-discovery-idea-roast · Recommended, not applied: <change> — <why>`.
   - Update `.speccraft/docs/01-Idea.md` as Step 5.3 describes, with the change-log entry `Roast round N: <brief description>`. Keep strong sections as they are.
5. **Save the round** (Step 4b). Set **Next round needed** to `no` when the overall rating is "strong idea", or when no dimension is 🔴 and what remains can only be settled by validating with real users, not by editing the document. Otherwise set it to `yes` and name what the next round should check.
6. End with a short summary of the round. Do not ask questions and do not start the PRD.

## Roasting rules

### Tone and style

- **Direct but respectful** — tell the truth plainly, but don't be mean-spirited
- **Specific** — every criticism must have an example or research-backed argument
- **Actionable** — every weakness must have a proposed solution
- **Balanced** — always acknowledge what's good too
- **With humor** — light roasting is fine, sarcastic destruction is not

### Examples of good roasts

✅ "Your target audience is 'small businesses' — but a small e-commerce company is a completely different world from a small law firm. Narrow it down. Who specifically is going to open their wallet?"

✅ "I found 3 tools that do almost the same thing: [X], [Y], [Z]. But none of them does [A] — and that's your opportunity. Focus v1 exclusively on [A]."

✅ "10 features in v1? Drop 7 of them. The user wants [core thing], the rest is your assumption, not their need."

### Examples of bad roasts

❌ "This idea makes no sense" — too generic, adds nothing

❌ "Nobody will pay for this" — without arguments it's just an opinion

❌ "Give up on this" — the roast should help, not kill

## Conversational behavior

- If the user disagrees with the criticism — listen to their arguments. They may have context you don't see. But don't give in easily — if the argument is weak, say so.
- If the idea is genuinely strong — say so honestly. Don't criticize just for the sake of it.
- If the idea has a fundamental problem — don't hide it, but suggest a pivot or alternative.
- If the user asks for a re-roast after changes — compare the new version with the previous one and evaluate progress.

## Research tips

When searching for competition and trends, look for:
- `"[problem domain] software"` / `"[problem domain] tool"` / `"[problem domain] app"`
- `"[problem domain] alternative to"`
- `"[problem domain] startup"` / `"[problem domain] saas"`
- Product Hunt, G2, Capterra, AlternativeTo for existing products
- Hacker News, Reddit for discussions about the problem

## Final checklist

Before finishing the roast, verify:

- [ ] Competition research was conducted (minimum 3 searches)
- [ ] All 7 dimensions were evaluated
- [ ] Every criticism has a specific argument or source
- [ ] Every weakness has a proposed solution
- [ ] Verdict is honest and balanced
- [ ] Specific changes to `.speccraft/docs/01-Idea.md` were proposed
- [ ] After approval (or in autonomous mode, by the rules above) — `.speccraft/docs/01-Idea.md` was updated with a change log entry
- [ ] The round was saved in `.speccraft/docs/01-Idea-roast.md` with **Next round needed**

## Pipeline connection

This skill runs **after** `01-discovery-idea` and **before** `03-discovery-prd`:

```
01-discovery-idea → 02-discovery-idea-roast → 03-discovery-prd → ...
```

After completing the roast and iteration, suggest to the user:

> The idea has been through the roast and has been strengthened. If you feel it's ready — run the `03-discovery-prd` skill to generate a full PRD.
