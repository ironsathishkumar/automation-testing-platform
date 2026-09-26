# Application Requirements

## 1. Functional requirements

### FR-001 Project management

The system shall allow users to:

- Create projects.
- Edit projects.
- Archive projects.
- Delete projects with confirmation.
- Select an active project.
- View project execution history.

### FR-002 Application management

Each project can contain applications with:

- Name
- Description
- Application type
- Base URL
- Repository metadata
- Default environment
- Technology metadata

### FR-003 Environment management

An environment shall support:

- Name
- Base URL
- API base URL
- Variables
- Secrets
- Browser settings
- Device settings
- Timeout settings

Secrets must not be displayed in plaintext after initial secure entry.

### FR-004 Test case management

Test cases shall support:

- Title
- Description
- Objective
- Preconditions
- Priority
- Tags
- Type
- Engine
- Steps
- Expected results
- Test data
- Environment
- Status
- Version/history

### FR-005 Test suite management

Suites shall support:

- Ordered test cases
- Tags
- Filters
- Parallel/sequential mode
- Retry policy
- Environment
- Browser
- Timeout

### FR-006 Test execution

The system shall:

- Start execution.
- Stop execution.
- Retry execution.
- Queue local jobs.
- Track execution state.
- Capture logs.
- Capture screenshots.
- Capture video where supported.
- Capture traces where supported.
- Persist results.

### FR-007 Web testing

V1 shall support Playwright-based:

- Chromium
- Firefox
- WebKit where locally supported
- Navigation
- Click
- Fill
- Select
- Checkbox/radio
- Upload
- Download
- Assertions
- Screenshots
- Traces
- Video
- Basic responsive viewport execution

### FR-008 API testing

Support:

- REST
- HTTP methods
- URL parameters
- Headers
- Query parameters
- JSON/body data
- Authentication
- Variables
- Status assertions
- Header assertions
- JSON path/body assertions
- Schema validation
- Response-time assertions

GraphQL is supported as a later V1 feature.

### FR-009 Reporting

Reports shall show:

- Total
- Passed
- Failed
- Skipped
- Duration
- Error summary
- Test details
- Evidence
- Environment
- Browser/device
- Execution timestamp

### FR-010 Search/filter

Search shall support:

- Projects
- Test cases
- Suites
- Runs
- Results
- Tags
- Status
- Date range

## 2. Advanced requirements

The architecture shall support later:

- Mobile/Appium
- k6
- Accessibility
- Visual regression
- Security
- Database
- Contract testing
- Architecture testing
- Reliability/resilience
- Localization
- File testing
- Notification testing
- AI persona engine

## 3. Non-functional requirements

### Performance

- UI should remain responsive during test execution.
- Test execution must run outside request/response lifecycle.
- Large logs must be streamed or paginated.
- Artifacts must not be loaded entirely into memory.

### Reliability

- A worker crash must mark the execution as interrupted/failed.
- Test results must be persisted incrementally where practical.
- A failed test must not corrupt unrelated results.

### Maintainability

- Feature modules must be isolated.
- Execution engines must implement common interfaces.
- Business logic must not depend directly on Playwright APIs.
- Database access must be separated from domain services.

### Security

- Local API must validate all inputs.
- Secrets must be protected.
- Test targets must be explicitly configured.
- Security testing must be restricted to authorized targets.
- Avoid arbitrary unrestricted shell execution from user-controlled test data.

### Usability

- Clear execution state.
- One-click re-run.
- Easy access to evidence.
- Human-readable error messages.
