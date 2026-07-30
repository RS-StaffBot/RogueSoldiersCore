# Rogue Soldiers Framework Roadmap

## Current Status

**Repository Version:** v1.3.0

**Current Milestone:** v1.4.0 - Hosted Player Administration

**Status:** In progress; Phase 5 is next

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

Exact Discord options and server command forms require live evidence before exposure.

### Architecture Boundary

The Discord Provider owns command definitions, authorization, validation, interactions, reply deferral, safe result parsing, and user-facing wording.

The 7 Days to Die Provider owns fixed command construction, Telnet communication, execution, completion detection, event separation, timeout and connection failures, and single-active-command enforcement.

No arbitrary console entry is exposed. Discord commands resolve only the frozen `executeCommand` boundary. Direct platform administration does not introduce a Module unless reusable cross-platform policy is later proven.

### Completed Phases

1. Captured live kick evidence, online identifiers, success and invalid-target output, restart behavior, and cleanup noise.
2. Approved online entity ID resolution and `kick <entity id> "<reason>"`.
3. Added deterministic Provider completion for kick success and invalid-target rejection.
4. Added reusable Discord-side entity-ID and reason validation plus privacy-safe kick result formatting.

Phase 4 specifically added:

- positive safe-integer entity-ID validation
- 1-200 character reason validation
- command-shaping and control-character rejection
- stable success, not-found, malformed, and unrecognized-result outcomes
- tests proving raw Telnet and cleanup details are not copied into Discord messages

### Current Phase

5. Add `/game kick` through the approved fixed operation.

The command must reuse `ManageGuild`, the existing game Provider resolver and remote execution wrapper, `DiscordGamePlayerTargetValidator`, and `DiscordGameAdministrationResultFormatter`.

### Remaining Phases

6. Capture and approve exact ban evidence, then add `/game ban`.
7. Capture and approve exact unban evidence, then add `/game unban`.
8. Add whitelist add and remove only after both operations are independently proven.
9. Add final serialized registration, dispatch, authorization, malformed-input, privacy, and regression coverage.
10. Complete live Discord-to-game verification.
11. Synchronize documentation and versions, add release notes, run final regression, and close v1.4.0.

### Verified Kick Contract

Online discovery:

```text
id=<entity id>, <player name>
Total of <count> in the game
```

Execution:

```text
kick <online entity id> "<validated reason>"
```

Success:

```text
Kicking Player <name>: <reason>
```

Offline or invalid target:

```text
"<target>" is not a valid entity id, player name or user id.
```

Entity IDs are online administration targets. Steam and EOS identifiers remain the durable account identifiers for future offline and cross-server administration.

### Safety and Privacy Requirements

- Administrative actions remain guild-only and permission-gated.
- Targets must be exact and unambiguous.
- Ambiguous names must not be guessed.
- Fixed operations reject command-shaping characters and malformed identifiers before Provider execution.
- Discord must not receive raw Telnet output, credentials, IP addresses, positions, health values, socket details, platform identifiers, or internal errors.
- Platform identifiers may be stored internally when future durable administration requires them.
- Timeout, disconnect, not-found, already-banned, not-banned, invalid-target, and server rejection outcomes fail safely.
- Raw Telnet remains on loopback, LAN, VPN, or another protected path.

### Outside v1.4.0

- Arbitrary console execution
- Free-form Telnet input
- Cross-platform identity linking
- Automatic fuzzy matching
- Continuous chat bridging
- Economy-backed game effects
- Command queues or simultaneous commands
- Multiple game servers
- Automatic process supervision
- Public Telnet exposure

## v1.3.0 - Discord Game Server Command Interface

Status: Completed and tagged

### Implemented Commands

- `/game status`
- `/game time`
- `/game players`
- `/game say <message>`

### Completed Work

1. Reusable `ManageGuild` authorization and narrow Provider resolution.
2. Guild-only status without remote execution.
3. Fixed `gettime` execution.
4. Privacy-safe `listplayers` execution.
5. Fixed quoted `say` execution.
6. Shared safe remote-command failure formatting.
7. Registration and interaction coverage.
8. Live Discord-to-game verification.
9. Regression, documentation, version synchronization, release notes, merge, and release tagging.

### Release Record

- Release pull request: `#43`
- Release merge commit: `71e476641bb5026dfa4d41dbd88131db2326800b`
- Annotated tag: `v1.3.0`

## Future Direction

After v1.4.0, candidate directions include continuous chat integration, Economy-backed game rewards, cross-platform identity mapping, administration interfaces, Discord role translation, expanded Ticket workflows, and persistent Website sessions.

Every future milestone must preserve the established Core, Provider, Module, and Shared ownership boundaries.
