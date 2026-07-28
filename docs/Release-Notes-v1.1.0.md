# Rogue Soldiers Framework v1.1.0

## Administration and Configuration Foundation

v1.1.0 establishes the protected backend services needed by future Discord and Website administration interfaces without implementing those interfaces prematurely.

## Included

- Immutable Core-owned setting definitions and registry
- Permission-protected setting reads, updates, and resets
- Durable SQLite setting overrides
- Owner-specific validation and Economy business rules
- Administration audit history with deterministic ordering and pagination
- Six configurable Economy settings
- Persisted Economy overrides applied during startup
- Immediate live Economy updates and resets
- Transactional persistence, audit, and runtime compensation
- Separate path-specific secret configuration
- Nested configuration and known-secret-value redaction
- Regression coverage for partial runtime mutation failures

## Configurable Economy Values

- Starting balance
- Daily reward
- Daily cooldown
- Leaderboard limit
- Transaction page limit
- Transfer policy

A starting-balance change applies to accounts created afterward and does not rewrite existing balances or historical transactions.

## Security Boundary

Secret values remain environment-backed operational configuration. They cannot be registered, read, updated, reset, persisted, or audited through the normal settings system.

Missing-secret errors identify only the declared path. Configuration diagnostics redact common secret fields, nested secret data, arrays, and known raw values.

## Compatibility

- Node.js 22.13 or newer remains required.
- GitHub Actions validates on Node.js 22.
- SQLite remains provided by Node's built-in `node:sqlite` API.
- No runtime or development dependency was added for v1.1.
- Existing Moderation, Economy, Tickets, Discord, Website, 7 Days to Die, database, migration, backup, and lifecycle behavior remains compatible.

## Not Included

- Website settings pages
- Discord `/settings` commands
- Discord role-to-RSF permission mapping
- Mobile administration APIs
- Game-account linking
- Provider restart controls
- Secret editing, encryption, rotation, or vault integration
- Generic plugin configuration
- Multi-community settings
- Remote database support

## Verification

The release closure requires:

```powershell
npm.cmd ci
npm.cmd audit --omit=dev --audit-level=high
npm.cmd test
npm.cmd run lint
```

The annotated `v1.1.0` tag is created only after the closure pull request is merged and the final `main` state is verified.
