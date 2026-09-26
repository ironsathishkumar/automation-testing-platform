# Project Overview

## 1. Product name

Working name: **Local Automation Testing Platform**

## 2. Product definition

A desktop/local web application for creating and executing automated software tests from one interface.

It is not intended to replace Playwright, Appium, k6, axe-core, JUnit, pytest, or other mature tools. It orchestrates them through adapters and presents unified configuration, execution, evidence, results, and reporting.

## 3. Problem

Automation testing is usually fragmented:

- UI tests live in code repositories.
- API tests use separate tools.
- Mobile tests use another framework.
- Performance tests have different runners.
- Reports are spread across CI systems.
- Screenshots, traces, videos, and logs are difficult to correlate.
- Test planning and execution are disconnected.

This application creates a single local control plane.

## 4. Goals

### Primary goals

- Create and manage test projects.
- Define reusable environments and variables.
- Create test cases and suites.
- Execute tests locally.
- Support multiple execution engines.
- Capture evidence.
- Standardize results.
- Search historical runs.
- Produce readable reports.
- Support data-driven testing.
- Provide AI-assisted scenario/test generation.

### Non-goals for V1

- Cloud SaaS.
- Multi-user collaboration.
- Distributed cloud execution.
- Billing/subscriptions.
- Public test sharing.
- Building browser/mobile/performance engines from scratch.

## 5. Target user

Initial target: the developer/QA engineer operating the application on a local workstation.

## 6. Success criteria

V1 is successful when a user can:

1. Create a project.
2. Register an application and environment.
3. Create a test case.
4. Run it against a local or authorized test target.
5. Observe live execution status.
6. Inspect logs and evidence.
7. Review pass/fail status.
8. Re-run failed tests.
9. View historical results.
10. Generate a report.

## 7. Core product concept

```text
Project
  -> Application
      -> Environment
          -> Test Suite
              -> Test Case
                  -> Test Steps
                      -> Execution
                          -> Result
                              -> Evidence
                                  -> Report
```
