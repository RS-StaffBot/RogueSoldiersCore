# Rogue Soldiers Framework Roadmap

## Current Status

**Repository Version:** v1.2.0

**Current Milestone:** v1.3.0 - Discord Game Server Command Interface

**Status:** In progress; Phase 1 is complete and Phase 2 is next

## Completed Milestones

- v0.1.0 - Project Foundation
- v0.2.0 - Framework Online
- v0.2.1 - Architecture Stabilization
- v0.3.0 - Discord Command Framework
- v0.3.1 - Command Framework Architecture Consolidation
- v0.4.0 - Moderation Module
- v0.5.0 - Economy Module
- v0.6.0 - Tickets
- v0.7.0 - Database
- v0.8.0 - 7 Days to Die Provider
- v0.9.0 - Website Provider
- v1.0.0 - Production Release
- v1.1.0 - Administration and Configuration Foundation
- v1.2.0 - 7 Days to Die Command Execution Foundation

## v1.3.0 - Discord Game Server Command Interface

### Goal

Provide a narrow Discord slash-command interface over the completed 7 Days to Die Provider command service.

The initial command family is:

- `/game status`
- `/game time`
- `/game players`
- `/game say <message>`

### Architecture Boundary

```text
Discord interaction
    |
    v
Discord command
    |
    v
Discord game Provider resolver
    |
    v
SevenDaysToDieProvider.executeCommand()
    |
    v
7DTD Telnet command service
```

The Discord Provider owns:

- Slash-command definitions
- Discord permission checks
- Interaction handling and reply deferral
- User-facing result formatting
- Safe Discord error wording
- Narrow resolution of the framework-loaded game Provider

The 7 Days to Die Provider retains ownership of:

- Telnet communication
- Command execution
- Completion detection
- Response and event separation
- Timeout and connection failures
- Single-active-command enforcement

No Module is introduced for these direct platform operations.

### Completed Phase 1

Phase 1 established:

- `DiscordGameCommandAuthorizer`
- Discord `ManageGuild` as the initial game-command permission requirement
- `DiscordGameServerProviderResolver`
- Stable available, unavailable, not-ready, and invalid-boundary outcomes
- A frozen service containing only `executeCommand`
- Provider Manager-backed resolution without exposing the Provider Manager to commands
- Discord command-loader injection for both focused boundaries
- Deterministic automated tests without live Discord or Telnet access

### Planned Phases

1. Completed: define the Discord permission and Provider-resolution boundary.
2. Next: add `/game status` without sending a remote command.
3. Add `/game time` using `gettime`.
4. Add `/game players` using `listplayers`.
5. Add `/game say` using the verified `say` command path.
6. Add response formatting and safe handling for unavailable Providers, timeouts, failures, and malformed results.
7. Add command registration and interaction tests.
8. Perform live Discord-to-game verification.
9. Complete regression, documentation, version synchronization, and v1.3.0 release closure.

### Outside v1.3.0

- Arbitrary console command execution
- Hosted-player ban, kick, whitelist, or player-administration workflows
- Cross-platform player identity linking
- Discord and in-game chat bridging
- Economy-backed game purchases or rewards
- Command queues
- Multiple simultaneous game commands
- Multiple game servers
- Automatic game-server startup or process supervision
- Public Telnet exposure
- Logfile-based command-response parsing

## v1.2.0 - 7 Days to Die Command Execution Foundation

Status: Completed and tagged

Verified work:

- Sanitized raw Telnet evidence fixtures
- Telnet line framing and protocol-byte removal
- One active command at a time
- Provider-owned command-response service
- Deterministic completion for `gettime`, `listplayers`, `lp`, `say`, `help`, and invalid commands
- Bounded inactivity fallback for unverified multiline output
- Unsolicited event separation
- Timeout, disconnect, write, decision, and truncation failure handling
- Stale startup-banner exclusion
- Password-protected and direct-console readiness compatibility
- Live command verification against a running 7 Days to Die V3.1 test server

## v1.2.0 Release Record

- Release pull request: `#32`
- Release merge commit: `9faa79314d092ba3e8092af1e00405af6d6cc9b8`
- Annotated release tag: `v1.2.0`

## Future Direction

Future milestones may include:

- Hosted game-server player administration
- Discord and in-game chat integration
- Economy-backed in-game rewards and purchases
- Cross-platform player identity mapping
- A Discord or Website administration interface over the v1.1 settings services
- Discord role translation into reusable RSF permissions
- Ticket channels, transcripts, and appeal workflows
- Persistent Website sessions

Every future milestone must preserve the established architecture:

- Core coordinates framework infrastructure and lifecycle.
- Providers integrate external platforms and systems.
- Modules own reusable business logic.
- Shared contains proven cross-layer contracts and utilities.
