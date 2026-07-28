# Project Status

## Current Version

v1.1.0

## Current Milestone

No active implementation milestone selected.

Status: v1.1.0 closure complete pending release tag.

## Last Completed Milestone

v1.1.0 - Administration and Configuration Foundation

Status: Completed

## Completed Foundation

- Project Foundation and framework lifecycle
- Stable Core, Provider, Module, and Shared architecture
- Reusable Discord command framework
- Moderation Module and Discord moderation commands
- Economy Module and Discord economy commands
- Ticket Module with creator and staff Discord workflows
- Core-owned SQLite persistence and migrations
- Optional 7 Days to Die Provider connectivity
- Optional Website Provider with Discord OAuth and creator-owned Ticket listing
- Production deployment, recovery, logging, validation, and security procedures

## Verified v1.1.0 Administration Work

- Core-owned setting definitions and registry
- Permission-protected setting reads, updates, and resets
- Durable SQLite setting overrides
- Validated Economy setting ownership and business rules
- Administration audit history with deterministic pagination
- Persisted Economy settings applied during startup
- Immediate live Economy setting updates and resets
- Transactional persistence, audit, and runtime compensation
- Separate environment-backed secret configuration boundary
- Nested configuration and known-value redaction
- Regression and security review covering partial runtime failures

## Current Settings Boundary

The first configurable owner is the Economy Module. Its supported settings are:

- Starting balance
- Daily reward
- Daily cooldown
- Leaderboard limit
- Transaction page limit
- Transfer policy

Settings operations remain Core services. No Discord or Website administration interface is implemented. Providers and future interfaces must invoke the validated settings services rather than directly changing Module properties, configuration files, or database rows.

Secret values remain outside normal settings persistence and audit history. They are retrieved only through declared secret paths backed by protected environment values.

## Automated Verification

The release branch is required to pass:

```powershell
npm.cmd ci
npm.cmd audit --omit=dev --audit-level=high
npm.cmd test
npm.cmd run lint
```

GitHub Actions validates the project on Node.js 22.

## Current Production Boundaries

- RSF supports a single-process SQLite deployment.
- Node.js 22.13 or newer is required for the built-in `node:sqlite` API.
- The Discord Provider requires valid production credentials and network access.
- The optional 7 Days to Die Provider does not yet execute administrative commands.
- The Website Provider and Website authentication remain disabled by default.
- Website sessions and pending OAuth attempts remain in memory and are lost on restart.
- Settings have no Discord or Website editing interface.
- Discord roles are not yet translated into RSF settings permissions.
- Secrets cannot be edited through the settings system.
- Cross-platform identity, game-server command control, chat bridging, in-game Economy purchases, clustering, remote databases, and multi-community administration remain future work.

## Release Closure Requirements

Before v1.1.0 is tagged:

- All version locations must report `1.1.0`.
- The release-closure pull request must pass CI.
- Documentation must match the merged repository.
- The final repository state must be verified.
- The annotated `v1.1.0` tag must be created from verified `main` and pushed to GitHub.

## Release Notes

See `docs/Release-Notes-v1.1.0.md`.
