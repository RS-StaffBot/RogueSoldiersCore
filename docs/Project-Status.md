# Project Status

## Current Version

v1.3.0

## Current Milestone

No implementation milestone is currently selected.

v1.3.0 - Discord Game Server Command Interface is complete pending merge and release tagging.

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

## Release Verification

The release candidate must pass:

```powershell
npm.cmd ci
npm.cmd audit --omit=dev --audit-level=high
npm.cmd test
npm.cmd run lint
```

Version values must match in:

- `package.json`
- `package-lock.json`
- `config/core/app.json`
- `docs/Project-Status.md`
- `docs/Roadmap.md`

## v1.3.0 Boundaries

The release does not include:

- Arbitrary console command execution
- Hosted-player ban, kick, whitelist, or other player-administration workflows
- Cross-platform player identity linking
- Continuous Discord and in-game chat bridging
- Economy-backed game purchases or rewards
- Command queues or multiple simultaneous game commands
- Multiple game servers
- Automatic game-server startup or process supervision
- Public Telnet exposure

## Current Production Boundaries

- RSF supports a single-process SQLite deployment.
- Node.js 22.13 or newer is required for `node:sqlite`.
- The Discord Provider requires valid production credentials and network access.
- The optional 7 Days to Die Provider supports one active command at a time through raw Telnet.
- Raw Telnet is unencrypted and must remain on loopback, LAN, VPN, or another protected private path.
- Hosted player moderation, continuous chat bridging, Economy-backed in-game purchases, command queues, and multiple game servers are not implemented.
- The Website Provider and Website authentication remain disabled by default.
- Website sessions and pending OAuth attempts remain in memory and are lost on restart.
- Settings have no Discord or Website editing interface.
- Discord roles are not yet translated into RSF settings permissions.
- Secrets cannot be edited through the settings system.
- Cross-platform identity, clustering, remote databases, and multi-community administration remain future work.

## Previous Release Record

- v1.2.0 release pull request: `#32`
- v1.2.0 release merge commit: `9faa79314d092ba3e8092af1e00405af6d6cc9b8`
- Annotated tag: `v1.2.0`

## Release Notes

See `docs/Release-Notes-v1.3.0.md`.
