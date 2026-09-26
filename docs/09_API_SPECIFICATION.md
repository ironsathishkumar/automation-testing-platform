# API Specification

Base URL:

```text
http://localhost:4000/api
```

## Authentication

```text
POST /auth/login
POST /auth/logout
GET  /auth/me
```

## Projects

```text
GET    /projects
POST   /projects
GET    /projects/:id
PATCH  /projects/:id
DELETE /projects/:id
```

## Applications

```text
GET    /projects/:projectId/applications
POST   /projects/:projectId/applications
GET    /applications/:id
PATCH  /applications/:id
DELETE /applications/:id
```

## Environments

```text
GET    /projects/:projectId/environments
POST   /projects/:projectId/environments
GET    /environments/:id
PATCH  /environments/:id
DELETE /environments/:id
```

## Test cases

```text
GET    /projects/:projectId/test-cases
POST   /projects/:projectId/test-cases
GET    /test-cases/:id
PATCH  /test-cases/:id
DELETE /test-cases/:id
POST   /test-cases/:id/validate
```

## Test suites

```text
GET    /projects/:projectId/test-suites
POST   /projects/:projectId/test-suites
GET    /test-suites/:id
PATCH  /test-suites/:id
DELETE /test-suites/:id
```

## Test runs

```text
POST   /test-runs
GET    /test-runs
GET    /test-runs/:id
POST   /test-runs/:id/cancel
POST   /test-runs/:id/retry
POST   /test-runs/:id/rerun-failed
```

## Results

```text
GET /test-runs/:runId/results
GET /test-results/:id
```

## Artifacts

```text
GET /artifacts/:id
GET /test-results/:id/artifacts
```

## Reports

```text
GET /test-runs/:runId/report
POST /test-runs/:runId/report/export
```

## AI

```text
POST /ai/scenarios/generate
POST /ai/test-cases/generate
POST /ai/failure-analysis
POST /ai/requests/:id/approve
```

## API standards

Every response should use a predictable shape:

```json
{
  "success": true,
  "data": {},
  "message": "Success"
}
```

Errors:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": []
  }
}
```

Use Swagger/OpenAPI to document all endpoints.
