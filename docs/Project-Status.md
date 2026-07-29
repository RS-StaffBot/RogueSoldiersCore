# Project Status

## Current Version

v1.3.0

## Current Milestone

v1.4.0 - Hosted Player Administration

Status: Selected; Phase 1 is next.

## Milestone Goal

Add a narrow, authorized Discord interface for administering individual players on the hosted 7 Days to Die server without exposing arbitrary console execution.

The milestone will build on the existing `/game` command family, `ManageGuild` authorization, focused game Provider resolver, immutable command-result boundary, and single-active-command enforcement.

## Planned Command Family

The intended command family is:

- `/game kick`
- `/game ban`
- `/game unban`
- `/game whitelist add`
- `/game whitelist remove`

Exact options, player identifiers, server command shapes, success evidence, failure evidence, and response parsing must be proven before each operation is implemented. Names and identifiers must not be guessed from undocumented server behavior.

## Architecture Boundary

The Discord Provider will own slash-command definitions, Discord authorization, interaction handling, input validation, response deferral, and safe user-facing formatting.

The 7 Days to Die Provider will retain ownership of Telnet communication, fixed command construction, command execution, response completion, event separation, timeout behavior, connection failures, and single-active-command enforcement.

No arbitrary console command entry will be exposed. Commands will receive only the existing frozen `executeCommand` service boundary. No Module is introduced for direct game-platform administration unless reusable cross-platform business policy is proven later.

## Planned Phases

1. Capture and sanitize live evidence for supported player-administration commands, identifiers, success responses, failure responses, and completion boundaries.
2. Add Provider-side deterministic completion coverage for the first approved player-administration operation.
3. Add shared Discord-side player target validation and safe administration result formatting.
4. Add `/game kick` through one fixed, evidence-backed server command.
5. Add `/game ban` through one fixed, evidence-backed server command.
6. Add `/game unban` through one fixed, evidence-backed server command.
7. Add whitelist add and remove operations only after their exact server behavior is proven.
8. Add registration, interaction, authorization, privacy, and regression coverage for the completed command family.
9. Complete live Discord-to-game verification, documentation synchronization, version synchronization, release notes, and v1.4.0 release closure.

## v1.4.0 Safety Boundaries

The milestone will not include:

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

Administrative actions must fail safely when a player target is missing, ambiguous, malformed, not found, already banned, not banned, or otherwise rejected by the server. Discord responses must not expose raw Telnet output, credentials, IP addresses, platform identifiers, positions, health values, socket details, or internal error text.

## Completed v1.3.0 Capability

The Discord Provider exposes this guild-only command family:

- `/game status`
- `/game time`
- `/game players`
- `/game say <message>`

The command family requires Discord `ManageGuild`, uses ephemeral responses, and resolves only a frozen `executeCommand` service from the framework-loaded `7 Days to Die` Provider.

The Discord Provider owns slash-command definitions, permission checks, interaction handling, input validation, response deferral, and safe user-facing formatting. The 7 Days to Die Provider owns Telnet communication, command execution, completion detection, response and unsolicited-event separation, timeout behavior, connection failures, and single-active-command enforcement.

## Verified v1.3.0 Work

- Added reusable Discord game-command authorization using `ManageGuild`.
- Added a Provider Manager-backed resolver with unavailable, not-ready, invalid-boundary, and available outcomes.
- Added `/game status` without remote execution.
- Added `/game time` through fixed `gettime` execution and verified `Day N, HH:MM` parsing.
- Added `/game players` through fixed `listplayers` execution while exposing only player names and total count.
- Added `/game say message:<text>` with a 1-200 character boundary and command-shaping character rejection.
- Added shared Discord-side formatting for timeout, disconnect, execution failure, malformed result, and thrown error outcomes.
- Added final command registration and interaction integration coverage.
- Prevented raw Telnet output, credentials, IP addresses, socket details, internal errors, platform IDs, positions, health, and other private server fields from reaching Discord.

## Live Verification

Live verification passed with Discord and the optional 7 Days to Die Provider both running.

- `/game status` reported control available.
- `/game time` returned the live game day and time.
- `/game players` returned the live empty-server state safely.
- `/game say` executed through Telnet and appeared in the live in-game chat.
- Server logs confirmed fixed execution of `gettime`, `listplayers`, and the quoted `say` command.
- A second suitable Discord account was unavailable for a live negative-permission test; deterministic automated tests verify rejection without `ManageGuild`.

## Current Production Boundaries

- RSF supports a single-process SQLite deployment.
- Node.js 22.13 or newer is required for `node:sqlite`.
- The Discord Provider requires valid production credentials and network access.
- The optional 7 Days to Die Provider supports one active command at a time through raw Telnet.
- Raw Telnet is unencrypted and must remain on loopback, LAN, VPN, or another protected private path.
- Hosted player administration remains unimplemented until v1.4.0 phases are completed and verified.
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