# Dependencies

## Runtime

- Node.js 22.13 or newer
- `discord.js`
- `dotenv`

## Database Runtime

RSF uses SQLite support bundled with Node through the built-in `node:sqlite` API. No third-party database package, native npm add-on, native compilation toolchain, ORM, or query builder is required.

Node 22.13 is the minimum supported runtime because that version made `node:sqlite` available without the `--experimental-sqlite` launch flag. The API remains marked active development in the Node 22 documentation.

`node:sqlite` executes synchronously. The current persistence architecture targets one application process and one Core-owned SQLite connection. Remote database hosting, replication, clustering, backup and restore tooling, and operational database administration are not current dependencies or capabilities.

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

`winston` remains removed as a direct dependency.
