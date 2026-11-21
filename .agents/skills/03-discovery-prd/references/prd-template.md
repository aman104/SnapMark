# Canonical PRD Template

Use this exact structure and heading order for every generated PRD.

```markdown
# PRD: <product or feature name>

## 1. Product Description

[Provide a clear, concise description of what is being built, what it does, where it lives (e.g., mobile app, web dashboard, CLI tool), and the primary value it delivers to the user.]

---

## 2. Problem & Goals

### 2.1 Problem Statement
[Describe the exact manual pain, workflow gap, product limitation, or business issue this product resolves.]

### 2.2 Product Goals
[Explain the primary outcomes the product should achieve. What does success look like for the user and for the business?]

---

## 3. Target Audience

List the specific user personas interacting with the product:
- **[Primary Persona]**: [Description of their needs, context, and technical proficiency.]
- **[Secondary Persona]**: [Description of their needs and interaction model.]
- **[Stakeholders]**: [Any internal or external parties affected by the product.]

---

## 4. Functional Requirements

Break down the core capabilities. For each capability, detail the expected behavior.

### 4.1 [Core Capability 1]

| Aspect | Description |
|--------|-------------|
| **User Story** | As a [user], I want to [action] so that [value]. |
| **Acceptance Criteria** | 1. ...<br>2. ... |

### 4.2 [Core Capability 2]

| Field / Element | Validation / Source / Behavior |
|-----------------|---------------------------------|
| Field 1 | ... |
| Field 2 | ... |

### 4.3 [Data Processing / Business Logic]
[Describe extraction rules, calculations, automations, state machines, or domain behaviors as needed.]

---

## 5. User Experience & Interface (if applicable)

### 5.1 User Flows
[Step-by-step description of the critical paths, e.g., Onboarding Flow: Sign Up -> Email Verification -> Welcome Dashboard.]

### 5.2 UI States
- **Initial/Empty State**: [What the user sees when there is no data.]
- **Active State**: [What the user sees during normal operation.]
- **Loading State**: [How progress or loading is communicated.]
- **Success State**: [Confirmation behavior.]
- **Error State**: [How incorrect inputs, network failures, or runtime errors are presented.]

*Note: If no UI exists, explicitly state that the product is headless/API/internal and replace this section with the relevant interaction surface.*

---

## 6. Technical Architecture & Constraints

### 6.1 Logical / System Architecture
[High-level description of modules, directories, microservices, or components.]

### 6.2 Technical Stack & Constraints
[Specify required runtimes, platforms, dependencies, storage solutions, or integration points.]

### 6.3 Data Model (High-Level)
[Describe the core entities and relationships needed, e.g., Users, Projects, Invoices.]

---

## 7. Edge Cases & Error Handling

Identify unusual scenarios and how the system should respond:

| Scenario / Edge Case | Expected System Behavior / Resolution |
|----------------------|---------------------------------------|
| User loses internet connection mid-flow | ... |
| Data payload exceeds maximum size | ... |
| Integration API is down | ... |

---

## 8. User Settings & Configuration

List any preferences or settings exposed to the user or admin:

| Setting Name | Type | Default Value | Description / Impact |
|--------------|------|---------------|----------------------|
| ... | ... | ... | ... |

*Note: If configuration is fixed in v1, explicitly state that here.*

---

## 9. Sample Output / Deliverables

[Provide a realistic sample output, JSON payload, generated file fragment, or result preview. If not relevant, state the primary output artifact.]

---

## 10. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | [e.g., Pages must load in under 200ms.] |
| **Scalability** | [e.g., Must support 10,000 concurrent users.] |
| **Security & Privacy** | [e.g., GDPR compliance, data encryption at rest.] |
| **Compatibility** | [e.g., Works on latest Chrome, Safari, iOS 16+.] |

---

## 11. Success Metrics & Analytics (KPIs)

How will we know this feature is successful after launch?

| Metric / KPI | Goal / Target |
|--------------|---------------|
| [e.g., Activation Rate] | [e.g., >40% of signups complete onboarding] |
| [e.g., Error Rate] | [e.g., <1% of API calls fail] |

---

## 12. Future Scope (v2)

Items explicitly excluded from v1 to keep the scope tight:
- [ ] ...
- [ ] ...
- [ ] ...

---

## 13. Risks & Mitigations

| Risk | Impact (Low/Med/High) | Mitigation Strategy |
|------|-----------------------|---------------------|
| ... | ... | ... |
| ... | ... | ... |

---

## 14. Go-To-Market & Launch Strategy

[Briefly describe how this product or feature will be rolled out. E.g., Beta testing group first, phased rollout, marketing announcement channels.]
```

## Adaptation notes

- The headings must stay in this exact order.
- Section names should stay in English unless the user explicitly requests another language.
- Subsections under sections 4, 5, and 6 may be renamed to match the product domain, but numbering should remain consistent.
- Keep the document highly detailed and execution-oriented.
- Prefer concrete fields, examples, user stories, and specific states over abstract strategic language.
