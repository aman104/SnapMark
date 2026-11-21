---
name: 03-discovery-prd
description: generate detailed product requirements documents from a product idea, feature brief, rough notes, user problem statement, or existing product context. use when the user asks for a prd, wants to formalize requirements, needs a structured markdown specification, or wants the result saved as .speccraft/docs/02-General-PRD.md. especially useful for ai product-building workflows where the prd will be used by downstream skills such as tech-stack generation, design system planning, task breakdown, or implementation.
---

# PRD Generator

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

Generate a complete PRD in the language requested by the user. Default to the user's language. Always produce a practical, implementation-ready document rather than a vague concept note.

## Core workflow

1. Read the user's prompt and extract the core product idea, problem, user group, constraints, platform, and desired behavior.
2. Check if `.speccraft/docs/01-Idea.md` exists. If it does, use it as the primary input context — it contains a structured product idea from the `01-discovery-idea` skill. Incorporate all relevant details (problem, users, features, business model, risks) into the PRD.
3. Check if there are any files in `.speccraft/mockup/`. If they exist, review and incorporate them as context for generating the PRD.
4. If the repository already contains product code, treat it as existing product context: describe the current behavior it implements and separate it from new requirements.
5. Infer missing but necessary PRD details conservatively. Do not invent fake research, metrics, integrations, or technical facts. When something is unknown, mark it as an assumption or constraint.
6. Write the PRD using the exact section order and heading structure defined in `references/prd-template.md`, adapting the content to the product type (web/mobile/desktop app, API, CLI, library, game, pipeline, ...).
7. Make the document concrete. Prefer tables, explicit requirements, edge cases, measurable outcomes, and operational details.
8. Save the final document as `.speccraft/docs/02-General-PRD.md`.

## Output rules

- Always create a markdown file at exactly `.speccraft/docs/02-General-PRD.md` unless the user explicitly requests a different path.
- The document title must follow this format:
  `# PRD: <product or feature name>`
- Preserve the exact top-level section numbering and order from the template.
- Keep the structure rigid, but adapt the content depth to the request.
- If the user provides a sample PRD and asks to follow it, mirror its level of specificity.
- Use tables for functional requirements, edge cases, settings, non-functional requirements, metrics, and risks whenever that improves clarity.
- If a section is not applicable, keep the section and write a short justified note instead of deleting it.

## Required quality bar

The PRD must be useful for downstream execution. That means:

- Product scope is explicit.
- Users and use cases are identifiable.
- Functional requirements are broken into clear behaviors.
- UX states are described when relevant.
- Technical architecture is high-level but specific enough for engineering planning.
- Edge cases and operational risks are included.
- Success metrics are measurable.
- Future extensions are separated from v1 scope.

## Reasoning constraints

- Do not claim certainty about selectors, APIs, legal constraints, or platform behavior unless the user provided them.
- When concrete implementation details are supplied by the user, preserve them faithfully.
- When details are missing, prefer realistic assumptions and label them implicitly through careful wording such as "should", "expected", or "default" rather than pretending they are confirmed facts.
- Avoid generic filler like "the system should be scalable" unless you immediately make it testable or specific.

## Content expansion guidance

### If the user gives only a rough idea
Expand it into:
- product description
- problem and goal
- target users
- functional requirements
- simple UX flow
- non-functional requirements
- success metrics
- risks

### If the user gives a highly detailed brief
Translate it into a polished PRD without losing specificity. Preserve:
- domain vocabulary
- data fields
- workflows
- file structures
- UI states
- examples
- technical constraints

## File creation behavior

When asked to create the PRD as part of a project structure:
- ensure the `.speccraft/docs` directory exists
- write the final markdown to `.speccraft/docs/02-General-PRD.md`
- do not create alternative filenames unless requested

## Final check before finishing

Verify that the PRD:
- follows the template headings exactly
- is internally consistent
- separates v1 requirements from future ideas
- includes measurable success criteria
- is saved to `.speccraft/docs/02-General-PRD.md`

## Reference

Use `references/prd-template.md` as the canonical output structure.
