# Rogue Soldiers Framework v1.3.0 Release Notes

## Discord Game Server Command Interface

v1.3.0 adds the first narrow, authorized Discord interface over the completed 7 Days to Die Provider command service.

## New Discord Commands

- `/game status` reports whether game-server control is available without executing a remote command.
- `/game time` executes the fixed `gettime` command and returns the verified `Day N, HH:MM` format.
- `/game players` executes the fixed `listplayers` command and returns only player display names and the verified total.
- `/game say message:<text>` executes the fixed quoted `say` command and returns a safe acknowledgement.

## Authorization and Safety

The `/game` command family is guild-only and requires Discord `ManageGuild`.

Discord commands receive only a frozen `executeCommand` service from the resolved `7 Days to Die` Provider. They do not receive Provider Manager, Registry, Telnet client, socket, configuration, or credential access.

User-facing responses do not expose raw Telnet output, credentials, IP addresses, platform identifiers, positions, health values, socket details, or internal errors.

`/game say` accepts 1-200 characters and rejects leading or trailing whitespace, quotes, backslashes, and control characters before Provider resolution.

## Failure Handling

Remote operations share stable Discord-side formatting for:

- Timeouts
- Disconnects
- Generic command failures
- Malformed results
- Thrown execution errors

The 7 Days to Die Provider remains responsible for Telnet communication, command execution, completion detection, timeout and disconnect outcomes, response and event separation, and one-active-command enforcement.

## Verification

Automated coverage verifies:

- Serialized command registration
- Fixed `ManageGuild` default permission
- Registration of `status`, `time`, `players`, and `say`
- Bounded required `/game say` input
- Existing `interactionCreate` dispatch
- Fixed Provider operations and expected Discord responses
- Safe unavailable, timeout, disconnect, malformed, and error behavior
- Rejection without `ManageGuild`

Live verification passed with Discord and the optional 7 Days to Die Provider running:

- `/game status` reported control available.
- `/game time` returned the live game day and time.
- `/game players` returned the empty-server state safely.
- `/game say` executed through Telnet and appeared in the live game chat.
- Server logs confirmed execution of `gettime`, `listplayers`, and the quoted `say` command.

A second suitable Discord account was unavailable for a live negative-permission check; deterministic automated permission tests passed.

## Deployment Notes

The 7 Days to Die Provider remains optional and disabled by default.

When enabled, deployment requires:

- Valid private host and Telnet port configuration
- `SEVEN_DAYS_TO_DIE_TELNET_PASSWORD` in the environment
- A running compatible 7 Days to Die Telnet service

Raw Telnet is unencrypted and must remain on loopback, LAN, VPN, or another protected private path. It must not be exposed directly to the public internet.

## Not Included

- Arbitrary console command execution
- Hosted-player ban, kick, whitelist, or other player administration
- Cross-platform player identity linking
- Continuous Discord and in-game chat bridging
- Economy-backed in-game purchases or rewards
- Command queues or multiple simultaneous commands
- Multiple game servers
- Automatic game-server process supervision
