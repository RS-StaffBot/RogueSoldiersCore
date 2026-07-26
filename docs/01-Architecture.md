# Rogue Soldiers Framework Architecture

## Architectural Layers

RSF is organized into Core, Providers, Modules, and Shared.

## Core

Core coordinates lifecycle, configuration, events, logging, and framework-wide services. ANSI-aware terminal formatting is centralized in `src/core/Logger.js`.

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
In-memory accounts, transactions, and daily-claim state
    |
    v
Calculated balances, history, rewards, and leaderboard results
```

Economy business logic remains platform-neutral and Module-owned. Discord commands translate interactions and format responses without constructing their own Economy Module.

Economy persistence, multi-process atomicity, and cross-platform identity remain future work. A future framework-wide administration interface must use validated RSF settings and operations rather than directly mutating Module properties, configuration files, or database rows. Its technology is not yet selected, and it is not currently implemented.

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
In-memory tickets and per-ticket message history
    |
    v
Frozen defensive Ticket and message snapshots
```

Ticket business logic, creator ownership, staff authorization, assignment, messages, and status transitions remain platform-neutral and Module-owned. Discord commands use the framework-loaded Ticket Module and do not access its internal storage.

Ticket persistence belongs to v0.7.0. Database-backed writes will be required for multi-process atomicity. Current Ticket and message ID sequences reset with in-memory state; a future database may use a different storage-safe strategy while preserving public identity semantics.

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
Logger.moderationAudit()
```

## Architecture Change Rule

Recommend a major architectural change only when at least two are true:

- Long-term value
- Architectural improvement beyond naming
- Last practical opportunity
