# Coding Standards

## General

- One class per file.
- Keep responsibilities focused.
- Prefer readability over cleverness.
- Avoid duplicate ownership.

## Logging

Use the framework Logger.

```js
Logger.info("Discord connected.");
Logger.warn("Unknown command.");
Logger.error(error.message);
Logger.moderationAudit(message);
```

Do not add ANSI escape sequences outside `src/core/Logger.js`.

## Verification

Before each phase commit, run:

```powershell
npm.cmd test
npm run lint
git diff --check
```
