# Error Handling and Logging

## Error categories

```text
VALIDATION_ERROR
AUTH_ERROR
NOT_FOUND
CONFLICT
CONFIGURATION_ERROR
ENGINE_ERROR
EXECUTION_ERROR
TIMEOUT_ERROR
ARTIFACT_ERROR
DATABASE_ERROR
INTERNAL_ERROR
```

## API error response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid test configuration",
    "details": []
  }
}
```

## Logging levels

- error
- warn
- info
- debug

## Structured log fields

```text
timestamp
level
service
runId
testId
jobId
engine
message
metadata
```

## Do not log

- Passwords
- API keys
- Access tokens
- Secret variables
- Full sensitive request bodies

## Worker errors

Worker must:

1. Log error.
2. Mark job failed/crashed.
3. Persist result if possible.
4. Attach relevant artifact.
5. Update test run.
6. Release resources.

## Timeouts

Every external operation should have a bounded timeout.

Examples:

- API request timeout
- Browser action timeout
- Test timeout
- Worker process timeout

## Cleanup

After execution:

- Close browser
- Stop processes
- Release temporary resources
- Flush logs
- Persist final result
