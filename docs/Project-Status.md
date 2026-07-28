# Project Status

## Current Version

v1.2.0

## Current Milestone

v1.3.0 - Discord Game Server Command Interface

Status: Selected and planned; implementation has not started.

## Milestone Goal

Expose a narrow, authorized Discord command interface over the existing 7 Days to Die Provider command service.

The first command family is planned as:

- `/game status`
- `/game time`
- `/game players`
- `/game say <message>`

The Discord Provider will own slash-command definitions, Discord permission checks, interaction handling, response deferral, and user-facing formatting. The 7 Days to Die Provider will continue owning Telnet communication, command execution, completion detection, response and event separation, timeout behavior, and connection failures.

## Planned Phases

1. Define the Discord permission and Provider-resolution boundary.
2. Add `/game status` without sending a remote command.
3. Add `/game time` through `gettime`.
4. Add `/game players` through `listplayers`.
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
- Discord game-server commands are not yet implemented.
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