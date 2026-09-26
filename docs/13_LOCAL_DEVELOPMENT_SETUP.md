# Local Development Setup

## Prerequisites

Install:

- Node.js LTS
- npm
- Git
- MongoDB Community Server
- MongoDB Compass optional
- VS Code/Cursor
- Playwright browsers

For mobile later:

- Android Studio
- Android SDK
- Android emulator
- Appium

For iOS later:

- macOS
- Xcode
- iOS Simulator

## Install dependencies

```bash
npm install
```

## Install Playwright browsers

```bash
npx playwright install
```

## Start MongoDB

Run MongoDB locally using the operating system service or local installation.

Example connection:

```text
mongodb://127.0.0.1:27017/automation_testing_platform
```

## Environment

Example:

```env
NODE_ENV=development
API_PORT=4000
WEB_PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/automation_testing_platform
JWT_SECRET=replace-with-local-secret
ARTIFACT_ROOT=./storage/artifacts
LOG_ROOT=./storage/logs
```

## Run API

```bash
npm run dev:api
```

## Run web

```bash
npm run dev:web
```

## Open

```text
http://localhost:3000
```

## Local artifact layout

```text
storage/
├── artifacts/
│   └── {projectId}/
│       └── {runId}/
│           ├── screenshots/
│           ├── videos/
│           ├── traces/
│           └── logs/
├── reports/
└── logs/
```

## Local-only security

Bind services to localhost unless remote access is explicitly required.

Do not expose the API publicly.
