# Rogue Soldiers Framework Roadmap

## Current Status

**Repository Version:** v1.3.0

**Current Milestone:** v1.4.0 - Hosted Player Administration

**Status:** In progress; Phase 4 is next

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

## v1.4.0 - Hosted Player Administration

### Goal

Provide a narrow Discord interface for administering individual players on the hosted 7 Days to Die server while preserving the existing Provider boundary and preventing arbitrary console access.

### Intended Command Family

- `/game kick`
- `/game ban`
- `/game unban`
- `/game whitelist add`
- `/game whitelist remove`

These command names describe the intended user-facing capability. Exact Discord options and exact server command forms remain unapproved until live server evidence proves the supported identifiers, syntax, completion lines, success responses, and rejection responses.

### Architecture Boundary

The Discord Provider owns slash-command definitions, Discord authorization, input validation, interaction handling, reply deferral, safe result parsing, and user-facing wording.

The 7 Days to Die Provider owns fixed command construction, Telnet communication, command execution, completion detection, response and event separation, timeout and connection failures, and single-active-command enforcement.

No arbitrary console entry is exposed. Discord commands resolve only the existing frozen `executeCommand` boundary. Direct platform administration does not introduce a Module unless reusable cross-platform policy is later proven.

### Completed Phases

1. Captured live command evidence for kick behavior, online player identifiers, success output, invalid-target output, restart persistence, and disconnect cleanup noise.
2. Approved online entity ID resolution and the fixed `kick <entity id> "<reason>"` operation for the first administration command.
3. Added Provider-side deterministic completion for verified kick success and invalid-target rejection, including regression coverage proving later disconnect warnings and stack traces are excluded.

### Current Phase

4. Add shared Discord-side online-player target validation and privacy-safe administration result formatting.

This phase will establish reusable Discord-side validation and formatting without registering `/game kick` yet.

### Remaining Phases

5. Add `/game kick` through the approved fixed operation.
6. Capture and approve exact live evidence for ban behavior, then add `/game ban` through one fixed operation.
7. Capture and approve exact live evidence for unban behavior, then add `/game unban` through one fixed operation.
8. Add whitelist add and remove only after both operations are independently proven.
9. Add serialized registration, dispatch, authorization, malformed-input, privacy, and regression coverage.
10. Complete live Discord-to-game verification.
11. Synchronize documentation and versions, add release notes, run final regression, and close v1.4.0.

### Verified Kick Contract

Online discovery evidence:

```text
id=<entity id>, <player name>
Total of <count> in the game
```

Approved execution shape:

```text
kick <online entity id> "<validated reason>"
```

Verified success terminal line:

```text
Kicking Player <name>: <reason>
```

Verified offline or invalid target terminal line:

```text
"<target>" is not a valid entity id, player name or user id.
```

Entity IDs remain associated with saved players across normal reconnects and a clean server restart, but the server accepts them as kick targets only while the player is currently online. Steam and EOS identifiers remain the durable account identifiers for future offline administration and cross-server identity work.

### Safety and Privacy Requirements

- Administrative actions remain guild-only and permission-gated.
- Player targets must be exact and unambiguous before execution.
- Ambiguous names must not be guessed or automatically resolved.
- Fixed operations must reject command-shaping characters and malformed identifiers before Provider execution.
- Discord must not receive raw Telnet output, credentials, IP addresses, positions, health values, socket details, or internal error text.
- Platform identifiers may be stored and used internally when required for durable game administration, but should not be included in ordinary Discord responses.
- Timeout, disconnect, not-found, already-banned, not-banned, invalid-target, and generic server rejection outcomes must fail safely.
- Raw Telnet remains restricted to loopback, LAN, VPN, or another protected private path.

### Outside v1.4.0

- Arbitrary console command execution
- Free-form Telnet command input
- Cross-platform identity linking
- Automatic fuzzy player matching
- Continuous Discord and in-game chat bridging
- Economy-backed game purchases or rewards
- Command queues or multiple simultaneous game commands
- Multiple game servers
- Automatic game-server startup or process supervision
- Public Telnet exposure

## v1.3.0 - Discord Game Server Command Interface

Status: Completed and tagged

### Goal

Provide a narrow Discord slash-command interface over the completed 7 Days to Die Provider command service.

### Implemented Commands

- `/game status`
- `/game time`
- `/game players`
- `/game say <message>`

### Architecture Boundary

The Discord Provider owns Discord command definitions, permissions, input validation, interaction handling, reply deferral, result formatting, safe error wording, and narrow game Provider resolution.

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
9. Regression, documentation synchronization, version synchronization, release notes, merge, and release tagging.

### Verification Result

- Live Discord and 7 Days to Die Provider startup passed.
- `/game status`, `/game time`, `/game players`, and `/game say` passed live verification.
- Server logs confirmed `gettime`, `listplayers`, and quoted `say` execution.
- The game chat displayed the Discord-originated message.
- Automated tests verify rejection without `ManageGuild`; a second suitable account was unavailable for the live negative-permission check.
- Local release verification passed with 0 production vulnerabilities, 370 tests passed, 0 failed tests, and ESLint passing.
- GitHub Actions passed on Node.js 22.

### Release Record

- Release pull request: `#43`
- Release merge commit: `71e476641bb5026dfa4d41dbd88131db2326800b`
- Annotated tag: `v1.3.0`

### Outside v1.3.0

- Arbitrary console execution
- Hosted-player administration
- Cross-platform player identity linking
- Continuous Discord and in-game chat bridging
- Economy-backed in-game purchases or rewards
- Command queues
- Multiple simultaneous commands
- Multiple game servers
- Automatic game-server startup or process supervision
- Public Telnet exposure
- Logfile-based command-response parsing

## Future Direction

After v1.4.0, candidate directions include continuous chat integration, Economy-backed game rewards, cross-platform identity mapping, administration interfaces, Discord role translation, expanded Ticket workflows, and persistent Website sessions.

Every future milestone must preserve the established architecture:

- Core coordinates framework infrastructure and lifecycle.
- Providers integrate external platforms and systems.
- Modules own reusable business logic.
- Shared contains proven cross-layer contracts and utilities.
