# Application Architecture

## 1. Architecture style

Use a modular monolith for V1 with a separate local worker/execution process where useful.

Do not begin with microservices.

```text
┌──────────────────────────────────────────┐
│              Next.js Web UI              │
│                 MUI                      │
└───────────────────┬──────────────────────┘
                    │ HTTP
                    ▼
┌──────────────────────────────────────────┐
│        Node.js / TypeScript API          │
│              NestJS                      │
├──────────────────────────────────────────┤
│ Auth / Projects / Tests / Runs / Reports │
│ Orchestration / Artifacts / Settings     │
└───────────────────┬──────────────────────┘
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
┌───────────────────┐ ┌────────────────────┐
│ Local MongoDB     │ │ Execution Workers  │
└───────────────────┘ ├────────────────────┤
                      │ Playwright         │
                      │ API Runner         │
                      │ Appium (later)     │
                      │ k6 (later)         │
                      └────────────────────┘
```

## 2. Architectural layers

### Presentation

Next.js App Router + MUI.

Responsibilities:

- Navigation
- Forms
- Dashboards
- Test builder
- Execution controls
- Result visualization

### API

NestJS modules:

- Auth
- Projects
- Applications
- Environments
- Test Cases
- Suites
- Plans
- Runs
- Results
- Artifacts
- Reports
- Settings
- AI

### Domain

Contains:

- Test entities
- Execution state machine
- Engine contracts
- Validation
- Business rules
- Report aggregation

### Infrastructure

Contains:

- MongoDB repositories
- Playwright adapter
- Local artifact storage
- Process management
- Logging
- Configuration

## 3. Execution isolation

Do not execute browser jobs inside API request handlers.

```text
POST /test-runs
      ↓
Create run
      ↓
Queue local job
      ↓
Worker picks job
      ↓
Execute
      ↓
Persist events/results
      ↓
Update run
```

## 4. Engine abstraction

Every engine should implement a standard contract.

```ts
interface TestEngine {
  readonly type: string;
  validate(config: unknown): Promise<void>;
  execute(context: ExecutionContext): Promise<EngineResult>;
  cancel(executionId: string): Promise<void>;
}
```

## 5. Event model

Execution events:

- queued
- started
- step_started
- step_passed
- step_failed
- artifact_created
- warning
- retry_started
- completed
- cancelled
- crashed

The UI can poll initially. WebSocket/SSE can be added later.

## 6. Local-only deployment

Recommended V1 process model:

```text
Browser
  ↓
Next.js :3000
  ↓
API :4000
  ↓
MongoDB :27017

Worker
  ↓
Playwright
  ↓
Target application
```

No cloud infrastructure is required.
