# Dependencies

## Runtime

- Node.js 22.13 or newer
- `discord.js`
- `dotenv`

## Database Runtime

RSF uses SQLite through Node's built-in `node:sqlite` API. No third-party database package, native npm add-on, ORM, or query builder is required by the Database infrastructure foundation.

Node 22.13 is the minimum supported runtime because that version made `node:sqlite` available without the `--experimental-sqlite` launch flag. The API remains marked active development in the Node 22 documentation.

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
