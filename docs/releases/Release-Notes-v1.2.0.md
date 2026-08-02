# Rogue Soldiers Framework v1.2.0

## 7 Days to Die Command Execution Foundation

Version 1.2.0 establishes the first live-verified hosted game-server command boundary in RSF.

The optional 7 Days to Die Provider can now execute one raw Telnet command at a time and return a structured immutable result without moving game-specific protocol behavior into Core or a business Module.

## Added

- Sanitized deployment evidence fixtures for command output and unsolicited server activity
- Raw Telnet CRLF and LF line framing
- Telnet negotiation and subnegotiation byte removal
- UTF-8-safe chunk handling
- Bounded incomplete-line buffering
- Provider-owned command execution service
- Immutable command results with response lines, event lines, timestamps, completion reason, status, and truncation state
- Verified completion rules for:
  - `gettime`
  - `listplayers`
  - `lp`
  - `say`
  - `help`
  - invalid commands
- Bounded inactivity completion for unverified multiline commands
- Unsolicited server-event classification and separation
- Timeout, disconnect, write-failure, decision-failure, and size-limit handling
- Protection against simultaneous command execution
- `SevenDaysToDieProvider.executeCommand(command)`
- Compatibility with password-protected Telnet sessions
- Compatibility with servers that open directly into the console
- Startup-banner exclusion from the first active command result

## Live Verification

The completed Provider was tested against a running 7 Days to Die V3.1 server through a loopback Telnet connection.

The following command paths completed successfully:

- `gettime`
- `listplayers`
- `say "RSF live command service test"`
- `help say`
- an intentionally invalid command

The first command result contained no stale startup banner, command completion reasons matched the verified rules, and shutdown completed cleanly.

## Verification

The final local regression completed with:

- 0 production dependency vulnerabilities
- 325 passing tests
- 0 failed tests
- ESLint passing after removal of the temporary untracked live-verification script

GitHub Actions must pass before merge.

## Security Boundary

7 Days to Die Telnet traffic is raw and unencrypted. The Telnet management endpoint and password must remain on loopback, a protected LAN, a VPN, or another private administration path. The public game-server IP and game port used by players are separate from the Telnet administration endpoint.

## Not Included

Version 1.2.0 does not add:

- Discord game-server commands
- Player ban, kick, whitelist, or moderation workflows
- Player-account linking
- Discord and in-game chat bridging
- Economy-backed game purchases or rewards
- Multiple simultaneous commands
- Multiple game servers
- Automatic game-server process management
- Public Telnet support
- Logfile-based command-response parsing
