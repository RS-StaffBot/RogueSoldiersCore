# Phase 6 - Restricted Discord Audit Lookup

Status: Completed and merged.

Pull request: `#98`

PR head commit:

```text
89fa955d1c73b9e8fa4eda1ebfef30d8b2c04704
```

Merge commit:

```text
270179ca75e4800f29c46beb80ee0593494b1388
```

This document is a focused supporting implementation record. It supplements but does not replace the authoritative source-of-truth documents.

## Implemented Commands

- `/audit recent`
- `/audit record`

Both commands are guild-only, require Discord `ManageGuild` at registration and runtime, and always use ephemeral responses.

## Query Boundary

Core privately resolves the framework-loaded Audit Module and constructs `AuditQueryService`. The Discord Provider receives only a frozen boundary exposing:

```text
getById()
list()
```

The Discord layer does not receive the Audit Module, stores, SQLite connection, SQL, database rows, or mutable query-service internals.

## Lookup Policy

`/audit recent` defaults to 5 records and accepts at most 10. It supports only the existing Audit query filters and passes the existing opaque continuation cursor without decoding or reinterpretation.

`/audit record` accepts one validated Audit record ID and performs one exact lookup.

Identifiers are rendered as inert bounded text, mention parsing is disabled, results expose only approved Audit fields and allowlisted metadata, failures are sanitized, and lookup operations are not self-recorded.

## Validation

Validated locally with:

- complete automated test suite
- ESLint
- `npm audit`
- `git diff --check`

The repository version remains `v1.6.0`, which is the latest released version. Phase 6 is merged but unreleased `v1.7.0` development. Phase 7 - Live Verification and Release Hardening is separate and has not started.
