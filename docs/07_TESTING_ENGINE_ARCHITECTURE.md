# Testing Engine Architecture

## 1. Principle

The platform owns orchestration. Specialized tools own execution.

```text
Platform
  ↓
Engine Registry
  ↓
Engine Adapter
  ↓
External/mature engine
```

## 2. Engine contract

```ts
interface TestEngine {
  type: EngineType;
  validate(config: unknown): Promise<ValidationResult>;
  execute(context: ExecutionContext): Promise<EngineResult>;
  cancel(id: string): Promise<void>;
  getCapabilities(): EngineCapabilities;
}
```

## 3. Engine types

```text
WEB_PLAYWRIGHT
API
MOBILE_APPIUM
PERFORMANCE_K6
ACCESSIBILITY_AXE
VISUAL
SECURITY_ZAP
DATABASE
CONTRACT
ARCHITECTURE
RELIABILITY
FILE
NOTIFICATION
LOCALIZATION
CODE_QUALITY
```

## 4. Common execution context

```ts
interface ExecutionContext {
  runId: string;
  testId: string;
  projectId: string;
  environmentId: string;
  variables: Record<string, unknown>;
  artifactDirectory: string;
  timeoutMs: number;
}
```

## 5. Common result

```ts
interface EngineResult {
  status: "passed" | "failed" | "skipped" | "cancelled";
  durationMs: number;
  steps: StepResult[];
  errors: ExecutionError[];
  artifacts: ArtifactReference[];
  metrics?: Record<string, number>;
}
```

## 6. Web engine

Playwright handles:

- Browser launch
- Context
- Page
- Actions
- Assertions
- Screenshots
- Video
- Trace

The platform stores configuration and results, not Playwright internals.

## 7. API engine

The API engine handles:

- HTTP requests
- Authentication
- Variables
- Assertions
- JSON/schema validation

## 8. Process-based engines

For tools such as k6 or external runners:

```text
Platform
 ↓
Spawn controlled process
 ↓
Capture stdout/stderr
 ↓
Capture exit code
 ↓
Parse result
 ↓
Persist standardized result
```

All process execution must use an allowlisted executable/configuration model.

## 9. Engine registry

```ts
engineRegistry.register(playwrightEngine);
engineRegistry.register(apiEngine);
engineRegistry.register(k6Engine);
```

Later engines can be added without changing core test management.
