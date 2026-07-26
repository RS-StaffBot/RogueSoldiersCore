# Changelog

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

- Administrative command execution
- Player lookup and administration
- Discord-to-game and game-to-Discord communication
- Economy rewards that produce in-game effects
- Reconnect behavior
- Multiple-server management
- Web-based configuration
- Public-internet raw TCP usage

## v0.1.0

- Initial project setup
- Git repository created
- Project structure established
