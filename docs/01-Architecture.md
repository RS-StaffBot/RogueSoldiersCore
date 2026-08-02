# Rogue Soldiers Framework Architecture

## Architectural Layers

RSF is organized into Core, Providers, Modules, and Shared.

## Core

Core coordinates lifecycle, configuration, events, logging, database infrastructure, and framework-wide services. ANSI-aware terminal formatting is centralized in `src/core/Logger.js`.

SQLite is the selected local database engine. One Core-owned Database service owns connection initialization, health checks, migration coordination, and shutdown. The service uses Node's built-in `node:sqlite` API, so it does not require a native npm database add-on.

Database migrations are ordered, tracked, and applied transactionally through Core. Migration SQL defines storage schema only; Module business validation remains in Modules. Providers and commands do not access the database directly.

Module-specific stores receive the private Core connection through a controlled factory. SQLite-backed Audit, Moderation, Economy, Ticket, and Identity stores are current production integrations. Their Modules remain authoritative for business validation and public objects, while SQLite is authoritative for their durable state.

Core constructs and loads the Audit Module after migration execution and injects its private store. Core does not own Audit record validation, action taxonomy, metadata rules, recording policy, or query policy.

## Database Startup Flow

```text
Configuration and Core registration
    |
    v
Database initialization and migrations
    |
    v
Module loading and independent lifecycle processing
    |
    v
Provider loading and independent lifecycle processing
    |
    v
Component state summary
    |
    +--> all recoverable components healthy: STARTED
    |
    +--> one or more recoverable components failed: STARTED_DEGRADED
```

Providers start only after Module lifecycle processing completes. Each registered Module and Provider is initialized and started independently. An identifiable component failure is isolated to that component, which remains registered in `ERROR`; healthy unrelated components remain active.

Core, Bootstrap, Registry, Loader-wide construction, Database initialization, Database health, and migration failures remain framework-critical. Those failures abort startup and preserve authoritative rollback behavior. Recoverable component failures do not trigger total rollback.

Shutdown stops Providers before Modules and Modules before the Database. Shutdown handles mixed `RUNNING` and `ERROR` component states and continues cleanup after individual stop failures.

Migrations run before Module loading. Stores own SQL and durable mapping but not business rules. Stored rows are reconstructed through Module-owned records before becoming public results. Invalid durable state isolated to one independently recoverable Module fails that Module without stopping unrelated components; repository-wide or Database integrity failures remain fatal.

Module writes report success only after the responsible store commits. Economy multi-row balance, transaction, transfer, and daily-claim changes use database transactions. Ticket row, message, assignment, status, and sequence changes use database transactions. Audit records are validated by the Audit Module before persistence. Database transactions do not extend to external Discord actions.

Providers, commands, Shared components, and Modules do not open SQLite connections or issue SQL. This keeps the database engine replaceable without moving business logic out of Module contracts.

## Providers

Providers integrate external platforms. Discord-specific clients, interactions, validation, hierarchy checks, API operations, authenticated actor context, and responses belong in the Discord Provider.

Providers may receive only narrow Audit recording or query services for an approved workflow. They do not receive the Audit store, SQLite connection, SQL, database rows, or mutable Audit Module internals.

## Modules

Modules contain reusable business logic. Active Modules are Audit, Economy, Moderation, Tickets, and Identity.

The Audit Module owns platform-neutral immutable accountability summaries, action and actor/source/target/outcome validation, bounded allowlisted metadata, recording, bounded querying, and its store contract. Existing Module-owned business histories remain authoritative for their own detailed state.

## Shared

Shared contains reusable cross-layer objects. Moderation, Economy, Ticket, and Identity permission identifiers are implemented under `src/shared/permissions/`.

## Audit Flow

### Recording Flow

```text
Authenticated Provider workflow
    |
    v
Narrow workflow-specific Audit adapter
    |
    v
AuditRecordingService
    |
    v
AuditModule record validation
    |
    v
Audit store contract
    |
    v
SQLite-authoritative Audit records
```

The source Provider authenticates the actor and supplies only the verified actor context required by the approved workflow. Workflow-specific adapters use fixed action and target shapes and bounded allowlisted metadata. Audit failures are contained according to the explicit policy tested for that workflow and do not expose storage details.

The EventBus and runtime logs are not authoritative Audit storage. Audit records do not replace Moderation cases, Economy transactions, Ticket records and messages, Identity links, hosted-game authoritative results, or current lifecycle state.

Implemented recording integrations through PR `#96` are:

- Discord lifecycle `/lifecycle restart` and `/lifecycle reload`
- Discord moderation `/ban`, `/kick`, `/warn`, `/timeout`, `/untimeout`, and `/purge`
- hosted-player `/game kick`, `/game ban`, `/game unban`, `/game whitelist add`, and `/game whitelist remove`
- Ticket staff `/ticket staff message`, `/ticket staff assign`, `/ticket staff unassign`, and `/ticket staff close`

These workflows preserve their existing private responses and authority boundaries. Successful accountability is recorded only after the authoritative owning Module commit or Provider operation completes successfully. Audit recording remains privacy-safe, best effort, and non-blocking; an Audit failure does not change an already determined lifecycle, moderation, hosted-game, or Ticket result.

### Restricted Discord Query Flow

Phase 6 was completed and merged through PR `#98` as unreleased `v1.7.0` development.

```text
Discord /audit command
    |
    v
Frozen Audit query boundary
    |
    v
AuditQueryService
    |
    v
AuditModule bounded query policy
    |
    v
Audit store contract
```

Core privately resolves the framework-loaded Audit Module and constructs `AuditQueryService`. Discord receives only a frozen narrow boundary exposing:

```text
getById()
list()
```

The Audit Module remains responsible for record validation and bounded allowlisted query policy. The Discord Provider owns guild-only interaction handling, authorization, and sanitized private presentation.

Discord does not receive the Audit Module, Audit stores, SQLite connections, SQL, database rows, or mutable query-service internals.

The `/audit` command is omitted when the valid Audit query boundary is unavailable. Audit lookup does not create an Audit record for itself.

Existing Module and Provider-owned records remain authoritative. Audit records are bounded accountability summaries and do not replace Moderation history, Ticket records and messages, hosted-game command results, Identity links, Economy transactions, or lifecycle state. The authoritative intentional exclusion list is maintained in `04-Modules.md`.

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
    |
    v
Discord moderation Audit adapter
    |
    v
AuditRecordingService
    |
    v
AuditModule accountability summary
```

The Moderation Module remains authoritative for moderation case detail. The framework Audit record stores only the fixed actor, source, action, target, outcome, optional safe reference, bounded status metadata, and RSF-generated timestamp approved for the workflow. Moderation reasons and raw Discord responses are not copied into framework Audit records.

## Architecture Change Rule

Recommend a major architectural change only when at least two are true:

- Long-term value
- Architectural improvement beyond naming
- Last practical opportunity

## Persistence Boundary

SQLite supports the current single-process deployment model. `node:sqlite` is synchronous, so queries and transactions remain focused and Discord-facing history paths use bounded reads where implemented. Startup validation reads complete durable Module state where required.

Backup and restore tooling, remote hosting, replication, clustering, multi-process deployment, database administration, and optimized very-large-dataset startup validation remain future work. A future database engine must preserve Module-owned validation, public identities, store contracts, transactional behavior, and Provider isolation.

## v1.7.0 Release-Hardening Boundary

The v1.7.0 Audit architecture has been verified through both existing automated tests and a controlled disposable-database reconstruction.

Verified restart behavior:

```text
audit-1, audit-2 persisted
        |
        v
database closed
        |
        v
fresh DatabaseSync + AuditModule construction
        |
        +-- exact lookup -> audit-1
        +-- recent lookup -> audit-2, audit-1
        +-- next record -> audit-3
```

The verification used only synthetic records and temporary storage. No production Discord, Ticket, moderation, hosted-player, or production SQLite data was used.

PR `#100` is merged dormant forward foundation on current `main`. It is not activated as the current milestone, is not a completed permission system, and is not a released v1.8.0 capability. Its contracts do not replace current Discord, Moderation, Ticket, game, lifecycle, or Audit authorization behavior.

Discord identity presentation remains deferred and non-blocking. Permanent Discord IDs remain durable identifiers; mutable names are not persisted, mentions remain disabled, and inert ID-only fallback remains valid.

Ticket command-family restructuring remains deferred and non-blocking. The mixed `/ticket` family remains the v1.7.0 command surface, with runtime authorization mandatory.
