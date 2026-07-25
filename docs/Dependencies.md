# Dependencies

## Runtime

- Node.js 22 or newer
- `discord.js`
- `dotenv`

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
