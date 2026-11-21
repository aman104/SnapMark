# Implementation plan example

All file paths are repository-relative; the product lives in the repository root and commands run from there.

Quality reference for `.speccraft/milestones/[Mnn]-[slug]/[NNN]-[slug]/implementation-plan.md`. Example: a task of a feature milestone of a B2B SaaS (Next.js App Router, Prisma, Auth.js, Tailwind, Vitest, Playwright).

Source line in `.speccraft/milestones/[Mnn]-[slug]/tasks.md`:

```text
[ ] 010 - Implement project list and creation - Build the Projects list screen and the New Project modal from 04-Interface-spec.md, backed by server actions with validation. Include empty, loading and error states. Only members of the organization can see and create projects. The task is done when a user can create a project and see it in the list immediately.
```

Folder: `.speccraft/milestones/M03-projects-and-tasks-on-real-data/010-implement-project-list-and-creation/implementation-plan.md`

---

# Task 010: Implement project list and creation

## 1. Summary
- **Task:** 010 - Implement project list and creation
- **Milestone:** M03 - Projects and tasks on real data (type: feature)
- **Type:** `ui`, `api`, `data`
- **Depends on:** 005 (UI primitives), 006 (app shell), 007 (schema), 009 (access control)
- **Parallel:** `safe` — touches only `src/features/projects/` and `src/app/projects/`, no schema or dependency changes
- **Sources:** `02-General-PRD.md FR-6, FR-7`, `04-Interface-spec.md §5 "Projects"`, `§6 "New Project modal"`, `03-Design.md components.card, components.modal`, `05-Tech-Stack.md §4 data flow`

## 2. Goal
Organization members can see all projects of their organization and create new ones. This is the first step of the core flow (project → tasks → completion) and the entry screen after sign-in.

## 3. Scope
**In scope:**
- `/projects` list page with cards, sorting by last update
- New Project modal with validation
- `createProject` and `listProjects` server functions with authorization
- empty, loading and error states

**Out of scope:**
- project editing and archiving — task 011
- project detail page — task 012

## 4. Current state and prerequisites
- `Project` model exists (task 007), `authorize()` helper exists (task 009), `Modal`, `Input`, `Button`, `Card`, `Skeleton`, `Toast` exist (task 005).
- Seeded database with demo organization (task 007).

## 5. Implementation steps
1. Create `src/features/projects/schema.ts` with a zod schema `createProjectInput`: `name` string 3–80 chars trimmed, `description` optional string max 500.
2. Create `src/features/projects/server.ts` with `listProjects(session)` and `createProject(session, input)`. Both call `authorize(session.user, 'project:read' | 'project:create', { organizationId })` first and scope queries by `session.organizationId`.
3. Create server action `createProjectAction` in `src/app/projects/actions.ts` that validates with `createProjectInput`, calls `createProject`, logs `project.created` with `projectId`, and returns `{ ok, error }`.
4. Build `src/app/projects/page.tsx` (server component) rendering `ProjectGrid` with data from `listProjects`.
5. Build `src/features/projects/ProjectGrid.tsx`, `ProjectCard.tsx` and `EmptyProjects.tsx` per Interface-spec §5 "Projects".
6. Build `src/features/projects/NewProjectModal.tsx` using `Modal`, `Input`, `Button`; inline errors under fields; success toast "Project created"; refresh the list with `router.refresh()`.
7. Add `loading.tsx` (skeleton grid of 6 cards) and `error.tsx` (error state with retry) in `src/app/projects/`.

## 6. Files
| Path | Action | Purpose |
|---|---|---|
| `src/features/projects/schema.ts` | create | input validation |
| `src/features/projects/server.ts` | create | data access with authorization |
| `src/app/projects/actions.ts` | create | server action |
| `src/app/projects/page.tsx` | modify | replace empty state from task 006 |
| `src/app/projects/loading.tsx` | create | loading state |
| `src/app/projects/error.tsx` | create | error state |
| `src/features/projects/*.tsx` | create | UI components |

## 7. Contracts and data
- `createProjectAction(formData) → { ok: true, projectId } | { ok: false, error: { field?, message } }`
- No schema changes.

## 8. UI details
- Grid: 3 columns ≥1024px, 2 columns 768–1023px, 1 column below.
- Empty state: illustration + "No projects yet" + primary button "New project".
- Modal: focus on `name` when opened; `Esc` closes it; submit button is disabled while pending.

## 9. Acceptance criteria
- [ ] TC-01: A member sees only projects of their organization, sorted by `updatedAt` desc.
- [ ] TC-02: Creating a valid project closes the modal, shows a toast, and the project appears first in the list without a full reload.
- [ ] TC-03: A name shorter than 3 characters shows an inline error and no project is created.
- [ ] TC-04: With 0 projects the empty state is shown; while loading, the skeleton is shown.
- [ ] TC-05: A user without `project:create` permission gets an error from the server action even if they call it directly; input is validated with `createProjectInput` on the server.
- [ ] TC-06: The modal traps focus, closes with `Esc`, and every field has a label.
- [ ] TC-07: `project.created` is logged with `projectId`; the project description is never logged.

## 10. Tests to add or update
- `server.test.ts`: list scoped by org; create denied for a user from another org; create denied without permission.
- `schema.test.ts`: name length boundaries.
- `e2e/projects.spec.ts`: create project happy path, validation error.

## 11. Verification
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — all pass.
- `pnpm test:e2e projects` — passes against the seeded database.
- Manual: `pnpm dev`, sign in as the demo member, check the empty, loading and error states and the create flow on mobile and desktop widths.

## 12. Risks and notes
- Do not add pagination yet — PRD caps v1 at 50 projects per organization; pagination is postponed.
- Keep `server.ts` free of UI imports so task 012 can reuse it.
