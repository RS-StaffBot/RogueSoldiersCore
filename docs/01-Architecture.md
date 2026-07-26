# Rogue Soldiers Framework Architecture

## Architectural Layers

RSF is organized into Core, Providers, Modules, and Shared.

## Core

Core coordinates lifecycle, configuration, events, logging, database infrastructure, and framework-wide services. ANSI-aware terminal formatting is centralized in `src/core/Logger.js`.

SQLite is the selected local database engine. One Core-owned Database service owns connection initialization, health checks, migration coordination, and shutdown. The service uses Node's built-in `node:sqlite` API, so it does not require a native npm database add-on.

Database migrations are ordered, tracked, and applied transactionally through Core. Migration SQL defines storage schema only; Module business validation remains in Modules. Providers and commands do not access the database directly.

Module-specific stores receive the private Core connection through a controlled factory. SQLite-backed Moderation, Economy, and Ticket stores are current production integrations. Their Modules remain authoritative for business validation and public objects, while SQLite is authoritative for their durable state.

## Database Startup Flow

```text
Configuration and Core registration
    |
    v
Database initialization and migrations
    |
    v
Module loading, initialization, and startup
    |
    v
Provider loading, initialization, and startup
    |
    v
Provider readiness
    |
    v
Framework startup success
```

Providers start only after Module dependencies are ready. Shutdown stops Providers before Modules and Modules before the Database. Partial-startup rollback follows Providers -> Modules -> Database, continues cleanup after individual failures, and preserves the original startup error as authoritative.

Migrations run before Module loading. Stores own SQL and durable mapping but not business rules. Stored rows are reconstructed through Module-owned records before becoming public results. Invalid durable state fails Module initialization rather than bypassing validation.

Module writes report success only after the responsible store commits. Economy multi-row balance, transaction, transfer, and daily-claim changes use database transactions. Ticket row, message, assignment, status, and sequence changes use database transactions. Database transactions do not extend to external Discord actions.

Providers, commands, Shared components, and Modules do not open SQLite connections or issue SQL. This keeps the database engine replaceable without moving business logic out of Module contracts.

## Providers

Providers integrate external platforms. Discord-specific clients, interactions, validation, hierarchy checks, API operations, and responses belong in the Discord Provider.

## Modules

Modules contain reusable business logic. Active Modules are Economy, Moderation, and Tickets.

## Shared

Shared contains reusable cross-layer objects. Moderation, Economy, and Ticket permission identifiers are implemented under `src/shared/permissions/`.

## Economy Flow

```text
Discord Economy command
    |
    v
Core Registry and Module Manager
    |
    v
EconomyModule validated operation
    |
    v
Economy store contract
    |
    v
SQLite-authoritative accounts, transactions, and daily claims
    |
    v
Calculated balances, bounded history pages, rewards, and leaderboard results
```

Economy business logic remains platform-neutral and Module-owned. Discord commands translate interactions and format responses without constructing their own Economy Module.

Production Economy state is SQLite-authoritative. Credits, debits, transfers, and daily claims commit all affected accounts, claim timestamps, transaction rows, and successful transaction identity in one SQLite transaction before returning success. Direct Module construction uses the same contract with an in-memory store for isolated use.

Cross-platform identity remains future work. A future framework-wide administration interface must use validated RSF settings and operations rather than directly mutating Module properties, configuration files, or database rows. Its technology is not yet selected, and it is not currently implemented.

## Ticket Flow

```text
Discord Ticket command
    |
    v
Discord permission translation and response formatting
    |
    v
Core Registry and Module Manager
    |
    v
TicketModule validation and authorization
    |
    v
Ticket store contract
    |
    v
SQLite-authoritative Tickets and message history
    |
    v
Frozen defensive Ticket and message snapshots
```

Ticket business logic, creator ownership, staff authorization, assignment, messages, and status transitions remain platform-neutral and Module-owned. Discord commands use the framework-loaded Ticket Module and do not access its internal storage.

Production Ticket state is SQLite-authoritative. Ticket creation, message append, assignment changes, and closing commit before success is returned. Independent durable sequences preserve the `ticket-N` and `ticket-message-N` public formats across restart. Direct Module construction uses an in-memory implementation of the same store contract for isolated use.

The current Discord staff translation is a fixed, non-configurable permission mapping. Configurable roles require future validated administration. Discord Ticket channels, threads, transcripts, permission overwrites, external portals, and web administration remain future work. Future administration must invoke validated RSF operations rather than mutate Module properties, configuration files, or database rows directly.

## Moderation Flow

```text
Discord slash command
    |
    v
Discord-specific validation
    |
    v
DiscordModerationGuard
    |
    v
Discord API action
    |
    v
ModerationModule.recordAction()
    |
    v
ModerationAuditRecord
    |
    v
SQLite-backed Moderation store
    |
    v
Logger.moderationAudit()
```

## Architecture Change Rule

Recommend a major architectural change only when at least two are true:

- Long-term value
- Architectural improvement beyond naming
- Last practical opportunity

## Persistence Boundary

SQLite supports the current single-process deployment model. `node:sqlite` is synchronous, so queries and transactions remain focused and Discord-facing history paths use bounded reads where implemented. Startup validation reads complete durable Module state where required.

Backup and restore tooling, remote hosting, replication, clustering, multi-process deployment, database administration, and optimized very-large-dataset startup validation remain future work. A future database engine must preserve Module-owned validation, public identities, store contracts, transactional behavior, and Provider isolation.
