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

## Temporary PowerShell Helper Scripts

Short, simple terminal operations may be delivered as direct PowerShell commands.

Long, multiline, quoting-sensitive, loop-heavy, or Markdown-heavy operations should normally be delivered as downloadable `.ps1` helper scripts.

Temporary helper scripts:

- remain outside the tracked repository unless explicitly promoted
- may be retained locally until the related phase, pull request, or milestone is merged and accepted
- should be deleted after a failed or superseded script's replacement succeeds
- should be removed at checkpoint closure
- must not be committed merely to preserve one-time migration, verification, cleanup, or handoff history

A helper script may be promoted into the tracked `scripts/` directory only when it:

- has clear recurring project value
- is parameterized rather than machine-specific
- contains no credentials, tokens, personal paths, or production secrets
- has safe validation and failure behavior
- is documented
- is maintainable as part of RSF
- is intentionally approved by Framework Planning

Promoted scripts must follow the normal review, testing, and pull-request workflow. Script promotion must not bypass repository validation or architecture approval.

## Verification

Before each phase commit, run:

```powershell
npm.cmd test
npm run lint
git diff --check
```
