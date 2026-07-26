# Rogue Soldiers Framework Roadmap

## Current Status

**Repository Version:** v0.8.0

**Current Milestone:** v0.9.0 - Website Provider

**Status:** Next Planned

## Completed Milestones

- v0.1.0 - Project Foundation
- v0.2.0 - Framework Online
- v0.2.1 - Architecture Stabilization
- v0.3.0 - Discord Command Framework
- v0.3.1 - Command Framework Architecture Consolidation
- v0.4.0 - Moderation Module
- v0.5.0 - Economy Module
- v0.6.0 - Tickets
- v0.7.0 - Database
- v0.8.0 - 7 Days to Die Provider

## v0.4.0 - Moderation Module

Status: Completed

Implemented:

- Moderation Module
- Moderation actions and permission identifiers
- Discord permission, hierarchy, and manageability enforcement
- `/ban`, `/kick`, `/warn`, `/timeout`, `/untimeout`, and `/purge`
- In-memory audit records and terminal audit logging
- Colored log categories
- ESLint configuration
- Version synchronization
- Synchronized documentation
- Final milestone verification

## v0.5.0 - Economy Module

Status: Completed

Implemented:

- In-memory accounts, configurable starting balances, and balance lookup
- Credits, debits, transfers, transfer policies, and transfer authorization
- Economy permission identifiers
- Credit, debit, and transfer transaction records
- Full, user-filtered, and paginated newest-first transaction history
- Configurable daily rewards and cooldowns
- Configurable leaderboards with deterministic tie ordering
- Atomic in-memory writes and sequential successful transaction IDs
- Defensive public snapshots and non-empty user-ID validation
- `/balance`, `/daily`, and `/leaderboard`
- Version synchronization and final milestone verification

Boundaries:

- At v0.5.0 completion, Economy state was in memory and persistence was deferred to v0.7.0; that persistence is now completed.
- At v0.5.0 completion, multi-process atomicity required database-backed operations.
- A shop, Discord `/transfer` command, cross-platform identity mapping, and administrative interface are not implemented.
- At v0.5.0 completion, database transaction pagination was deferred; bounded SQLite pagination is now completed.
- Leaderboard indexes or caches should be introduced only when persistence and measured scale justify them.

## v0.6.0 - Tickets

Status: Completed

Implemented:

- Framework-loaded, platform-neutral Ticket Module
- Immutable Ticket records, optional assignees, and immutable append-only messages
- `OPEN` and `CLOSED` statuses with closing but no reopening
- Sequential Module-generated Ticket and message IDs
- Creation, lookup, count, deterministic listing, and creator, status, assignee, and unassigned filtering
- Assignment, reassignment, unassignment, messages, and closing
- Creator-owned operations, reusable staff permissions, and administrative override
- Atomic in-memory writes, failed-operation ID preservation, frozen defensive snapshots, and independent public arrays
- `/ticket` creator workflows and `/ticket staff` workflows without Discord channel or thread infrastructure
- Fixed `ManageMessages` staff translation and `Administrator` administrative translation
- Twelve total Discord commands
- Version synchronization and final milestone verification

Boundaries:

- At v0.6.0 completion, Ticket state and ID sequences reset on restart and persistence was deferred to v0.7.0; that persistence is now completed.
- At v0.6.0 completion, multi-process atomicity required database-backed writes.
- Discord channels, threads, categories, permission overwrites, transcripts, configurable staff roles, external portals, and web administration are not implemented.
- Moderation appeals and broader staff-control workflows remain future scope.
- Reopening, deletion, attachments, priorities, escalation, and SLA systems remain future work.
- Future administration must use validated RSF operations rather than direct state, configuration-file, or database-row mutation.

## v0.7.0 - Database

Status: Completed

Implemented:

- Core-owned SQLite connection lifecycle, health checks, and controlled shutdown
- Built-in `node:sqlite` with no external database package, ORM, or query builder
- Ordered transactional migrations tracked in `rsf_schema_migrations`
- Moderation, Economy, and Ticket Module-specific SQLite stores
- SQLite-authoritative production state and in-memory stores for direct isolated construction
- Moderation audit restart recovery and deterministic ordering
- Economy account, balance, transaction, transfer, daily-claim, pagination, leaderboard, and ID persistence
- Ticket record, message, status, assignment, ordering, authorization, and independent ID persistence
- Atomic durable writes, failed-operation rollback, and successful ID-sequence preservation
- Validated durable reconstruction and safe initialization failure
- Provider and command isolation from stores and SQL
- Twelve existing Discord commands preserved

Boundaries:

- SQLite targets the current single-process deployment model.
- `node:sqlite` is synchronous and remains an active-development API on Node 22.
- Startup validation reads full durable Module state where required; very large datasets may require future optimization.
- Database transactions cannot roll back external Discord actions.
- Backup and restore tooling, production storage deployment, remote databases, replication, clustering, and database administration remain future work.
- Cross-platform identity remains future work.
- Game-server integration was outside v0.7.0; its initial v0.8.0 Provider boundary has been completed.

## v0.8.0 - 7 Days to Die Provider

Status: Completed

Implemented:

- Optional `SevenDaysToDieProvider`, disabled by default
- Conditional loading after Discord when enabled
- Raw TCP connectivity through Node's built-in `node:net` API
- Telnet password submission and confirmed authentication and console readiness
- Whole-handshake connection timeout
- Lifecycle and rollback integration with awaited, idempotent disconnection
- Unexpected post-readiness connection-loss propagation to Provider `ERROR`
- Deterministic automated coverage through handwritten client and socket fakes without a live server

Boundaries:

- Administrative command execution and command-response delimiters remain deferred.
- Player lookup and player administration remain deferred.
- Discord-to-game communication, game events, and Economy integration remain deferred.
- Reconnect behavior and multiple-server management remain deferred.
- Future web configuration remains non-operational.
- Raw TCP management must use loopback, a LAN, a VPN, or another protected private path.

Command execution remains deferred because no deterministic response terminator or reliable isolation from unsolicited logs is currently established. Deployment-specific evidence must confirm response completion, log filtering, server-version and hosting compatibility, and safe command-timeout behavior before implementation.

A future web administration interface may collect and validate game-server configuration, but it must call validated RSF configuration operations rather than edit source files. Secrets must remain outside tracked JSON. This future interface is only a configuration surface; game-server behavior remains owned by the 7 Days to Die Provider. No web interface or configuration persistence implementation is selected.

## Future Direction

The following items are future intent, not implemented features or detailed milestone commitments:

- The 7 Days to Die Provider may later support hosted server moderation and command control after its command-response boundary is proven.
- Discord-to-game communication and game-server events remain planned integration areas.
- Economy integration may later allow validated purchases to produce in-game rewards.
- Moderation appeals, broader staff controls, and transcript or logging portals remain future community workflows.
- Additional game Providers may follow where practical without weakening Rogue Soldiers requirements.

## Remaining Future Milestones

- v0.9.0 - Website Provider
- v1.0.0 - Production Release
