# Test Execution Flow

## State machine

```text
QUEUED
  ↓
VALIDATING
  ↓
RUNNING
  ├── STEP_RUNNING
  ├── STEP_PASSED
  ├── STEP_FAILED
  └── ARTIFACT_CREATED
  ↓
COMPLETED
```

Alternative terminal states:

```text
CANCELLED
CRASHED
```

## Execution sequence

1. User starts run.
2. API validates test configuration.
3. API creates `testRun`.
4. API creates execution jobs.
5. Worker claims a job.
6. Worker loads environment variables.
7. Worker initializes engine.
8. Engine validates runtime.
9. Engine executes steps.
10. Events are emitted.
11. Artifacts are created.
12. Result is persisted.
13. Job is completed.
14. Run counters are updated.
15. Report is generated.

## Retry

Retry only according to configured policy.

```text
attempt 1 → failed
attempt 2 → failed
attempt 3 → passed
```

Store all attempts for diagnosis.

## Cancellation

```text
RUNNING
  ↓
CANCEL_REQUESTED
  ↓
Engine cancellation
  ↓
CANCELLED
```

## Parallel execution

V1 may support controlled parallelism.

Do not run unlimited browser processes.

Use a local concurrency limit.

## Failure classification

Classify:

- Assertion failure
- Element not found
- Timeout
- Network error
- Configuration error
- Engine error
- Application crash
- Worker crash
- Cancelled
