# Testing Strategy

The platform itself must be tested.

## Unit tests

Test:

- Domain rules
- Validators
- State transitions
- Result aggregation
- Retry logic
- Artifact path generation

## Integration tests

Test:

- MongoDB repositories
- API modules
- Engine adapters
- Artifact storage
- Execution orchestration

## E2E tests

Test the platform UI:

```text
Login
 ↓
Create project
 ↓
Create application
 ↓
Create environment
 ↓
Create test
 ↓
Run test
 ↓
View result
```

## Engine tests

### Playwright

Use a dedicated sample application as the controlled test target.

Test:

- Successful login
- Failed login
- Form validation
- Navigation
- Upload
- Download
- Assertions

### API

Use a local mock/sample API.

Test:

- 2xx
- 4xx
- 5xx
- Authentication
- Schema validation
- Timeout

## Regression

Every feature release should run:

- Core unit tests
- API integration tests
- Platform E2E
- Engine smoke tests

## Performance

The platform should measure:

- Test creation response time
- Run creation time
- Result persistence time
- Dashboard load time
- Concurrent local executions

## Reliability

Test:

- Worker crash
- Engine timeout
- Browser crash
- API failure
- MongoDB interruption
- Cancelled execution

## Security

Test:

- Input validation
- Authentication
- Authorization
- Path traversal protection
- Command injection protection
- Secret leakage in logs
