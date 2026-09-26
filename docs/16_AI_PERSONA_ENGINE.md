# AI Persona Engine

## Purpose

AI assists with test planning and maintenance. It does not silently modify or execute tests without user approval.

## Concept

```text
Persona
  ↓
Goal
  ↓
Workflow
  ↓
Scenario
  ↓
Test Cases
  ↓
Steps
  ↓
Assertions
```

## Persona

Example:

```text
Role: Administrator
Permissions: Manage students
Goal: Register a student
```

## Generated scenarios

Positive:

- Valid registration
- Optional fields
- Successful submission

Negative:

- Missing required field
- Invalid email
- Duplicate email

Security:

- Unauthenticated access
- Insufficient permission

Boundary:

- Minimum/maximum values

Regression:

- Existing workflow remains functional

## AI workflow

1. User provides requirement.
2. AI produces structured scenarios.
3. Platform validates output schema.
4. User reviews.
5. User approves/edits.
6. Test cases are created.
7. User executes them.

## Failure analysis

Input:

- Error
- Failed step
- Screenshot
- Trace metadata
- Logs
- Recent result history

Output:

- Summary
- Likely category
- Evidence references
- Suggested investigation
- Possible fix

AI output must be presented as suggestions, not facts.

## Provider abstraction

```ts
interface AiProvider {
  generate(input: AiRequest): Promise<AiResponse>;
}
```

This allows changing providers later.

## Safety

- Never allow AI to execute arbitrary shell commands.
- Never allow unrestricted security scans.
- Never automatically modify production targets.
- Require explicit execution approval.
