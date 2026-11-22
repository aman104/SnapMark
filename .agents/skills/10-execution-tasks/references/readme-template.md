# README template

Use this structure for the product's `README.md` in the repository root. Replace every section with project-specific content and drop sections that do not fit the product type (e.g. no "run locally" server for a library; add "usage" with examples for a CLI or library). Commands run from the repository root unless stated otherwise. Link workflow context with repository-relative paths (e.g. `.speccraft/docs/01-Idea.md`).

# [project name]

[one short paragraph explaining what the product is, who it is for, and what problem it solves]

## implemented scope

- [feature or flow 1]
- [feature or flow 2]
- [feature or flow 3]

## product context

- source Idea: `.speccraft/docs/01-Idea.md`
- source PRD: `.speccraft/docs/02-General-PRD.md`
- source tech stack plan: `.speccraft/docs/05-Tech-Stack.md`
- source design system plan: `.speccraft/docs/03-Design.md`
- source interface spec: `.speccraft/docs/04-Interface-spec.md`
- milestones: `.speccraft/milestones.md`
- task lists, plans and reports per milestone: `.speccraft/milestones/`
- project progress: `.speccraft/progress.md`

## stack

[one line per relevant layer, e.g.]
- frontend / client: [actual choice or none]
- backend: [actual choice or none]
- data: [actual choice or none]
- styling: [actual choice or none]
- packaging / deployment target: [actual choice]

## architecture notes

[brief explanation of the chosen runtime shape, important modules, and major technical decisions]

## prerequisites

- [runtime]
- [package manager]
- [database or external services if needed]

## getting started

The commands below run from the repository root.

### install

```bash
[real install command]
```

### run locally

```bash
[real dev command]
```

### build

```bash
[real build command]
```

## environment variables

Document every required variable.

```bash
[example variables]
```

Explain each variable briefly below the code block.

## available scripts

- `[script]`: [what it does]
- `[script]`: [what it does]

## project structure

```text
[actual high-level folder tree]
```

## main flows

### [flow name]

[what the user does and which part of the app handles it]

## testing and quality

[state what tests or checks exist and how to run them]

## deployment / distribution

[how the product is deployed, published or distributed, or what remains to connect; name the build root for hosting/CI if it is not the repository root]

## assumptions and deferred scope

- [assumption]
- [deferred item]
- [known limitation]
