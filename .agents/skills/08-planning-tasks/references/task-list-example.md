# Task list example

Quality reference for `.speccraft/milestones/[Mnn]-[slug]/tasks.md`. Example product: a B2B SaaS for managing client projects (Next.js + TypeScript, PostgreSQL + Prisma, Auth.js, Sentry, Vercel). It shows both task lists after M01 was accepted and M02 was planned.

Note that:

- the prototype milestone builds the real frontend with mock data
- the foundation milestone swaps mocks for real data step by step
- numbering continues across milestones
- every description names its source documents and a clear "done" signal

`.speccraft/milestones/M01-clickable-prototype/tasks.md`:

```text
# M01 - Clickable prototype

[x] 001 - Scaffold Next.js project with tooling - Initialize a Next.js + TypeScript project in the repository root using pnpm, as defined in 05-Tech-Stack.md section 3. Configure ESLint, Prettier, path aliases and Vitest with one passing smoke test. Create the folder structure from 05-Tech-Stack.md section 8. The task is done when install, lint, test and build commands all succeed.

[x] 002 - Implement design tokens and UI primitives - Translate colors, typography, spacing, radii and shadows from 03-Design.md into CSS variables and Tailwind theme config, and build Button, Input, Select, Badge, Card, Modal, Toast and Skeleton with all documented variants. Components use only design tokens and are keyboard accessible. The task is done when a dev-only preview page renders every variant matching 03-Design.md.

[x] 003 - Create app shell and navigation - Build the app layout with sidebar, header and content area described in 04-Interface-spec.md section 4, and add routes for every page in the sitemap from section 2. Add 404 and 500 pages. The task is done when every route is reachable from the navigation and the layout adapts to all three breakpoints.

[x] 004 - Add mock data layer with fixtures - Create a data-access layer in src/data with typed interfaces for organizations, projects, tasks and members, and a mock implementation backed by realistic fixtures. Screens must read data only through this layer. The task is done when fixtures for 3 organizations, 12 projects and 80 tasks are available through typed functions with unit tests.

[x] 005 - Build projects screens on mock data - Implement the Projects list, Project detail and New Project modal from 04-Interface-spec.md sections 5 and 6 using the mock data layer. Creating a project updates in-memory state so the flow can be clicked through. The task is done when the "Creating a new project" flow from 04-Interface-spec.md section 3 works end to end.

[x] 006 - Build tasks and members screens on mock data - Implement the task board, task drawer and Members screen from 04-Interface-spec.md using the mock data layer. Include filters and status changes in in-memory state. The task is done when the "Completing a task" flow from 04-Interface-spec.md section 3 works end to end.

[x] 007 - Build sign-in, sign-up and settings screens - Implement the auth screens and the Settings screen from 04-Interface-spec.md with full form validation states but no real authentication; submitting sign-in navigates to the dashboard. The task is done when all forms show inline validation errors and success paths navigate as specified.

[x] 008 - Add demonstrable states and demo instructions - Add a dev-only ?state=empty|loading|error switch to every list and form, verify responsive behavior at 375, 768 and 1280 px, and document the demo steps in README.md. The task is done when every screen shows all three states on demand and the README demo steps work.
```

`.speccraft/milestones/M02-foundations-auth-and-access-control/tasks.md`:

```text
# M02 - Foundations, authentication and access control

[ ] 009 - Set up database, schema and migrations - Configure PostgreSQL via docker compose and Prisma with the schema for users, organizations and memberships from 02-General-PRD.md data requirements. Add the first migration and a seed script that mirrors the M01 fixtures. The task is done when migrations run on a clean database and the seed script populates it.

[ ] 010 - Add logging, error tracking and CI - Add a pino JSON logger with request ids and redaction, Sentry for server and client, and a GitHub Actions workflow running lint, typecheck, test and build. The task is done when a deliberately thrown error is logged with a request id and captured by Sentry in test mode, and CI passes with the pnpm cache keyed on pnpm-lock.yaml.

[ ] 011 - Implement authentication - Replace the prototype sign-in and sign-up with Auth.js email and password authentication as specified in 05-Tech-Stack.md, with hashed passwords, rate-limited sign-in and secure session cookies. Protect all app routes. The task is done when a new user can register, sign in, reach the dashboard and sign out, and unauthenticated access redirects to sign-in.

[ ] 012 - Enforce roles and access control - Implement owner, admin and member roles per organization from 02-General-PRD.md and a central authorize() helper, denying access by default. Add tests for allowed and denied cases per role. The task is done when role-matrix tests pass and members cannot perform owner or admin actions.

[ ] 013 - Switch members screen to real data - Implement the database-backed version of the members data-access functions and switch the Members screen and invitations from mock to real data, enforcing access control. Keep the mock implementation for screens not yet migrated. The task is done when inviting and removing members works against the database with correct permissions.
```
