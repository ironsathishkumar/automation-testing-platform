# End-to-End Flow

## 1. Create project

```text
User
 ↓
Create Project
 ↓
Project stored in MongoDB
```

## 2. Configure application

```text
Project
 ↓
Application
 ↓
Environment
 ↓
Base URL / API URL / variables
```

## 3. Create test

```text
Test Case
 ↓
Select Engine
 ↓
Add Steps
 ↓
Assertions
 ↓
Save
```

## 4. Build suite

```text
Test Cases
 ↓
Test Suite
 ↓
Order / filters / retries / environment
```

## 5. Execute

```text
Run
 ↓
Validate configuration
 ↓
Create TestRun
 ↓
Create ExecutionJob
 ↓
Worker
 ↓
Engine Adapter
 ↓
Target Application
```

## 6. Capture

```text
Execution
 ├── Logs
 ├── Screenshots
 ├── Video
 ├── Trace
 ├── Network metadata
 └── Error details
```

## 7. Persist

```text
TestRun
 ├── status
 ├── duration
 ├── counters
 └── result references

TestResult
 ├── status
 ├── steps
 ├── error
 └── artifact references
```

## 8. Report

```text
Results
 ↓
Aggregation
 ↓
Report
 ↓
Dashboard
```

## 9. Re-run failed tests

```text
Failed results
 ↓
Select failed
 ↓
Create new execution
 ↓
Run
 ↓
Compare with previous result
```

## 10. Regression

```text
Baseline suite
 ↓
Environment
 ↓
Execute
 ↓
Compare results
 ↓
Identify regressions
```
