# Security and Access

## Local-only security model

The application is designed for localhost use.

Recommended:

```text
Web → localhost:3000
API → localhost:4000
MongoDB → localhost:27017
```

## Authentication

Even for local use, implement application authentication if sensitive test credentials are stored.

- Argon2 password hashing
- JWT/session strategy
- Secure cookie strategy where applicable
- Logout
- Session expiry

## Secrets

Never store:

- Passwords
- API keys
- Tokens

as plaintext in logs.

Environment variables may be used for local configuration.

## Test target authorization

The platform should clearly identify the configured target environment.

Security engines must only run against targets explicitly configured by the user.

## Command execution

Never execute arbitrary user-provided shell strings.

Use:

- Allowlisted executables
- Structured arguments
- Process timeout
- Working-directory isolation
- Output size limits

## File security

Validate:

- File path
- File name
- MIME type
- Size
- Extension

Prevent:

```text
../
absolute path traversal
```

## Browser security

- Limit dangerous browser launch options.
- Do not disable security features by default.
- Make insecure flags explicit and visible.

## Audit

Record sensitive administrative operations when applicable.
