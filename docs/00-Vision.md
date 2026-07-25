# Rogue Soldiers Framework Vision

## Purpose

Rogue Soldiers Framework (RSF) is the central software foundation for the Rogue Soldiers Clan ecosystem.

RSF coordinates Discord features, community Modules, game-server Providers, and future website integration without combining everything into one large bot implementation.

## Current Verified Capabilities

As of v0.4.0, RSF supports:

- Framework startup, configuration, lifecycle, and service registration
- Discord connection and slash-command registration
- One command registry, one registrar, and one runtime interaction path
- `/ping`, `/help`, `/ban`, `/kick`, `/warn`, `/timeout`, `/untimeout`, and `/purge`
- Moderation permission identifiers and Discord permission enforcement
- Discord hierarchy, owner, self-target, and manageability checks
- In-memory moderation audit records
- Colored terminal logging with plain-text fallback
- ESLint code-quality checks

## Current Boundaries

The following are not complete production systems:

- Persistent moderation storage
- Persistent economy
- Tickets
- Database persistence
- Game-server control
- Website integration
- Cross-platform identity and permission administration
- Automated test coverage
