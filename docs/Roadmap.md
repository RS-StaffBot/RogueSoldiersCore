# Rogue Soldiers Framework Roadmap

## Current Status

**Repository Version:** v1.1.0

**Current Milestone:** No active implementation milestone selected

**Status:** v1.1.0 closure complete pending release tag

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
- v0.9.0 - Website Provider
- v1.0.0 - Production Release
- v1.1.0 - Administration and Configuration Foundation

## v1.1.0 - Administration and Configuration Foundation

Status: Completed

Verified work:

- Setting ownership and immutable definitions
- Permission-protected setting reads and mutations
- Durable SQLite setting overrides
- Owner validation and Economy business rules
- Administration audit history
- Six configurable Economy settings
- Startup application of persisted overrides
- Immediate live updates and resets
- Runtime compensation aligned with persistence and audit rollback
- Separate secret configuration and redaction boundary
- Regression and security review
- Documentation and version synchronization

## v1.1.0 Boundary

The milestone establishes backend services required by future administrative interfaces. It does not add an administrative interface itself.

Outside v1.1.0:

- Website settings pages
- Discord `/settings` commands
- Mobile administration APIs
- Discord role-to-RSF permission mapping
- Game-account linking
- Provider restart controls
- Website secret editing
- Generic plugin configuration
- Multi-community settings
- Remote database support
- 7 Days to Die administrative command execution
- Discord and in-game chat bridging
- Economy-backed in-game purchases

## Release Closure

Remaining release actions:

- Pass release-closure pull request validation
- Merge the release-closure pull request
- Verify merged `main`
- Confirm all version values report `1.1.0`
- Create and push annotated tag `v1.1.0`

## Post-v1.1 Direction

The next milestone must be selected from demonstrated Rogue Soldiers operational needs. No future milestone is active merely because it appears below.

Likely future areas include:

- A Discord or Website administration interface over the v1.1 settings services
- Discord role translation into reusable RSF permissions
- Proving the 7 Days to Die command-response boundary
- Hosted game-server player administration
- Discord and in-game chat integration
- Economy-backed in-game rewards and purchases
- Ticket channels, transcripts, and appeal workflows
- Persistent Website sessions
- Cross-platform identity mapping

Every future milestone must preserve the established architecture:

- Core coordinates framework infrastructure and lifecycle.
- Providers integrate external platforms and systems.
- Modules own reusable business logic.
- Shared contains proven cross-layer contracts and utilities.
