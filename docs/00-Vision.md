# Rogue Soldiers Framework Vision

## Purpose

Rogue Soldiers Framework (RSF) is the central software foundation for the Rogue Soldiers Clan ecosystem.

RSF coordinates Discord features, community Modules, game-server Providers, and future website integration without combining everything into one large bot implementation.

## Current Verified Capabilities

As of v0.6.0, RSF supports:

- Framework startup, configuration, lifecycle, and service registration
- Discord connection and slash-command registration
- One command registry, one registrar, and one runtime interaction path
- `/ping`, `/help`, `/ban`, `/kick`, `/warn`, `/timeout`, `/untimeout`, `/purge`, `/balance`, `/daily`, `/leaderboard`, and `/ticket`
- Moderation permission identifiers and Discord permission enforcement
- Discord hierarchy, owner, self-target, and manageability checks
- SQLite-backed moderation audit records with restart recovery
- In-memory Economy accounts, balances, credits, debits, transfers, transaction history, daily rewards, and leaderboards
- Atomic Economy writes, sequential successful transaction IDs, defensive public snapshots, and validated settings
- In-memory Tickets with immutable records, messages, assignment, closing, creator ownership, and staff authorization
- Discord Ticket creator and staff workflows with reusable Ticket permission translation
- Colored terminal logging with plain-text fallback
- ESLint code-quality checks

## Current Boundaries

The following are not complete production systems:

- Persistent economy
- Database persistence
- Multi-instance Economy atomicity
- Multi-instance Ticket atomicity
- Economy shops and Discord transfer commands
- Discord Ticket channels, threads, transcripts, configurable staff roles, and web administration
- Game-server control
- Website integration
- Cross-platform identity and permission administration
- Automated test coverage
