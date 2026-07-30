# Project Status

## Current Version

v1.3.0

## Current Milestone

v1.4.0 - Hosted Player Administration

Status: In progress; Phase 4 is next.

## Milestone Goal

Add a narrow, authorized Discord interface for administering individual players on the hosted 7 Days to Die server without exposing arbitrary console execution.

The milestone builds on the existing `/game` command family, `ManageGuild` authorization, focused game Provider resolver, immutable command-result boundary, and single-active-command enforcement.

## Planned Command Family

The intended command family is:

- `/game kick`
- `/game ban`
- `/game unban`
- `/game whitelist add`
- `/game whitelist remove`

Exact options, player identifiers, server command shapes, success evidence, failure evidence, and response parsing must be proven before each operation is implemented. Names and identifiers must not be guessed from undocumented server behavior.

## Architecture Boundary

The Discord Provider owns slash-command definitions, Discord authorization, interaction handling, input validation, response deferral, and safe user-facing formatting.

The 7 Days to Die Provider retains ownership of Telnet communication, fixed command construction, command execution, response completion, event separation, timeout behavior, connection failures, and single-active-command enforcement.

No arbitrary console command entry is exposed. Commands receive only the existing frozen `executeCommand` service boundary. No Module is introduced for direct game-platform administration unless reusable cross-platform business policy is proven later.

## Completed v1.4.0 Work

### Phase 1 - Live Kick Evidence

Live evidence was captured against 7 Days to Die V3.1.0 b13.

Verified behavior:

- `listplayerids` returns online rows as `id=<entity id>, <player name>` followed by `Total of N in the game`.
- The entity ID remained associated with the same saved player across reconnects and a clean server restart.
- The entity ID is accepted as a kick target only while that player is currently online.
- `kick <entity id> "<reason>"` succeeds with `Kicking Player <name>: <reason>`.
- An offline entity target is rejected with `"<target>" is not a valid entity id, player name or user id.`.
- Successful kicks are followed by disconnect events, warnings, and possible engine stack traces that are unrelated cleanup output.
- Steam and EOS identifiers are durable account identifiers suitable for future offline ban, whitelist, and cross-server identity work; they are not required for the first online kick operation.

### Phase 2 - Approved Kick Contract

The first approved administration operation is online kick.

Approved Provider command shape:

```text
kick <online entity id> "<validated reason>"
```

Approved deterministic completion lines:

```text
Kicking Player <name>: <reason>
"<target>" is not a valid entity id, player name or user id.
```

Entity IDs must be resolved from the current online-player state before execution. They must not be treated as globally permanent account identifiers.

### Phase 3 - Provider Completion Coverage

`SevenDaysToDieCommandCompletionRules` now recognizes the verified kick success and invalid-target rejection lines only for the `kick` command.

Automated coverage verifies:

- the command remains pending before a verified terminal line
- kick success completes deterministically
- offline or invalid target rejection completes deterministically
- disconnect events, cleanup warnings, and stack traces do not independently complete a kick
- command-service results stop at the verified terminal line and exclude later cleanup output

## Next Phase

Phase 4 adds shared Discord-side player-target validation and privacy-safe administration result formatting. It will not yet register or expose `/game kick`.

## Remaining Planned Phases

1. Add shared Discord-side player-target validation and privacy-safe administration result formatting.
2. Add `/game kick` through the approved fixed server command.
3. Add `/game ban` through one fixed, evidence-backed server command.
4. Add `/game unban` through one fixed, evidence-backed server command.
5. Add whitelist add and remove operations only after their exact server behavior is proven.
6. Add registration, interaction, authorization, privacy, and regression coverage for the completed command family.
7. Complete live Discord-to-game verification, documentation synchronization, version synchronization, release notes, and v1.4.0 release closure.

## v1.4.0 Safety Boundaries

The milestone does not include:

- Arbitrary console command execution
- Free-form Telnet command input
- Discord-to-game identity linking
- Automatic resolution of ambiguous player names
- Continuous Discord and in-game chat bridging
- Economy-backed game purchases or rewards
- Command queues or multiple simultaneous game commands
- Multiple game servers
- Automatic game-server startup or process supervision
- Public Telnet exposure

Administrative actions must fail safely when a player target is missing, ambiguous, malformed, not found, already banned, not banned, or otherwise rejected by the server. Discord responses must not expose raw Telnet output, credentials, IP addresses, positions, health values, socket details, or internal error text.

## Completed v1.3.0 Capability

The Discord Provider exposes this guild-only command family:

- `/game status`
- `/game time`
- `/game players`
- `/game say <message>`

The command family requires Discord `ManageGuild`, uses ephemeral responses, and resolves only a frozen `executeCommand` service from the framework-loaded `7 Days to Die` Provider.

## Current Production Boundaries

- RSF supports a single-process SQLite deployment.
- Node.js 22.13 or newer is required for `node:sqlite`.
- The Discord Provider requires valid production credentials and network access.
- The optional 7 Days to Die Provider supports one active command at a time through raw Telnet.
- Raw Telnet is unencrypted and must remain on loopback, LAN, VPN, or another protected private path.
- Hosted player administration remains unavailable through Discord until the remaining v1.4.0 phases are completed and verified.
- Continuous chat bridging, Economy-backed in-game purchases, command queues, and multiple game servers are not implemented.
- The Website Provider and Website authentication remain disabled by default.
- Website sessions and pending OAuth attempts remain in memory and are lost on restart.
- Settings have no Discord or Website editing interface.
- Discord roles are not yet translated into RSF settings permissions.
- Secrets cannot be edited through the settings system.
- Cross-platform identity, clustering, remote databases, and multi-community administration remain future work.

## v1.3.0 Release Record

- Release pull request: `#43`
- Release merge commit: `71e476641bb5026dfa4d41dbd88131db2326800b`
- Annotated tag: `v1.3.0`

## Previous Release Record

- v1.2.0 release pull request: `#32`
- v1.2.0 release merge commit: `9faa79314d092ba3e8092af1e00405af6d6cc9b8`
- Annotated tag: `v1.2.0`

## Release Notes

See `docs/Release-Notes-v1.3.0.md`.
