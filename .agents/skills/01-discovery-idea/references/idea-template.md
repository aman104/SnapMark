# Product Idea Description Template

Use this structure and section order when generating and iterating the `.speccraft/docs/01-Idea.md` file.

```markdown
# Idea: <product name or working title>

## 1. Product vision

[One or two sentences describing what the product is and what value it delivers to the user. Should be understandable by a non-technical person.]

---

## 2. Problem

[What specific problem, pain point, inefficiency, or market gap the product solves. Describe the current situation "without the product" — what the user does today and why it's bad.]

---

## 3. Target audience

- **Primary user**: [who they are, what they do, in what context they work]
- **Secondary users**: [other groups that may benefit]
- **Anti-persona**: [who is NOT the target user and why]

---

## 4. Value proposition

[Why the user should choose this product. What do they gain? How does their situation change after using the product? One to three key benefits.]

---

## 5. Key features (v1)

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| 1 | ...     | ...         | must-have / nice-to-have |

[List of the most important features for the first version. Focus on the minimum that delivers value.]

---

## 6. How it works (user flow)

[Describe step by step how the user interacts with the product — from first contact to achieving value. Can be a list of steps or a simple scenario.]

1. User ...
2. System ...
3. User ...
4. Result: ...

---

## 7. Inspiration and competition

| Product / solution | What it does well | What's missing / what we do differently |
|--------------------|-------------------|-----------------------------------------|
| ...                | ...               | ...                                     |

[What existing products, tools, or approaches address the same problem? How does our idea stand out?]

---

## 8. Business model (preliminary)

- **Revenue model**: [freemium / subscription / one-time fee / ads / other]
- **Who pays**: [end user / company / other party]
- **Estimated price**: [if known, approximate price point]

[If the model is not yet defined, describe which options you are considering.]

---

## 9. Risks and unknowns

| Risk / question | Impact | Status |
|-----------------|--------|--------|
| ...             | ...    | open / researched / accepted |

[What might not work? What assumptions need validation? What questions are still open?]

---

## 10. Next steps

- [ ] ...
- [ ] ...
- [ ] ...

[What needs to be done to move to the PRD phase and product building.]

---

## Change log

| Date | What changed |
|------|--------------|
| ...  | First version |
```

## Adaptation guidelines

- Sections must remain in this order.
- Section names should be in the user's language (default English).
- Section 5 (features) should be concise — this is not a PRD, just an outline.
- Section 9 (risks) should contain real concerns, not filler.
- The change log at the end of the document tracks idea iterations.
