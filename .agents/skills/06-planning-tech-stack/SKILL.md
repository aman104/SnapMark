---
name: 06-planning-tech-stack
description: generate a technology stack recommendation and implementation direction from .speccraft/docs/01-Idea.md, .speccraft/docs/02-General-PRD.md, .speccraft/docs/03-Design.md, and .speccraft/docs/04-Interface-spec.md. use when the agent needs to analyze product requirements and UI specifications to choose frontend/backend/database/infrastructure/tooling for a new product or an existing codebase, justify technical choices, compare alternatives, and save the result as .speccraft/docs/05-Tech-Stack.md in the same project `.speccraft/docs` directory.
---

# Planning Tech Stack

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

Read `.speccraft/docs/01-Idea.md`, `.speccraft/docs/02-General-PRD.md`, `.speccraft/docs/03-Design.md`, and `.speccraft/docs/04-Interface-spec.md` to create `.speccraft/docs/05-Tech-Stack.md`.

## Workflow

1. Read the core product context from `.speccraft/docs/01-Idea.md` and `.speccraft/docs/02-General-PRD.md`.
2. Read the design and interface requirements from `.speccraft/docs/03-Design.md` and `.speccraft/docs/04-Interface-spec.md`.
3. Check if there are any files in `.speccraft/mockup/`. If they exist, review and incorporate them as context for planning the tech stack.
4. Inspect the repository root. If it already contains product code, identify its current stack, structure and tooling; the plan extends it instead of replacing it.
5. Extract the most important inputs for technical planning:
   - product type
   - user flows
   - core features
   - non-functional requirements
   - integrations
   - constraints
   - scale assumptions
   - privacy/security expectations
6. Infer missing technical assumptions only when necessary. Mark every assumption explicitly.
7. Select one recommended stack for the first production-ready version.
8. Mention 1-3 viable alternatives only when they are materially realistic.
9. Save the output to `.speccraft/docs/05-Tech-Stack.md`.

## Output rules

- Always write the result in markdown.
- Always use the exact file path `.speccraft/docs/05-Tech-Stack.md`.
- Always keep the recommendation opinionated. Do not return a vague menu of many unrelated options.
- **Deeply analyze the user's actual needs before selecting the stack.** Ensure the technology is specifically tailored to the target platform. Accurately distinguish between native mobile apps (Google Play/App Store), complex web applications (e.g., React/Next.js), simple static websites, or PWAs.
- Prefer pragmatic, widely-supported technologies unless the PRD clearly requires something specialized.
- Optimize for shipping speed, maintainability, hiring availability, and long-term product evolution.
- Keep the stack internally consistent. Do not mix technologies that create unnecessary complexity.
- When the PRD does not require mobile, desktop, microservices, event streaming, or multi-cloud, do not recommend them by default.
- When a chrome extension is part of the product, explicitly cover extension-specific architecture and browser APIs.
- When the PRD implies AI features, explicitly cover model access, evaluation, observability, and prompt/version management.
- When the PRD implies heavy analytics, crawling, asynchronous jobs, or imports/exports, include background job processing and storage choices.

## Required structure for .speccraft/docs/05-Tech-Stack.md

Use this exact section structure.

# Tech Stack Plan: [product name]

## 1. Executive summary
A short recommendation of the proposed stack and why it fits the PRD.

## 2. Product signals extracted from PRD
A concise bullet list of the technical signals extracted from `.speccraft/docs/02-General-PRD.md`.

## 3. Recommended stack
Use a table with the rows relevant to the product type (omit the rest; add rows such as `game engine`, `cli framework`, `packaging / distribution`, `ml / data tooling` when needed):
- frontend
- backend
- database
- authentication
- storage
- background jobs
- search
- analytics
- infrastructure
- ci/cd
- testing
- observability
- extension runtime or client platform

Each row must include:
- chosen technology
- why it fits
- notes

## 4. Recommended architecture
Describe the proposed architecture for v1. Cover:
- main modules
- data flow
- integrations
- async work
- deployment shape
- security/privacy considerations

## 5. Key technical decisions
For each major decision, include:
- decision
- rationale
- tradeoffs

## 6. Alternatives considered
List realistic alternatives and briefly explain why they were not chosen as the default.

## 7. Risks and constraints
List implementation risks, dependency risks, scale risks, and product-specific technical constraints.

## 8. Suggested project structure
Provide a repository tree of the product. The product lives directly in the repository root, next to the workflow directories (`.agents/`, `.claude/`, `.speccraft/`), which are shown in the tree but stay untouched by the product. Use the idiomatic layout of the chosen stack (e.g. `src/`, `tests/`, `package.json` for a Node project; `pyproject.toml` and a package directory for Python; `apps/` and `packages/` for a monorepo). If the repository already contains product code, document the existing structure and only describe additions. Name the working directory for install, dev, test, build and migration commands (the repository root by default) and the build root for hosting and CI. Note how the stack's scaffolding tool is run in a non-empty repository root without overwriting `.agents/`, `.claude/`, `.speccraft/` or `.gitignore`.

## 9. Delivery recommendation
Recommend a sensible implementation path for v1:
- must-have foundations
- fast-follow items
- things to postpone

## 10. Assumptions and open questions
Split clearly into:
- assumptions
- open questions

## Decision heuristics

Before applying defaults, thoroughly analyze what the user actually wants to build. Match the platform strategy precisely:

- **For Native Mobile Apps (Google Play / App Store)**: Prefer `React Native` (with Expo) or `Flutter` for cross-platform delivery. If extreme native performance is required, recommend `Swift` / `Kotlin`.
- **For Web Applications (SaaS, Portals, Dashboards)**: Prefer `Next.js + TypeScript` (React) or `Vite + React`.
- **For Progressive Web Apps (PWA)**: Prefer `Next.js` or `Vite + React` configured with service workers and web manifests.
- **For Static Websites (Landing Pages, Blogs)**: Prefer `Astro` or static exports of `Next.js`. Do not overengineer with full-stack SSR if the site is purely static.
- For standard product backends: prefer `node.js` or `nestjs` when backend separation is needed.
- For relational app data: prefer `postgresql`.
- For caching/queues: prefer `redis`.
- For auth in B2B SaaS: prefer `clerk`, `auth.js`, or a similarly mature option that fits the stack.
- For file/object storage: prefer `s3-compatible storage`.
- For hosting small-to-medium products: prefer `vercel` for frontend and `railway`, `render`, or `fly.io` for backend unless the PRD implies stricter infra needs.
- For observability: prefer `sentry` plus structured logs.
- For analytics: prefer `posthog` unless the PRD requires enterprise BI patterns.
- For testing: include unit, integration, and one pragmatic end-to-end layer.
- For chrome extensions: prefer `manifest v3`, `typescript`, lightweight UI, content scripts, background service worker, and minimal dependencies.
- **For CLI tools**: prefer the ecosystem the users already have (`node` + `commander`/`oclif`, `python` + `typer`, `go` + `cobra`, `rust` + `clap`); cover packaging and distribution (npm, PyPI, Homebrew, single binary).
- **For libraries / SDKs**: cover the public API surface, versioning (semver), build targets, documentation and publishing.
- **For desktop apps**: prefer `Tauri` or `Electron` for web-based UIs; native toolkits only when the PRD requires them.
- **For games**: choose the engine by platform and scope (e.g. `Godot`, `Unity`, `Phaser` for web), and cover asset pipeline and build targets.
- **For data / ML pipelines**: cover orchestration, storage formats, reproducibility and evaluation.
- **For existing codebases**: keep the current stack unless the PRD clearly requires a change; justify every addition.

## Style rules

- Be concrete.
- Avoid buzzwords.
- Avoid overengineering.
- State uncertainties explicitly.
- Tie every important recommendation back to the PRD.
- Do not describe implementation as already completed.
- Do not generate code in this skill. This skill only plans the stack and architecture direction.

See `references/stack-template.md` for the expected output shape and tone.
