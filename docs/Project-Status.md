# Project Status

## Current Version

v1.2.0

## Current Milestone

v1.3.0 - Discord Game Server Command Interface

Status: In progress; Phases 1 through 8 are complete and Phase 9 is next.

## Milestone Goal

Expose a narrow, authorized Discord command interface over the existing 7 Days to Die Provider command service.

The implemented command family is:

- `/game status`
- `/game time`
- `/game players`
- `/game say <message>`

The Discord Provider owns slash-command definitions, Discord permission checks, interaction handling, response deferral, input validation, and user-facing formatting. The 7 Days to Die Provider owns Telnet communication, command execution, completion detection, response and event separation, timeout behavior, connection failures, and single-active-command enforcement.

## Completed v1.3.0 Phases

### Phase 1 - Authorization and Provider Resolution

- Added reusable Discord game-command authorization using `ManageGuild`.
- Added a Provider Manager-backed resolver for the framework-loaded `7 Days to Die` Provider.
- Distinguished unavailable, not-ready, invalid-boundary, and available outcomes.
- Returned only a frozen `executeCommand` service boundary.
- Prevented commands from receiving Provider Manager, Registry, Telnet, socket, configuration, or credential internals.

### Phase 2 - Status

- Added guild-only `/game status`.
- Applied the shared authorization and Provider-resolution boundaries.
- Reported Provider state through safe ephemeral replies without executing a remote command.

### Phase 3 - Time

- Added guild-only `/game time`.
- Deferred the Discord reply before remote execution.
- Executed only the fixed `gettime` command.
- Extracted only the verified `Day N, HH:MM` response format.

### Phase 4 - Players

- Added guild-only `/game players`.
- Executed only the fixed `listplayers` command.
- Parsed verified player rows and the `Total of N in the game` terminator.
- Returned only player display names and the verified total.
- Excluded IP addresses, platform identifiers, positions, health, and other raw fields from Discord.

### Phase 5 - Say

- Added guild-only `/game say message:<text>`.
- Bounded messages to 1-200 characters.
- Rejected leading or trailing whitespace, quotes, backslashes, and control characters.
- Constructed only the fixed quoted `say "<message>"` command path.
- Returned a safe acknowledgement without exposing Telnet output.

### Phase 6 - Failure Formatting

- Added one Discord-side remote-command execution wrapper.
- Distinguished timeout, disconnect, generic command failure, malformed result, and thrown execution errors.
- Returned stable messages without exposing raw Telnet output, credentials, socket details, IP addresses, or internal error text.
- Preserved deferred ephemeral replies.

### Phase 7 - Registration and Interaction Coverage

- Verified the serialized guild-only `/game` definition.
- Verified the fixed `ManageGuild` default permission.
- Verified registration of `status`, `time`, `players`, and `say` through the existing loader and registry.
- Verified the bounded required `/game say` message option.
- Verified dispatch through the existing Discord `interactionCreate` handler.
- Verified every subcommand against its fixed Provider operation and expected Discord response.

### Phase 8 - Live Discord-to-Game Verification

- Verified startup with Discord and the optional 7 Days to Die Provider both running.
- Verified `/game status` reported server control available.
- Verified `/game time` returned the live game time.
- Verified `/game players` returned the live empty-server state safely.
- Verified `/game say` executed through Telnet and appeared in the live in-game chat.
- Confirmed live server execution of `gettime`, `listplayers`, and the fixed quoted `say` command.
- The live negative-permission test could not be performed because a second suitable Discord account was unavailable; deterministic automated coverage verifies rejection without `ManageGuild`.

## Remaining Phase

9. Complete regression, documentation synchronization, version synchronization, release notes, and v1.3.0 release closure.

## v1.3.0 Boundaries

The milestone does not include:

- Arbitrary console command execution
- Hosted-player ban, kick, whitelist, or other player-administration workflows
- Cross-platform player identity linking
- Continuous Discord and in-game chat bridging
- Economy-backed game purchases or rewards
- Command queues or multiple simultaneous game commands
- Multiple game servers
- Public Telnet exposure

## Last Completed Milestone

v1.2.0 - 7 Days to Die Command Execution Foundation

Status: Completed and tagged

## Completed Foundation

- Project Foundation and framework lifecycle
- Stable Core, Provider, Module, and Shared architecture
- Reusable Discord command framework
- Moderation Module and Discord moderation commands
- Economy Module and Discord economy commands
- Ticket Module with creator and staff Discord workflows
- Core-owned SQLite persistence and migrations
- Optional 7 Days to Die Provider connectivity and command execution
- Optional Website Provider with Discord OAuth and creator-owned Ticket listing
- Production deployment, recovery, logging, validation, and security procedures

## Current Production Boundaries

- RSF supports a single-process SQLite deployment.
- Node.js 22.13 or newer is required for `node:sqlite`.
- The Discord Provider requires valid production credentials and network access.
- The optional 7 Days to Die Provider supports one active command at a time through raw Telnet.
- Raw Telnet is unencrypted and must remain on loopback, LAN, VPN, or another protected private path.
- `/game status`, `/game time`, `/game players`, and `/game say` are implemented.
- Hosted player moderation, continuous chat bridging, Economy-backed in-game purchases, command queues, and multiple game servers are not implemented.
- The Website Provider and Website authentication remain disabled by default.
- Website sessions and pending OAuth attempts remain in memory and are lost on restart.
- Settings have no Discord or Website editing interface.
- Discord roles are not yet translated into RSF settings permissions.
- Secrets cannot be edited through the settings system.
- Cross-platform identity, clustering, remote databases, and multi-community administration remain future work.

## v1.2.0 Release Record

- Release pull request: `#32`
- Release merge commit: `9faa79314d092ba3e8092af1e00405af6d6cc9b8`
- Annotated tag: `v1.2.0`

## Release Notes

See `docs/Release-Notes-v1.2.0.md`.