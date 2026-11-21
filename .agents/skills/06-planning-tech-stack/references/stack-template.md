# Tech stack planning template

Use this as a quality reference for `.speccraft/docs/05-Tech-Stack.md`.

## Good recommendation characteristics

- one clear default stack
- explicit reasoning tied to product requirements
- realistic alternatives, not a long list
- pragmatic v1 architecture
- visible assumptions and open questions
- practical repo structure: the product in the repository root using the stack's idiomatic layout, with `.agents/`, `.claude/` and `.speccraft/` left untouched
- explicit working directory for commands and build root for hosting/CI (the repository root by default)
- a scaffolding approach that works in a non-empty repository root
- clear delivery sequencing

## Anti-patterns

Avoid:
- recommending microservices by default
- recommending kubernetes for a small v1 without a strong reason
- suggesting multiple frontend frameworks at once
- mixing serverless and long-running worker assumptions without explanation
- listing technologies without tradeoffs
- omitting observability, testing, or deployment

## Example stack categories

A solid plan often covers:
- app runtime
- ui framework
- api approach
- persistence
- auth
- storage
- async processing
- analytics
- observability
- deployment
- testing
