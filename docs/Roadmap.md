# Rogue Soldiers Framework Roadmap

## Current Status

**Repository Version:** v1.3.0

**Current Milestone:** No implementation milestone selected

**Status:** v1.3.0 release candidate complete pending merge and tag

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
- v1.2.0 - 7 Days to Die Command Execution Foundation
- v1.3.0 - Discord Game Server Command Interface

## v1.3.0 - Discord Game Server Command Interface

Status: Completed pending release tag

### Goal

Provide a narrow Discord slash-command interface over the completed 7 Days to Die Provider command service.

### Implemented Commands

- `/game status`
- `/game time`
- `/game players`
- `/game say <message>`

### Architecture Boundary

The Discord Provider owns slash-command definitions, Discord permissions, input validation, interaction handling, reply deferral, result formatting, safe error wording, and narrow game Provider resolution.

The 7 Days to Die Provider retains ownership of Telnet communication, command execution, completion detection, response and event separation, timeout and connection failures, and single-active-command enforcement.

No Module is introduced for these direct platform operations.

### Completed Work

1. Reusable `ManageGuild` authorization and narrow Provider resolution.
2. Guild-only `/game status` without remote execution.
3. Fixed `gettime` execution with verified time parsing.
4. Fixed `listplayers` execution with privacy-safe name and total formatting.
5. Fixed quoted `say` execution with bounded input validation.
6. Shared safe failure formatting for timeout, disconnect, command failure, malformed result, and thrown errors.
7. Final serialized registration and interaction-dispatch integration coverage.
8. Live Discord-to-game verification against a running 7 Days to Die server.
9. Regression, documentation synchronization, version synchronization, and release notes.

### Verification Result

- Live Discord and 7 Days to Die Provider startup passed.
- `/game status`, `/game time`, `/game players`, and `/game say` passed live verification.
- Server logs confirmed `gettime`, `listplayers`, and quoted `say` execution.
- The game chat displayed the Discord-originated message.
- Automated tests verify rejection without `ManageGuild`; a second suitable account was unavailable for the live negative-permission check.

### Outside v1.3.0

- Arbitrary console command execution
- Hosted-player administration
- Cross-platform player identity linking
- Continuous Discord and in-game chat bridging
- Economy-backed game purchases or rewards
- Command queues
- Multiple simultaneous game commands
- Multiple game servers
- Automatic game-server startup or process supervision
- Public Telnet exposure
- Logfile-based command-response parsing

## Future Direction

A future milestone must be explicitly selected before implementation begins. Candidate directions include hosted game-server player administration, continuous chat integration, Economy-backed game rewards, cross-platform identity mapping, administration interfaces, Discord role translation, expanded Ticket workflows, and persistent Website sessions.

Every future milestone must preserve the established architecture:

- Core coordinates framework infrastructure and lifecycle.
- Providers integrate external platforms and systems.
- Modules own reusable business logic.
- Shared contains proven cross-layer contracts and utilities.
