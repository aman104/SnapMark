# Milestones example

All file paths are repository-relative; the product lives in the repository root and commands run from there.

This is a quality reference for `.speccraft/milestones.md`. Example product: a B2B SaaS for managing client projects (Next.js + TypeScript, PostgreSQL + Prisma, Auth.js, Sentry, Vercel).

- Phases 6 and 7 are merged because the product is small.
- Three milestones are shown in full, the rest in short form.

```markdown
# Milestones: ClientDesk

## Roadmap

| Phase | Milestones | What you will see at the end | Status |
|---|---|---|---|
| 1. Look & feel | M01 | a style guide page in the real app: colors, fonts, buttons, forms, cards, modals in all states | planned |
| 2. Clickable prototype | M02 | every ClientDesk screen clickable on sample data, on mobile and desktop | planned |
| 3. Foundations | M03 | real sign-up and sign-in, organizations and roles, members screen on real data | planned |
| 4. Core features | M04 | projects and tasks created, edited and completed on real data | planned |
| 5. Complete features | M05 | email notifications and CSV export | planned |
| 6–7. Quality & release | M06 | e2e tests of main flows, performance and accessibility report, ready-to-deploy configuration | planned |

## [ ] M01 - Look & feel
- **Phase:** 1 — Look & feel
- **Type:** prototype
- **What you will see:** Before: only documents. After: the real app runs locally and shows a style guide page with ClientDesk's colors, typography and every component, so you can judge the visual language on a real screen.
- **Goal:** Set up the real frontend and implement the design system from `03-Design.md`, so that every later screen is built from approved building blocks.
- **Scope:**
  - Next.js + TypeScript scaffold with Tailwind and the project structure from `05-Tech-Stack.md §8`
  - design tokens (colors, typography, spacing, radii, shadows) from `03-Design.md`
  - components: Button, Input, Select, Checkbox, Badge, Card, Modal, Drawer, Toast, Table, Tabs, Skeleton, EmptyState
  - `/styleguide` page (dev only) showing every component in every state and variant
- **Out of scope:**
  - application screens (M02)
- **Demo for the operator:**
  - `pnpm install && pnpm dev`, open `http://localhost:3000/styleguide`
  - compare colors, fonts and components with `03-Design.md` and `.speccraft/mockup/`
- **Exit criteria:**
  - [ ] every component from `03-Design.md` is on the style guide page with all documented states
  - [ ] only design tokens are used (no hard-coded colors or spacing)
  - [ ] components are keyboard accessible with a visible focus ring
  - [ ] `pnpm lint && pnpm typecheck && pnpm build` pass
- **Depends on:** none
- **Estimated size:** 5–7 tasks

## [ ] M02 - Clickable prototype
- **Phase:** 2 — Clickable prototype
- **Type:** prototype
- **What you will see:** Before: a style guide. After: the whole ClientDesk app, every screen, modal and navigation path, clickable with realistic sample data. Create a project, add a task, complete it, all without a backend.
- **Goal:** Validate navigation, layout and flows on the real frontend before any backend work, while changes are still cheap.
- **Scope:**
  - app shell, sidebar and header from `Interface-spec §4`
  - all screens from `Interface-spec §2` sitemap: sign-in, sign-up, dashboard, projects, project detail, tasks, members, settings
  - modals and drawers from `Interface-spec §6`
  - mock data layer `src/data/` with fixtures for 3 organizations, 12 projects, 80 tasks
  - empty, loading and error states switchable with `?state=empty|loading|error` (dev only)
  - responsive layout for mobile, tablet and desktop
- **Out of scope:**
  - database, real authentication, persistence (M03)
- **Demo for the operator:**
  - `pnpm dev`, open `http://localhost:3000`; the sign-in button leads to the dashboard without credentials
  - walk through the flows from `Interface-spec §3`: create project, add task, complete task
  - append `?state=empty` / `?state=error` to any list page
- **Exit criteria:**
  - [ ] every route from the sitemap renders without console errors
  - [ ] every core flow from `Interface-spec §3` can be clicked through end to end on mock data
  - [ ] empty, loading and error states exist for every list and form
  - [ ] layout works at 375 px, 768 px and 1280 px widths
  - [ ] `pnpm lint && pnpm typecheck && pnpm build` pass
- **Depends on:** M01
- **Estimated size:** 8–10 tasks

## [ ] M03 - Foundations, authentication and access control
- **Phase:** 3 — Foundations
- **Type:** foundation
- **What you will see:** Before: a prototype where nothing is saved. After: you register a real account, sign in, invite a member, and the data is still there after a restart. A member is denied owner actions.
- **Goal:** Put the prototype on real infrastructure (PostgreSQL, authentication, roles, logging, error tracking, CI), so that every later feature is built on real data and secure defaults.
- **Scope:**
  - PostgreSQL + Prisma schema for users, organizations, memberships; migrations and seed (`PRD §7 data`)
  - Auth.js email + password sign-up, sign-in, sign-out (`PRD FR-1..FR-3`)
  - roles owner/admin/member and central `authorize()` helper (`PRD FR-4`)
  - pino logging, Sentry, request ids; GitHub Actions CI
  - members screen switched from mock data to real data
- **Out of scope:**
  - projects and tasks on real data (M04)
- **Demo for the operator:**
  - `docker compose up -d && pnpm db:migrate && pnpm db:seed && pnpm dev`
  - register a new account, sign out, sign in; invite a member as owner; try the same as member (denied)
- **Exit criteria:**
  - [ ] sign-up, sign-in and sign-out work against the database
  - [ ] a member cannot perform owner/admin actions (tests prove it)
  - [ ] errors are captured by Sentry in test mode and logs are JSON with request ids
  - [ ] CI runs lint, typecheck, tests and build and passes
- **Depends on:** M02
- **Estimated size:** 8–12 tasks

## [ ] M04 - Projects and tasks on real data
- **Phase:** 4 — Core features
- **What you will see:** Before: projects and tasks were sample data. After: they are created, edited and completed for real and shared within your organization.
...

## [ ] M05 - Notifications and CSV export
- **Phase:** 5 — Complete features
...

## [ ] M06 - Quality and release
- **Phase:** 6–7 — Quality & release
...

## Coverage

| Requirement / screen | Milestone |
|---|---|
| Design system components | M01 |
| Interface-spec all screens | M02 |
| PRD FR-1..FR-3 authentication | M02 (UI), M03 (logic) |
| PRD FR-4 roles | M03 |
| PRD FR-5..FR-9 projects and tasks | M02 (UI), M04 (logic) |
| PRD FR-10 email notifications | M05 |
| PRD FR-11 CSV export | M02 (UI), M05 (logic) |
| PRD §9 non-functional: performance, accessibility | M06 (hardening), criteria in every milestone |
```
