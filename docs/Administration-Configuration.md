# Administration and Configuration

## Purpose

This document describes the verified v1.1 backend foundation for future Rogue Soldiers administration interfaces.

## Normal Settings Flow

```text
Administrative caller
    |
    v
Settings authorization
    |
    v
Setting definition and owner validation
    |
    v
SQLite override and administration audit
    |
    v
Optional live owner application
```

Normal settings are identified by immutable definitions. Definitions include ownership, value type, permissions, and change behavior. Unknown keys and invalid values fail before persistence or runtime mutation.

## Authorization

Settings reads and mutations require validated actor identities and permission strings. `settings.administrate` acts as the administrative override. Failed authorization does not change persistence, audit history, or runtime state.

Discord roles are not currently translated into these permissions. No Discord or Website settings interface is implemented.

## Persistence

Non-secret overrides are stored in SQLite through Core-owned settings stores. The default remains owned by the responsible Module or component. Resetting a setting removes its override and restores the validated default.

Administration history records successful updates and resets. Failed operations do not leave misleading audit records.

## Economy Settings

The first supported owner is the Economy Module. Supported settings are:

- Starting balance
- Daily reward
- Daily cooldown
- Leaderboard limit
- Transaction page limit
- Transfer policy

Persisted overrides are validated and applied during startup. Invalid stored Economy configuration prevents startup.

## Live Updates

Live settings use owner applicators. Persistence, audit, and runtime mutation are coordinated as one logical operation.

If runtime application or transaction completion fails, the previous runtime value is restored. This includes applicators that partially mutate state before throwing.

A starting-balance change affects only newly created accounts. Existing balances and historical transactions are not rewritten.

## Secret Configuration

Secrets use a separate path-specific configuration boundary backed by protected environment values.

Secrets cannot be:

- registered as normal editable settings
- read through settings services
- stored as SQLite setting overrides
- written to settings audit history
- edited through future normal settings interfaces

Missing required secrets report only the declared configuration path. Redaction removes common secret fields and known raw values from diagnostic objects and messages.

## Current Exclusions

v1.1 does not provide:

- Website settings pages
- Discord `/settings` commands
- mobile administration APIs
- Discord role-to-RSF permission mapping
- Provider restart controls
- secret editing or rotation
- encrypted secret storage or vault integration
- generic plugin configuration
- multi-community settings
- remote database support
