# Rogue Soldiers Framework Roadmap

## Current Status

**Repository Version:** v1.2.0

**Current Milestone:** v1.2.0 - 7 Days to Die Command Execution Foundation

**Status:** Closure in progress pending release pull request, merged-main verification, and tag

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

## v1.2.0 - 7 Days to Die Command Execution Foundation

Status: Implemented and live-verified; release closure in progress

Verified work:

- Sanitized raw Telnet evidence fixtures
- Telnet line framing and protocol-byte removal
- One active command at a time
- Provider-owned command-response service
- Deterministic completion for `gettime`, `listplayers`, `lp`, `say`, `help`, and invalid commands
- Bounded inactivity fallback for unverified multiline output
- Unsolicited event separation
- Timeout, disconnect, write, decision, and truncation failure handling
- Stale startup-banner exclusion
- Password-protected and direct-console readiness compatibility
- Live command verification against a running 7 Days to Die V3.1 test server

## v1.2.0 Boundary

The milestone proves the 7 Days to Die Provider-owned command-response boundary and exposes a safe single-command Provider service.

Outside v1.2.0:

- Discord game-server slash commands
- Ban, kick, whitelist, or player-administration workflows
- Player identity linking
- Discord and in-game chat bridging
- Economy-backed in-game purchases or rewards
- Multiple simultaneous game commands
- Multiple game servers
- Automatic game-server startup or process supervision
- Public Telnet exposure
- Logfile-based command-response parsing

## Release Closure

Remaining release actions:

- Synchronize `package-lock.json` to version `1.2.0`
- Pass release-closure pull request validation
- Merge the release-closure pull request
- Verify merged `main`
- Confirm all version values report `1.2.0`
- Create and push annotated tag `v1.2.0`

## Post-v1.2 Direction

The next milestone must be selected from demonstrated Rogue Soldiers operational needs. No future milestone is active merely because it appears below.

Likely future areas include:

- Discord game-server command interfaces over the Provider command service
- Hosted game-server player administration
- Discord and in-game chat integration
- Economy-backed in-game rewards and purchases
- Cross-platform player identity mapping
- A Discord or Website administration interface over the v1.1 settings services
- Discord role translation into reusable RSF permissions
- Ticket channels, transcripts, and appeal workflows
- Persistent Website sessions

Every future milestone must preserve the established architecture:

- Core coordinates framework infrastructure and lifecycle.
- Providers integrate external platforms and systems.
- Modules own reusable business logic.
- Shared contains proven cross-layer contracts and utilities.
