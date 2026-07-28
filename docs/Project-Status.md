# Project Status

## Current Version

v1.2.0

## Current Milestone

v1.3.0 - Discord Game Server Command Interface

Status: In progress; Phases 1 through 3 are complete and Phase 4 is next.

## Milestone Goal

Expose a narrow, authorized Discord command interface over the existing 7 Days to Die Provider command service.

The first command family is planned as:

- `/game status`
- `/game time`
- `/game players`
- `/game say <message>`

The Discord Provider owns slash-command definitions, Discord permission checks, interaction handling, response deferral, and user-facing formatting. The 7 Days to Die Provider continues owning Telnet communication, command execution, completion detection, response and event separation, timeout behavior, and connection failures.

## Verified Phase 1 Boundary

Phase 1 added the Discord-side authorization and Provider-resolution foundations without adding a `/game` command.

Verified work:

- Added one reusable Discord game-command authorization service.
- Selected Discord `ManageGuild` as the initial fixed staff requirement.
- Added a Provider Manager-backed resolver for the framework-loaded `7 Days to Die` Provider.
- Distinguished unavailable, not-ready, invalid-boundary, and available resolution outcomes.
- Returned only a frozen `executeCommand` service boundary to future commands.
- Prevented commands from receiving the Provider Manager, Core Registry, Telnet client, socket, configuration, password, or other Provider internals.
- Injected both focused boundaries into the Discord command-loading path.
- Added deterministic tests without Discord login, Telnet sockets, or live credentials.

## Verified Phase 2 Status Command

Phase 2 added the first Discord game-server slash command without sending a Telnet command.

Verified work:

- Added the guild-only `/game status` subcommand.
- Applied the Phase 1 `ManageGuild` authorization boundary.
- Used the Phase 1 Provider resolver rather than accessing Registry or Provider internals.
- Reported available, unavailable, not-ready, and invalid Provider-boundary states with safe ephemeral replies.
- Kept status inspection local to the Discord-side Provider boundary; no remote game command is executed.
- Registered the command through the existing Discord command loader.
- Added deterministic command-definition, authorization, resolution, reply, and unsupported-subcommand tests.

## Verified Phase 3 Time Command

Phase 3 adds the first remote Discord-to-game command path.

Verified work:

- Added the guild-only `/game time` subcommand.
- Reused the Phase 1 authorization and Provider-resolution boundaries.
- Deferred the Discord reply before remote execution.
- Executed only the fixed `gettime` command through the narrow Provider service.
- Extracted only the verified `Day N, HH:MM` response format.
- Returned a safe message when no verified time line was present.
- Avoided command execution when the Provider was unavailable.
- Added deterministic tests without Discord login, Telnet sockets, or a live game server.

## Planned Phases

1. Completed: define the Discord permission and Provider-resolution boundary.
2. Completed: add `/game status` without sending a remote command.
3. Completed: add `/game time` through `gettime`.
4. Next: add `/game players` through `listplayers`.
5. Add `/game say` through the verified `say` command path.
6. Add formatting and safe handling for unavailable Providers, timeouts, failures, and malformed results.
7. Add command registration and interaction tests.
8. Perform live Discord-to-game verification.
9. Complete regression, documentation, version synchronization, and v1.3.0 release closure.

## v1.3.0 Boundaries

The milestone does not include:

- Arbitrary console command execution
- Hosted-player ban, kick, whitelist, or other player-administration workflows
- Cross-platform player identity linking
- Discord and in-game chat bridging
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
- `/game status` and `/game time` are implemented; player listing and game chat commands are not yet implemented.
- Hosted player moderation workflows are not implemented.
- Discord and in-game chat bridging is not implemented.
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
