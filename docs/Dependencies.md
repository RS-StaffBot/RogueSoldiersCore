# Dependencies

## Runtime

- Node.js 22.13 or newer
- `discord.js`
- `dotenv`

## Supported Node Version

RSF is developed and validated on Node.js 22. GitHub Actions installs Node 22 before running dependency installation, the production audit, tests, and lint.

Node 22.13 is the minimum supported runtime because RSF uses the built-in `node:sqlite` API without the earlier launch flag requirement. A future Node major-version upgrade must be tested deliberately before changing the supported runtime.

## Database Runtime

RSF uses SQLite support bundled with Node through `node:sqlite`. No third-party SQLite package, native npm add-on, native compilation toolchain, ORM, or query builder is required.

`node:sqlite` executes synchronously. The current persistence architecture targets one application process and one Core-owned SQLite connection. Remote database hosting, replication, and clustering are not current dependencies or capabilities.

## Settings Persistence

The v1.1 settings foundation uses the same Core-owned SQLite runtime. Setting overrides and administration audit history are stored through focused Core stores and migrations. No separate database package or remote service was added.

## Secret Configuration

Secret values are read from protected environment configuration through declared secret paths. Secrets are not stored in tracked JSON files, SQLite setting overrides, or settings audit history. No vault client, encryption package, or secret-management service is currently required.

## Development

- `eslint`
- `nodemon`

## ESLint

Static code-quality checks are configured and run with:

```powershell
npm run lint
```

## Logging

RSF does not require a third-party terminal-color dependency. Core Logger uses ANSI escape sequences directly and falls back to plain text when unsupported.

`winston`, `better-sqlite3`, and other native SQLite npm bindings remain removed as direct dependencies.
