# Project Status

## Current Version

v1.3.0

## Current Milestone

v1.4.0 - Hosted Player Administration

Status: In progress; Phase 6 is next.

## Milestone Goal

Add a narrow, authorized Discord interface for administering individual players on the hosted 7 Days to Die server without exposing arbitrary console execution.

The milestone builds on the existing `/game` command family, `ManageGuild` authorization, focused game Provider resolver, immutable command-result boundary, and single-active-command enforcement.

## Planned Command Family

- `/game kick`
- `/game ban`
- `/game unban`
- `/game whitelist add`
- `/game whitelist remove`

Exact options, identifiers, server command shapes, completion evidence, and response parsing must be proven before each operation is exposed.

## Architecture Boundary

The Discord Provider owns slash-command definitions, Discord authorization, interaction handling, input validation, response deferral, safe result parsing, and user-facing formatting.

The 7 Days to Die Provider retains ownership of Telnet communication, fixed command construction, command execution, response completion, event separation, timeout behavior, connection failures, and single-active-command enforcement.

No arbitrary console entry is exposed. Commands receive only the frozen `executeCommand` service boundary. No Module is introduced for direct game-platform administration unless reusable cross-platform policy is proven later.

## Completed v1.4.0 Work

### Phase 1 - Live Kick Evidence

Live evidence against 7 Days to Die V3.1.0 b13 proved:

- `listplayerids` returns `id=<entity id>, <player name>` rows followed by `Total of N in the game`.
- Entity IDs remain associated with saved players across reconnects and a clean server restart.
- Entity IDs are accepted as kick targets only while the player is online.
- `kick <entity id> "<reason>"` succeeds with `Kicking Player <name>: <reason>`.
- Offline entity targets return `"<target>" is not a valid entity id, player name or user id.`.
- Disconnect events, warnings, and engine stack traces after success are unrelated cleanup output.
- Steam and EOS identifiers remain durable account identifiers for future offline and cross-server work.

### Phase 2 - Approved Kick Contract

Approved Provider command shape:

```text
kick <online entity id> "<validated reason>"
```

Approved terminal lines:

```text
Kicking Player <name>: <reason>
"<target>" is not a valid entity id, player name or user id.
```

### Phase 3 - Provider Completion Coverage

`SevenDaysToDieCommandCompletionRules` recognizes verified kick success and invalid-target lines only for `kick`. Automated coverage proves later disconnect cleanup and stack traces do not complete or contaminate the result.

### Phase 4 - Discord Validation and Safe Formatting

Added `DiscordGamePlayerTargetValidator` for positive safe-integer online entity IDs and bounded kick reasons. Added `DiscordGameAdministrationResultFormatter` for privacy-safe success, not-found, malformed, and unrecognized kick outcomes.

### Phase 5 - Discord `/game kick`

Added guild-only `/game kick entity-id:<id> reason:<text>` through the existing `ManageGuild` boundary.

Verified behavior:

- validates the exact online entity ID and reason before Provider resolution
- executes only `kick <entity id> "<reason>"`
- defers an ephemeral Discord response before remote execution
- reuses the shared timeout, disconnect, generic failure, and thrown-error formatting
- formats verified success and offline/not-found results without raw Telnet output
- registers and dispatches through the existing `/game` command path

## Next Phase

Phase 6 captures and approves exact live ban evidence before `/game ban` is implemented.

## Remaining Planned Phases

1. Capture and approve exact ban evidence, then add `/game ban`.
2. Capture and approve exact unban evidence, then add `/game unban`.
3. Add whitelist operations only after independent evidence.
4. Add final registration, dispatch, authorization, privacy, and regression coverage.
5. Complete live Discord-to-game verification.
6. Synchronize documentation and versions, add release notes, run final regression, and close v1.4.0.

## v1.4.0 Safety Boundaries

The milestone does not include arbitrary console execution, free-form Telnet input, cross-platform identity linking, fuzzy player matching, continuous chat bridging, Economy-backed game effects, command queues, multiple servers, process supervision, or public Telnet exposure.

Administrative actions must fail safely for missing, ambiguous, malformed, offline, rejected, already-banned, or not-banned targets. Ordinary Discord responses must not expose raw Telnet output, credentials, IP addresses, positions, health values, platform identifiers, socket details, or internal errors.

## Current Discord Game Capability

The guild-only `/game` family includes:

- `/game status`
- `/game time`
- `/game players`
- `/game say message:<text>`
- `/game kick entity-id:<id> reason:<text>`

It requires Discord `ManageGuild`, uses ephemeral responses, and resolves only a frozen `executeCommand` service from the framework-loaded `7 Days to Die` Provider.

## Current Production Boundaries

- RSF supports a single-process SQLite deployment.
- Node.js 22.13 or newer is required for `node:sqlite`.
- The optional 7 Days to Die Provider supports one active command at a time through private raw Telnet.
- Durable offline ban, unban, whitelist, and cross-platform identity workflows remain unimplemented.
- Continuous chat bridging, Economy-backed game effects, command queues, and multiple game servers remain future work.

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
