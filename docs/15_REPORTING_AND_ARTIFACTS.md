# Reporting and Artifacts

## Result hierarchy

```text
Test Run
 ├── Test Result
 │    ├── Step Result
 │    └── Artifacts
 └── Summary
```

## Statuses

- Passed
- Failed
- Skipped
- Cancelled
- Crashed

## Artifacts

### Screenshot

Captured:

- On failure
- Explicitly by test
- Optional on every step

### Video

Optional and configurable.

### Trace

Playwright trace for debugging.

### Logs

Capture:

- Platform logs
- Engine logs
- Browser logs
- Test messages
- Errors

### Network evidence

Where supported:

- Request
- Response
- Status
- Timing

## Report levels

### Run summary

```text
Total: 100
Passed: 88
Failed: 9
Skipped: 3
Duration: 12m 18s
```

### Test detail

Show:

- Steps
- Expected
- Actual
- Duration
- Error
- Evidence

### Trends

Show:

- Pass rate
- Failure rate
- Average duration
- Flaky tests
- Most frequent failures

## Artifact rules

- Store outside MongoDB.
- Use generated IDs.
- Prevent path traversal.
- Clean artifacts based on user-configured retention.
- Do not overwrite artifacts from previous runs.
