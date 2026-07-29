# Rogue Soldiers Framework Roadmap

## Current Status

**Repository Version:** v1.2.0

**Current Milestone:** v1.3.0 - Discord Game Server Command Interface

**Status:** In progress; Phases 1 through 7 are complete and Phase 8 is next

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

The command family is:

- `/game status`
- `/game time`
- `/game players`
- `/game say <message>`

### Architecture Boundary

The Discord Provider owns slash-command definitions, Discord permissions, input validation, interaction handling, reply deferral, result formatting, safe error wording, and narrow game Provider resolution.

The 7 Days to Die Provider retains ownership of Telnet communication, command execution, completion detection, response and event separation, timeout and connection failures, and single-active-command enforcement.

No Module is introduced for these direct platform operations.

### Completed Phase 1

- Reusable Discord game-command authorization using `ManageGuild`
- Focused game Provider resolver
- Stable Provider availability outcomes
- Frozen service exposing only `executeCommand`
- Deterministic tests without live Discord or Telnet access

### Completed Phase 2

- Guild-only `/game status`
- Safe ephemeral Provider-state replies
- No remote command execution

### Completed Phase 3

- Guild-only `/game time`
- Fixed `gettime` execution
- Verified `Day N, HH:MM` parsing
- Safe unavailable and malformed-result handling

### Completed Phase 4

- Guild-only `/game players`
- Fixed `listplayers` execution
- Verified player row and total parsing
- Discord output limited to display names and total count
- Private server fields excluded from Discord

### Completed Phase 5

- Guild-only `/game say message:<text>`
- Required message bounded to 1-200 characters
- Unsafe command-shaping characters and control characters rejected before Provider resolution
- Only the fixed game-chat operation is executed
- Safe success and failure acknowledgements without raw Telnet output
- Deterministic tests without live Discord or Telnet access

### Completed Phase 6

- Shared Discord-side execution wrapper for remote `/game` operations
- Stable formatting for timeout, disconnect, generic failure, malformed result, and thrown execution errors
- Deferred ephemeral replies preserved for remote operations
- Raw Telnet output, credentials, IP addresses, socket details, and internal error text excluded from Discord
- Provider and Discord ownership boundaries preserved
- Deterministic failure-path coverage

### Completed Phase 7

- Serialized guild-only `/game` definition verified through the existing loader and registry
- Fixed `ManageGuild` default permission verified
- `status`, `time`, `players`, and `say` registration verified
- Required bounded `message` option verified
- Existing `interactionCreate` dispatch verified
- Every subcommand verified against its fixed Provider operation and expected Discord response
- Deterministic integration coverage without Discord login, Telnet sockets, credentials, or a live game server

### Planned Phases

1. Completed: authorization and Provider resolution.
2. Completed: `/game status`.
3. Completed: `/game time`.
4. Completed: `/game players`.
5. Completed: `/game say`.
6. Completed: response formatting and safe failure handling.
7. Completed: final command registration and interaction coverage.
8. Next: perform live Discord-to-game verification.
9. Complete regression, documentation, version synchronization, and v1.3.0 release closure.

### Outside v1.3.0

- Arbitrary console command execution
- Hosted-player administration
- Cross-platform player identity linking
- Continuous Discord and in-game chat bridging
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
- Deterministic completion for verified commands
- Unsolicited event separation
- Timeout, disconnect, write, decision, and truncation failure handling
- Password-protected and direct-console readiness compatibility
- Live command verification against a running 7 Days to Die V3.1 test server

## v1.2.0 Release Record

- Release pull request: `#32`
- Release merge commit: `9faa79314d092ba3e8092af1e00405af6d6cc9b8`
- Annotated release tag: `v1.2.0`

## Future Direction

Future milestones may include hosted game-server player administration, continuous chat integration, Economy-backed game rewards, cross-platform identity mapping, administration interfaces, Discord role translation, expanded Ticket workflows, and persistent Website sessions.

Every future milestone must preserve the established architecture:

- Core coordinates framework infrastructure and lifecycle.
- Providers integrate external platforms and systems.
- Modules own reusable business logic.
- Shared contains proven cross-layer contracts and utilities.