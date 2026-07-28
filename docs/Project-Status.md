# Project Status

## Current Version

v1.2.0

## Current Milestone

v1.2.0 - 7 Days to Die Command Execution Foundation

Status: Closure in progress pending release pull request, final merged-main verification, and tag.

## Last Completed Milestone

v1.1.0 - Administration and Configuration Foundation

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

## Live Verification Result

The Provider connected through the direct-console Telnet flow and successfully executed:

- `gettime`
- `listplayers`
- `say "RSF live command service test"`
- `help say`
- an intentionally invalid command

All successful commands returned deterministic completion reasons, startup banner lines were excluded from the first result, response and event lines remained separated, and Provider shutdown completed cleanly.

## Automated Verification

The release branch is required to pass:

```powershell
npm.cmd ci
npm.cmd audit --omit=dev --audit-level=high
npm.cmd test
npm.cmd run lint
```

The final local regression before closure passed with:

- 0 production vulnerabilities
- 325 tests passed
- 0 failed tests
- ESLint passing after removal of the temporary untracked live-verification script

GitHub Actions validates the project on Node.js 22.

## Current Production Boundaries

- RSF supports a single-process SQLite deployment.
- Node.js 22.13 or newer is required for the built-in `node:sqlite` API.
- The Discord Provider requires valid production credentials and network access.
- The optional 7 Days to Die Provider supports one active command at a time through raw Telnet.
- Raw Telnet is unencrypted and must remain on loopback, LAN, VPN, or another protected private path.
- Discord game-server commands are not implemented.
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

## Release Closure Requirements

Before v1.2.0 is tagged:

- All version locations must report `1.2.0`.
- The release-closure pull request must pass CI.
- Documentation must match the merged repository.
- The final repository state must be verified.
- The annotated `v1.2.0` tag must be created from verified `main` and pushed to GitHub.

## Release Notes

See `docs/Release-Notes-v1.2.0.md`.
