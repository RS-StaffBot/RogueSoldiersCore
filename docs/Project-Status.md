# Project Status

## Current Version

v1.2.0

## Current Milestone

v1.3.0 - Discord Game Server Command Interface

Status: In progress; Phases 1 through 7 are complete and Phase 8 is next.

## Milestone Goal

Expose a narrow, authorized Discord command interface over the existing 7 Days to Die Provider command service.

The first command family is:

- `/game status`
- `/game time`
- `/game players`
- `/game say <message>`

The Discord Provider owns slash-command definitions, Discord permission checks, interaction handling, response deferral, input validation, and user-facing formatting. The 7 Days to Die Provider continues owning Telnet communication, command execution, completion detection, response and event separation, timeout behavior, and connection failures.

## Verified Phase 1 Boundary

- Added one reusable Discord game-command authorization service.
- Selected Discord `ManageGuild` as the initial fixed staff requirement.
- Added a Provider Manager-backed resolver for the framework-loaded `7 Days to Die` Provider.
- Distinguished unavailable, not-ready, invalid-boundary, and available outcomes.
- Returned only a frozen `executeCommand` service boundary to commands.
- Prevented commands from receiving Provider Manager, Registry, Telnet, socket, configuration, or credential internals.
- Added deterministic tests without Discord login, Telnet sockets, or live credentials.

## Verified Phase 2 Status Command

- Added the guild-only `/game status` subcommand.
- Applied the Phase 1 authorization and Provider-resolution boundaries.
- Reported available, unavailable, not-ready, and invalid Provider-boundary states with safe ephemeral replies.
- Kept status inspection local; no remote command is executed.

## Verified Phase 3 Time Command

- Added the guild-only `/game time` subcommand.
- Deferred the Discord reply before remote execution.
- Executed only the fixed `gettime` command.
- Extracted only the verified `Day N, HH:MM` response format.
- Returned a safe message for unavailable Providers or malformed output.

## Verified Phase 4 Players Command

- Added the guild-only `/game players` subcommand.
- Executed only the fixed `listplayers` command.
- Parsed verified player rows and the `Total of N in the game` terminator.
- Returned only player display names and the verified total.
- Prevented IP addresses, platform identifiers, positions, health, and other raw server fields from reaching Discord.
- Returned safe messages for empty, unavailable, and malformed results.

## Verified Phase 5 Say Command

- Added the guild-only `/game say message:<text>` subcommand.
- Reused the Phase 1 authorization and Provider-resolution boundaries.
- Bounded messages to 1-200 characters.
- Rejected leading or trailing whitespace, quotes, backslashes, and control characters before Provider resolution.
- Constructed only the fixed quoted `say "<message>"` command path.
- Deferred the Discord reply before remote execution.
- Returned a safe success or failure acknowledgement without exposing Telnet output.
- Added deterministic tests without Discord login, Telnet sockets, credentials, or a live game server.

## Verified Phase 6 Failure Formatting

- Added one Discord-side remote-command execution wrapper for all remote `/game` operations.
- Distinguished timeout, disconnect, generic command failure, malformed result, and thrown execution errors.
- Returned stable user-facing messages without exposing raw Telnet output, credentials, socket details, IP addresses, or internal error text.
- Preserved deferred ephemeral interaction behavior for remote commands.
- Kept failure ownership boundaries intact: the 7 Days to Die Provider produces command outcomes while the Discord Provider formats them for staff.
- Added deterministic coverage for every supported failure outcome.

## Verified Phase 7 Registration and Interaction Coverage

- Verified the serialized guild-only `/game` command definition.
- Verified the fixed `ManageGuild` default permission.
- Verified registration of `status`, `time`, `players`, and `say` through the existing command loader and registry.
- Verified the bounded required `message` option for `/game say`.
- Verified dispatch through the existing Discord `interactionCreate` handler.
- Verified every subcommand reaches the correct fixed Provider operation and returns the expected Discord response.
- Added deterministic integration coverage without Discord login, Telnet sockets, credentials, or a live game server.

## Planned Phases

1. Completed: define the Discord permission and Provider-resolution boundary.
2. Completed: add `/game status` without sending a remote command.
3. Completed: add `/game time` through `gettime`.
4. Completed: add `/game players` through `listplayers`.
5. Completed: add `/game say` through the verified `say` command path.
6. Completed: consolidate response formatting and safe handling for unavailable Providers, timeouts, failures, and malformed results.
7. Completed: add final command registration and interaction coverage.
8. Next: perform live Discord-to-game verification.
9. Complete regression, documentation, version synchronization, and v1.3.0 release closure.

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

## Verified v1.2.0 Command Execution Work

- Captured and sanitized deployment-specific raw Telnet evidence
- Implemented raw Telnet line framing and protocol-byte removal
- Added a Provider-owned single-command execution lifecycle
- Added verified completion rules for `gettime`, `listplayers`, `lp`, `say`, `help`, and invalid commands
- Added bounded inactivity fallback for unverified multiline command output
- Separated unsolicited server activity from active command responses
- Added timeout, disconnect, write-failure, decision-failure, and truncation handling
- Exposed `SevenDaysToDieProvider.executeCommand(command)` as the Provider command service boundary
- Prevented simultaneous command execution
- Excluded stale Telnet startup banner lines from first-command results
- Supported both password-protected and direct-console Telnet readiness flows
- Completed live verification against a running 7 Days to Die V3.1 test server

## Automated Verification Baseline

The v1.2.0 release passed:

```powershell
npm.cmd ci
npm.cmd audit --omit=dev --audit-level=high
npm.cmd test
npm.cmd run lint
```

Final v1.2.0 verification results:

- 0 production vulnerabilities
- 325 tests passed
- 0 failed tests
- ESLint passed
- GitHub Actions passed on Node.js 22
- Annotated tag `v1.2.0` points to verified merged `main`

## Current Production Boundaries

- RSF supports a single-process SQLite deployment.
- Node.js 22.13 or newer is required for the built-in `node:sqlite` API.
- The Discord Provider requires valid production credentials and network access.
- The optional 7 Days to Die Provider supports one active command at a time through raw Telnet.
- Raw Telnet is unencrypted and must remain on loopback, LAN, VPN, or another protected private path.
- `/game status`, `/game time`, `/game players`, and `/game say` are implemented.
- Hosted player moderation workflows are not implemented.
- Continuous Discord and in-game chat bridging is not implemented.
- Economy-backed in-game purchases are not implemented.
- Multiple simultaneous game commands and multiple game servers are not implemented.
- The Website Provider and Website authentication remain disabled by default.
- Website sessions and pending OAuth attempts remain in memory and are lost on restart.
- Settings have no Discord or Website editing interface.
- Discord roles are not yet translated into RSF settings permissions.
- Secrets cannot be edited through the settings system.
- Cross-platform identity, clustering, remote databases, and multi-community administration remain future work.

## Release Record

- v1.2.0 release pull request: `#32`
- v1.2.0 release merge commit: `9faa79314d092ba3e8092af1e00405af6d6cc9b8`
- Annotated release tag: `v1.2.0`

## Release Notes

See `docs/Release-Notes-v1.2.0.md`.