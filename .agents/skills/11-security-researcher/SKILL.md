---
name: 11-security-researcher
description: analyze an application's current codebase and configuration for security weaknesses, automatically implement safe remediations where possible, and write a dated security report file named .speccraft/docs/06-security-report-{DATE}.md. use when the agent should perform a broad security review across code, dependencies, secrets, auth, sessions, permissions, headers, input handling, and deployment-related configuration, then harden the application directly instead of only reporting issues.
---

# Security Researcher

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

## Overview

Perform a comprehensive security review of the current application, implement practical hardening changes directly in the project, and leave behind a dated report in `.speccraft/docs/06-security-report-{DATE}.md`.

This skill is both an auditor and a fixer. It should inspect the existing application and its adjacent configuration, identify realistic security issues, remediate what can be safely fixed, and document findings, changes, residual risks, and follow-up recommendations.

## Primary outcomes

For each run, the skill must aim to produce all of the following:

1. A broad security review of the current codebase and project configuration
2. Direct security improvements implemented in the project where safe and feasible
3. A dated report file in `.speccraft/docs/06-security-report-{DATE}.md`
4. A concise chat summary of the most important findings and remediations

Use `DATE` in `YYYY-MM-DD` format.

## Review scope

Review the project comprehensively. Do not limit the review to one file type or one layer.

At minimum, inspect the following when present:

- application source code
- API routes and handlers
- authentication flows
- authorization checks and role enforcement
- session management
- token handling
- input validation and output encoding
- database query construction
- file upload handling
- secret management and exposed credentials
- security-related headers and middleware
- CORS configuration
- cookies and browser-facing security settings
- dependency manifests and security-sensitive packages
- environment/config files checked into the repo
- logging of sensitive data
- error handling that leaks internals
- SSRF, XSS, CSRF, open redirect, path traversal, injection, and deserialization risks where relevant
- unsafe defaults in infrastructure-related configuration that lives in the repo

If a category is not relevant to the project, state that in the report rather than silently skipping it.

## Operating mode

Follow this order every time:

0. **Git** (when the project is a git repository): start from a clean tree and run `git switch -c security/{DATE}` from the current branch. Commit the fixes and the report there (`fix(security): ...`, `docs(security): report {DATE}`).
   - If you started on a `milestone/*` branch, merge back into it with `--no-ff` once the checks pass.
   - If you started on the base branch, leave the branch unmerged and tell the user how to review and merge it.
   - Never push.
1. Discover security-relevant entry points in the product code (the repository excluding `.agents/`, `.claude/` and `.speccraft/`), then configuration affecting it (e.g. CI and `.gitignore`). Run dependency audits and tests from the working directory defined in `05-Tech-Stack.md` (the repository root by default); report paths relative to the repository root. Keep the dated report in `.speccraft/docs/`, outside the product code.
2. Inspect likely high-risk areas first
3. Identify vulnerabilities, weaknesses, and insecure defaults
4. Implement safe remediations directly in the codebase
5. Re-check the touched areas for consistency
6. Write `.speccraft/docs/06-security-report-{DATE}.md`
7. Reply in chat with a concise summary

## High-priority vulnerability checklist

Bias toward these issues first because they often create the highest risk:

- hardcoded secrets, API keys, tokens, passwords
- missing or weak authorization checks
- missing server-side validation
- SQL/NoSQL/query injection patterns
- XSS from unsanitized rendering or unsafe HTML handling
- CSRF exposure on state-changing browser requests
- insecure cookie settings
- missing rate limits on auth-sensitive endpoints
- password handling mistakes
- insecure token storage or verification
- open redirect behavior
- path traversal in file access logic
- unsafe file upload validation
- excessive error detail leakage
- permissive CORS and origin trust issues
- exposure of internal admin/debug endpoints
- weak security headers
- sensitive data in logs

## Remediation policy

Implement fixes automatically when they are safe, local, and justified by the observed code.

Examples of allowed direct remediations:

- add validation and sanitization
- add missing auth or authz guardrails
- tighten cookie flags and session settings
- add or strengthen security headers
- remove secrets from committed code and replace with env-based access patterns
- reduce error leakage
- harden file upload validation
- restrict overly broad CORS settings
- prevent open redirects by validating destinations
- replace unsafe query construction with parameterized patterns
- add missing escaping or safe rendering guards
- disable obviously unsafe debug behavior in committed config

Do not make speculative product changes unrelated to security.

If a fix would be too disruptive or risky without business confirmation, do not guess. Instead:

- leave the code unchanged for that item
- document the issue clearly in the report
- describe the safest next step

## Secrets handling rules

If secrets or credentials are found in committed code or config:

1. Remove them from the code when safe to do so
2. Replace them with environment-variable access patterns where appropriate
3. Do not print secret values in chat or in the report
4. In the report, mention only the type and location category, not the value
5. Call out that rotation may be required if exposure is real

## Dependency handling rules

You may inspect dependency manifests for risky libraries or insecure patterns in how dependencies are used.

If the issue can be fixed by code changes without changing dependency versions, prefer that.

If a version upgrade is clearly required for a known security reason and the upgrade is low-risk within the existing stack, it is acceptable to update the dependency. Document the rationale in the report.

Do not perform broad dependency churn unrelated to the identified risks.

## Framework sensitivity

Adapt the review to the project stack instead of forcing one generic checklist.

Examples:

- For Next.js or React apps, prioritize XSS, auth flow exposure, API routes, server actions, middleware, cookie policy, and env leakage.
- For Node backends, prioritize input validation, authz, injection, SSRF, CORS, logging, and secret handling.
- For Python or Ruby services, prioritize injection, template rendering risks, serialization, authn/authz, and config exposure.
- For full-stack apps, review both browser-facing and server-side surfaces.
- For mobile and desktop apps, prioritize local storage of secrets, deep links / IPC, update channels and permissions.
- For CLIs and libraries, prioritize command/shell injection, unsafe file handling, deserialization, supply chain and what gets published.

## Testing and verification expectations

After making security changes:

- review the affected files again
- ensure the remediations are coherent with the project structure
- avoid leaving broken imports, dead code, or contradictory config
- if lightweight existing tests can be updated or run reasonably, do so
- if no tests exist, still verify the changed logic through local reasoning grounded in the code

Do not claim that security is fully guaranteed. Use precise language.

## Required report file

Always create a report file at:

- `.speccraft/docs/06-security-report-{DATE}.md`

Use this exact structure:

```markdown
# Security Report - {DATE}

## Scope reviewed
- ...

## Findings summary
- Critical: N
- High: N
- Medium: N
- Low: N

## Remediations implemented
### 1. [Short title]
- Severity: critical | high | medium | low
- Area: ...
- What was wrong: ...
- What was changed: ...
- Residual risk: ...

## Findings not auto-remediated
### 1. [Short title]
- Severity: critical | high | medium | low
- Area: ...
- Why it was not auto-fixed: ...
- Recommended next step: ...

## Files changed
- ...

## Follow-up recommendations
- ...
```

## Severity guidance

Use practical severity levels:

- `critical`: direct compromise or highly likely severe impact
- `high`: serious exposure or bypass risk
- `medium`: meaningful weakness that should be addressed soon
- `low`: minor hardening improvement or low-likelihood issue

Do not inflate severity for weak findings.

## Chat response rules

At the end, reply concisely with:

1. A short summary of the most important issues found
2. The most important remediations implemented
3. The report filename created
4. Any high-risk items that still require manual follow-up

Keep the response concise and action-oriented.

## Things to avoid

Do not:

- fabricate vulnerabilities not grounded in the code
- claim external penetration testing was performed
- claim perfect security
- expose secret values in chat or in the report
- make wide product changes unrelated to risk reduction
- mark risky unverified migrations as complete if they were not implemented safely
- ignore residual risk after partial mitigation

## Quality bar

Before finishing, verify that:

- the review covered the major security surfaces relevant to the project
- implemented changes are real and security-motivated
- the report exists with the required dated filename
- secret values are not exposed in outputs
- remaining risks are documented honestly
- the final summary matches the work actually completed
