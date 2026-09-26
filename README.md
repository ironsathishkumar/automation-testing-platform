# Local Automation Testing Platform

## Purpose

A local-only, single-developer automation testing platform that provides one UI for designing, executing, analyzing, and reporting software tests across Web, API, Mobile, Performance, Accessibility, Visual, Database, Security, Contract, Architecture, Reliability, File, Notification, and Localization testing.

The platform orchestrates mature testing engines instead of reimplementing them.

## Primary principles

- Local-first: no mandatory cloud/server deployment.
- TypeScript-first platform.
- Next.js App Router + MUI for the UI.
- Node.js + TypeScript backend.
- MongoDB running locally.
- Playwright as the primary web automation engine.
- Pluggable execution engines.
- Standardized test-result contract.
- Evidence stored locally.
- Human approval for AI-generated tests.
- Build the core first; add advanced engines incrementally.

## Documentation map

| File | Purpose |
|---|---|
| [docs/00_PROJECT_OVERVIEW.md](docs/00_PROJECT_OVERVIEW.md) | Product vision and scope |
| [docs/01_APPLICATION_REQUIREMENTS.md](docs/01_APPLICATION_REQUIREMENTS.md) | Functional/non-functional requirements |
| [docs/02_APPLICATION_ARCHITECTURE.md](docs/02_APPLICATION_ARCHITECTURE.md) | Overall technical architecture |
| [docs/03_APPLICATION_STACK.md](docs/03_APPLICATION_STACK.md) | Technology choices |
| [docs/04_END_TO_END_FLOW.md](docs/04_END_TO_END_FLOW.md) | Complete application lifecycle |
| [docs/05_USER_FLOW.md](docs/05_USER_FLOW.md) | User journeys |
| [docs/06_MODULES_AND_FEATURES.md](docs/06_MODULES_AND_FEATURES.md) | Module-by-module feature specification |
| [docs/07_TESTING_ENGINE_ARCHITECTURE.md](docs/07_TESTING_ENGINE_ARCHITECTURE.md) | Pluggable engine design |
| [docs/08_DATABASE_SCHEMA.md](docs/08_DATABASE_SCHEMA.md) | MongoDB schema |
| [docs/09_API_SPECIFICATION.md](docs/09_API_SPECIFICATION.md) | Backend API design |
| [docs/10_PROJECT_FOLDER_STRUCTURE.md](docs/10_PROJECT_FOLDER_STRUCTURE.md) | Repository structure |
| [docs/11_DEVELOPMENT_ROADMAP.md](docs/11_DEVELOPMENT_ROADMAP.md) | Phased development |
| [docs/12_IMPLEMENTATION_CHECKLIST.md](docs/12_IMPLEMENTATION_CHECKLIST.md) | Build checklist |
| [docs/13_LOCAL_DEVELOPMENT_SETUP.md](docs/13_LOCAL_DEVELOPMENT_SETUP.md) | Local environment setup |
| [docs/14_TEST_EXECUTION_FLOW.md](docs/14_TEST_EXECUTION_FLOW.md) | Execution lifecycle |
| [docs/15_REPORTING_AND_ARTIFACTS.md](docs/15_REPORTING_AND_ARTIFACTS.md) | Results and evidence |
| [docs/16_AI_PERSONA_ENGINE.md](docs/16_AI_PERSONA_ENGINE.md) | AI-assisted planning |
| [docs/17_SECURITY_AND_ACCESS.md](docs/17_SECURITY_AND_ACCESS.md) | Local security model |
| [docs/18_ERROR_HANDLING_AND_LOGGING.md](docs/18_ERROR_HANDLING_AND_LOGGING.md) | Error/logging standards |
| [docs/19_TESTING_STRATEGY.md](docs/19_TESTING_STRATEGY.md) | How the platform itself is tested |
| [docs/20_FUTURE_ENHANCEMENTS.md](docs/20_FUTURE_ENHANCEMENTS.md) | Post-MVP roadmap |

## Run locally

Phase 0 and Phase 1 are implemented: the local web app and API cover accounts, projects, applications, environments, test cases, suites, and plans. Execution engines are not running yet.

```bash
cp .env.example .env
docker compose up -d
npm install
npm run dev:api
npm run dev:web
```

Open http://127.0.0.1:3000 and create a local account. API docs are at http://127.0.0.1:4000/api/docs.

If 3000 or 4000 is already taken, change `API_PORT` and the web port together, and set `NEXT_PUBLIC_API_URL` to that API.

## First implementation target

Build V1 around:

1. Projects and applications
2. Environments
3. Test cases
4. Test suites
5. Test plans
6. Web automation with Playwright
7. API testing
8. Test execution
9. Screenshots/video/logs/traces
10. Results and reporting
11. Execution history
12. Basic AI scenario/test generation

Then add Mobile, Performance, Accessibility, Visual, Security, Database, Contract, Architecture, Reliability, and advanced AI capabilities.
