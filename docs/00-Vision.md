# Rogue Soldiers Framework Vision

## Purpose

Rogue Soldiers Framework (RSF) is the central coordinating software framework for the Rogue Soldiers Clan ecosystem, not merely a Discord bot.

Rogue Soldiers is the primary deployment and design target. Adaptability for another gaming community is a secondary design quality only when it does not weaken Rogue Soldiers requirements or cause premature abstraction.

RSF coordinates community management, moderation, support, engagement, and connected services. Discord is the first active Provider and user interface. The long-term framework includes Discord, reusable community Modules, persistence, hosted game-server Providers, and future administrative or website interfaces.

## Current Verified Capabilities

As of v0.8.0, RSF supports:

- Framework startup, configuration, lifecycle, and service registration
- Discord connection and slash-command registration
- One command registry, one registrar, and one runtime interaction path
- `/ping`, `/help`, `/ban`, `/kick`, `/warn`, `/timeout`, `/untimeout`, `/purge`, `/balance`, `/daily`, `/leaderboard`, and `/ticket`
- Moderation permission identifiers and Discord permission enforcement
- Discord hierarchy, owner, self-target, and manageability checks
- SQLite-backed moderation audit records with restart recovery
- SQLite-backed Economy accounts, balances, transaction history, daily rewards, and leaderboards with restart recovery
- Atomic Economy credits, debits, transfers, and daily claims with durable sequential successful transaction IDs, defensive public snapshots, and validated settings
- SQLite-backed Tickets with immutable records, messages, assignment, closing, creator ownership, staff authorization, and restart recovery
- Ordered transactional migrations and controlled database health and shutdown
- Discord Ticket creator and staff workflows with reusable Ticket permission translation
- An optional 7 Days to Die Provider with raw TCP authentication, readiness, tested lifecycle integration, and unexpected connection-loss detection
- Colored terminal logging with plain-text fallback
- ESLint code-quality checks
- Focused automated regression tests for critical framework, lifecycle, persistence, and integrity behavior

## Future Direction

The following direction is future scope and is not implemented unless listed under Current Verified Capabilities:

- Continued support-ticket workflows and moderation appeals
- Broader staff controls and transcript or logging portals
- Hosted game-server moderation and command control
- Discord-to-game chat or other communication
- Game-server events
- Economy purchases that can later produce in-game rewards
- Further 7 Days to Die command, player, chat, event, and Economy integration
- Support for additional games where practical
- Administrative and website interfaces that use validated framework operations

These items describe intended scope, not implementation designs or commitments for a specific checkpoint.

## Current Boundaries

The following are not complete production systems:

- Economy shops and Discord transfer commands
- Discord Ticket channels, threads, transcripts, configurable staff roles, and web administration
- Game-server control
- Website integration
- Cross-platform identity and permission administration
- Comprehensive automated coverage across every Module operation, Discord command, and external integration remains incomplete
- Backup and restore tooling, remote databases, replication, clustering, and database administration
- Multi-process persistence beyond the current SQLite deployment boundary
