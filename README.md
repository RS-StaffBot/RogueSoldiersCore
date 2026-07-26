# Rogue Soldiers Framework

Rogue Soldiers Framework (RSF) is the central coordinating framework for the Rogue Soldiers Clan ecosystem. Discord is its first active Provider and interface.

## Current Capabilities

- Core startup, configuration, lifecycle, registration, logging, and SQLite persistence
- One Discord command architecture with 12 slash commands
- Platform-neutral Moderation, Economy, and Ticket Modules
- Durable moderation audits, Economy state, and Ticket state
- Transactional migrations and controlled database lifecycle
- An optional 7 Days to Die Provider with raw TCP authentication and readiness over a protected private network path; server command execution is not implemented

## Future Direction

Future, unimplemented direction includes expanded game-server operations, moderation appeals, broader staff and transcript tooling, Discord-to-game communication, game events, Economy integration with in-game rewards, and administrative or website interfaces.

Rogue Soldiers remains the primary design target. Adaptability for other gaming communities is secondary and must not weaken Rogue Soldiers requirements or cause premature abstraction.

## Status

Under development. See `docs/Project-Status.md`, `docs/Roadmap.md`, and `SETUP.md` for verified status, direction, and local setup.
