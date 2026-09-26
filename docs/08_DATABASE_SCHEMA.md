# Database Schema

MongoDB is the primary metadata/result database.

## 1. users

```text
_id: ObjectId
firstName: string
lastName: string
email: string unique
passwordHash: string
status: active|inactive
createdAt: Date
updatedAt: Date
```

## 2. projects

```text
_id: ObjectId
name: string
key: string unique
description: string
status: active|archived
createdBy: ObjectId
createdAt: Date
updatedAt: Date
```

## 3. applications

```text
_id: ObjectId
projectId: ObjectId
name: string
type: web|api|mobile|desktop|service
description: string
baseUrl?: string
apiBaseUrl?: string
repository?: object
createdAt: Date
updatedAt: Date
```

## 4. environments

```text
_id: ObjectId
projectId: ObjectId
name: string
type: local|dev|qa|staging|custom
baseUrl?: string
apiBaseUrl?: string
variables: [
  {
    key: string
    value: string
    isSecret: boolean
  }
]
settings: object
createdAt: Date
updatedAt: Date
```

## 5. testCases

```text
_id: ObjectId
projectId: ObjectId
applicationId: ObjectId
environmentId?: ObjectId
key: string
title: string
description?: string
objective?: string
type: string
engineType: string
priority: low|medium|high|critical
status: draft|ready|deprecated
tags: string[]
preconditions: string[]
steps: TestStep[]
testData?: object
createdBy: ObjectId
createdAt: Date
updatedAt: Date
```

## TestStep

```text
id: string
order: number
action: string
target?: string
value?: unknown
assertion?: object
timeoutMs?: number
```

## 6. testSuites

```text
_id: ObjectId
projectId: ObjectId
name: string
description?: string
testCaseIds: ObjectId[]
executionMode: sequential|parallel
retryCount: number
tags: string[]
createdAt: Date
updatedAt: Date
```

## 7. testPlans

```text
_id: ObjectId
projectId: ObjectId
name: string
suiteIds: ObjectId[]
environmentId: ObjectId
browserConfig?: object
variables?: object
createdAt: Date
updatedAt: Date
```

## 8. testRuns

```text
_id: ObjectId
projectId: ObjectId
planId?: ObjectId
suiteId?: ObjectId
status: queued|running|passed|failed|cancelled|crashed
startedAt?: Date
completedAt?: Date
durationMs?: number
total: number
passed: number
failed: number
skipped: number
cancelled: number
triggeredBy: ObjectId
createdAt: Date
```

## 9. testResults

```text
_id: ObjectId
runId: ObjectId
testCaseId: ObjectId
status: passed|failed|skipped|cancelled
durationMs: number
steps: ResultStep[]
error?: object
artifactIds: ObjectId[]
metrics?: object
createdAt: Date
```

## 10. artifacts

```text
_id: ObjectId
projectId: ObjectId
runId: ObjectId
resultId?: ObjectId
type: screenshot|video|trace|log|report|network|other
fileName: string
relativePath: string
mimeType: string
sizeBytes: number
createdAt: Date
```

## 11. executionJobs

```text
_id: ObjectId
runId: ObjectId
testCaseId?: ObjectId
engineType: string
status: queued|running|completed|failed|cancelled
attempt: number
payload: object
startedAt?: Date
completedAt?: Date
createdAt: Date
```

## 12. aiRequests

```text
_id: ObjectId
projectId: ObjectId
type: scenario_generation|test_generation|failure_analysis
input: object
output: object
approved: boolean
createdAt: Date
```

## 13. auditLogs

```text
_id: ObjectId
userId: ObjectId
action: string
resourceType: string
resourceId: ObjectId
metadata?: object
createdAt: Date
```

## Indexes

Recommended:

```text
users.email unique
projects.key unique
testCases.projectId + key
testCases.projectId + tags
testRuns.projectId + createdAt
testResults.runId
executionJobs.status + createdAt
artifacts.runId
```

## Relationship model

```text
Project
 ├── Applications
 ├── Environments
 ├── TestCases
 ├── TestSuites
 │    └── TestCases
 ├── TestPlans
 │    └── Suites
 └── TestRuns
      └── TestResults
           └── Artifacts
```
