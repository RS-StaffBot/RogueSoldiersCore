# Changelog

## v1.3.0

### Added

- Guild-only `/game status` command for safe Provider availability checks
- Guild-only `/game time` command through fixed `gettime` execution
- Guild-only `/game players` command through fixed `listplayers` execution
- Guild-only `/game say message:<text>` command through fixed quoted `say` execution
- Reusable Discord `ManageGuild` authorization boundary for game commands
- Narrow Provider Manager-backed game Provider resolver
- Shared Discord-side remote-command failure formatting
- Final command registration and interaction integration coverage

### Security and Privacy

- Remote game commands receive only a frozen `executeCommand` service boundary
- Telnet credentials, sockets, configuration, Provider internals, raw output, IP addresses, platform IDs, positions, health values, and internal errors are not exposed to Discord
- `/game say` is bounded to 1-200 characters and rejects quotes, backslashes, control characters, and leading or trailing whitespace
- Raw Telnet remains restricted to loopback, LAN, VPN, or another protected private path

### Verified

- Live `/game status`, `/game time`, `/game players`, and `/game say` execution
- Live Telnet execution of `gettime`, `listplayers`, and quoted `say`
- Discord-originated chat message displayed in-game
- Deterministic authorization rejection without `ManageGuild`

### Known Boundaries

- No arbitrary console execution
- No hosted-player administration
- No continuous chat bridge
- No Economy-backed in-game purchases or rewards
- No command queue, simultaneous command execution, or multiple-server management

## v0.8.0

### Added

- Optional `SevenDaysToDieProvider`
- Raw TCP client using Node's built-in `node:net` API
- Telnet authentication and console-readiness handling
- Conditional `ProviderLoader` integration
- Handwritten fake-socket, client, lifecycle, readiness, and failure tests

### Changed

- Unexpected post-readiness connection loss now moves the Provider to `ERROR`
- Intentional shutdown remains `STOPPED`
- Client disconnection is awaited, idempotent, and listener-safe

### Deferred and Known Boundaries

- Player lookup and administration
- Continuous Discord-to-game and game-to-Discord communication
- Economy rewards that produce in-game effects
- Reconnect behavior
- Multiple-server management
- Web-based configuration
- Public-internet raw TCP usage

## v0.1.0

- Initial project setup
- Git repository created
- Project structure established
