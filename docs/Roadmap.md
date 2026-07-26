# Rogue Soldiers Framework Roadmap

## Current Status

**Repository Version:** v0.5.0

**Current Milestone:** v0.6.0 - Tickets

**Status:** Next Planned

## Completed Milestones

- v0.1.0 - Project Foundation
- v0.2.0 - Framework Online
- v0.2.1 - Architecture Stabilization
- v0.3.0 - Discord Command Framework
- v0.3.1 - Command Framework Architecture Consolidation
- v0.4.0 - Moderation Module
- v0.5.0 - Economy Module

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

Release action:

- Create and push the `v0.4.0` Git tag

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

- State is lost on restart; database persistence belongs to v0.7.0.
- Multi-process atomicity requires future database-backed operations.
- A shop, Discord `/transfer` command, cross-platform identity mapping, and administrative interface are not implemented.
- Future database transaction pagination should retrieve bounded pages rather than loading the full history.
- Leaderboard indexes or caches should be introduced only when persistence and measured scale justify them.

Release action:

- Commit the closure changes and create and push the `v0.5.0` Git tag

## Future Milestones

- v0.6.0 - Tickets
- v0.7.0 - Database
- v0.8.0 - 7 Days to Die Provider
- v0.9.0 - Website Provider
- v1.0.0 - Production Release
