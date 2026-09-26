# Application Stack

## Frontend

- Next.js
- App Router
- TypeScript
- React
- Material UI
- React Hook Form
- Zod
- TanStack Query
- Recharts
- ESLint

No Tailwind CSS.
No Vite.

## Backend

- Node.js
- TypeScript
- NestJS
- Mongoose
- MongoDB
- JWT
- Argon2
- Joi or Zod
- Swagger/OpenAPI
- Winston

## Test engines

### Web

- Playwright

### API

- Node.js HTTP client/fetch
- Playwright APIRequest where useful
- JSON Schema validation

### Mobile

- Appium
- Android emulator
- iOS simulator on macOS

### Performance

- k6

### Accessibility

- axe-core
- Lighthouse

### Visual

- Playwright screenshots
- Pixel/diff comparison library

### Security

- OWASP ZAP for controlled authorized testing
- Dependency scanners

### Code quality

- ESLint
- TypeScript compiler
- Optional SonarQube integration
- Language-specific tools when needed

## Storage

V1:

```text
MongoDB → metadata/results
Local filesystem → screenshots/videos/logs/traces
```

Keep an artifact-storage interface so Google Drive or object storage can be added later.

## Development tools

- Git
- VS Code/Cursor
- npm
- Docker optional
- MongoDB Compass optional

## Operating system

The platform should target:

- Windows
- Linux
- macOS

Mobile iOS execution requires macOS tooling.

## Language policy

TypeScript is the primary platform language.

Other languages are supported through external runners rather than forced into the core platform.
