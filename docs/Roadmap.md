# Rogue Soldiers Framework Roadmap

## Current Status

**Repository Version:** v1.4.0

**Current Milestone:** v1.4.0 - Hosted Player Administration

**Status:** Release candidate; implementation and live verification complete

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
- v1.3.0 - Discord Game Server Command Interface

## v1.4.0 - Hosted Player Administration

### Goal

Provide a narrow Discord interface for administering individual players on the hosted 7 Days to Die server while preserving the existing Provider boundary and preventing arbitrary console access.

### Implemented Command Family

- `/game kick entity-id:<id> reason:<text>`
- `/game ban user-id:<Steam_...|EOS_...> duration:<number> unit:<choice> reason:<text> display-name:<text>`
- `/game unban display-name:<exact text>`
- `/game whitelist add user-id:<Steam_...|EOS_...> display-name:<text>`
- `/game whitelist remove user-id:<Steam_...|EOS_...> display-name:<text>`

### Architecture Boundary

The Discord Provider owns command definitions, authorization, validation, interactions, reply deferral, safe result parsing, and user-facing wording.

The 7 Days to Die Provider owns Telnet communication, command execution, completion detection, event separation, timeout and connection failures, and single-active-command enforcement.

No arbitrary console entry is exposed. Discord commands resolve only the frozen `executeCommand` boundary. Direct platform administration does not introduce a Module unless reusable cross-platform policy is later proven.

### Completed Phases

1. Captured live kick evidence, online identifiers, success and invalid-target output, restart behavior, and cleanup noise.
2. Approved online entity ID resolution and `kick <entity id> "<reason>"`.
3. Added deterministic Provider completion for kick success and invalid-target rejection.
4. Added reusable Discord-side entity-ID and reason validation plus privacy-safe kick result formatting.
5. Added `/game kick` through the existing authorization, Provider resolution, remote execution, validation, and formatting boundaries.
6. Captured exact ban and unban evidence, added deterministic Provider completion for `ban add`, and added `/game ban` through the approved fixed contract.
7. Added deterministic `ban remove` completion and `/game unban` through exact active-ban lookup, exact stored-UserID removal, and required post-removal `ban list` verification.
8. Added deterministic Provider completion for individual whitelist add, successful remove, and missing remove terminal lines.
9. Added Discord-side durable-ID and display-name validation plus privacy-safe whitelist formatting.
10. Registered and dispatched `/game whitelist add` and `/game whitelist remove` with complete command-definition and interaction regression coverage.
11. Completed live Discord-to-game verification for whitelist add, duplicate add, remove, missing remove, and final clean state.
12. Synchronized versions and source-of-truth documentation and added v1.4.0 release notes.

### Verified Hosted Player Contracts

Kick:

```text
kick <online entity id> "<validated reason>"
```

Ban:

```text
ban add <durable user id> <duration> <unit> "<reason>" "<display name>"
```

Verified unban:

```text
ban list
ban remove <exact stored UserID>
ban list
```

Whitelist add and remove:

```text
whitelist add <Steam_...|EOS_...> <display name>
whitelist remove <Steam_...|EOS_...>
```

### Live Verification Record

Live verification against 7 Days to Die V3.1.0 b13 confirmed:

- Discord connected and registered 13 commands
- the 7 Days to Die Provider reported `RUNNING`
- whitelist add executed through private Telnet
- duplicate add left one whitelist row
- final removal disabled whitelist-only mode
- repeated removal produced a safe private not-whitelisted response
- ordinary Discord responses did not expose identifiers, IP addresses, paths, or raw console output

### Safety and Privacy Requirements

- Administrative actions remain guild-only and require `ManageGuild`.
- Targets are exact and must not be guessed.
- Fixed operations reject malformed or command-shaping input before Provider execution.
- Ordinary Discord responses do not receive raw Telnet output, credentials, IP addresses, positions, health values, socket details, platform identifiers, configuration paths, or internal errors.
- An explicit authorized staff workflow may privately display requested Steam or EOS identifiers when operationally necessary.
- Raw Telnet remains on loopback, LAN, VPN, or another protected path.

### Outside v1.4.0

- Arbitrary console execution
- Free-form Telnet input
- Cross-platform identity linking
- Automatic fuzzy matching
- Continuous chat bridging
- Economy-backed game effects
- Command queues or simultaneous commands
- Multiple game servers
- Automatic process supervision
- Public Telnet exposure

### Release Closing

The release pull request must pass:

- production dependency audit
- complete Node test suite
- ESLint validation
- `git diff --check`

The annotated `v1.4.0` tag must be created only after the release pull request merges.

## v1.3.0 - Discord Game Server Command Interface

Status: Completed and tagged

### Release Record

- Release pull request: `#43`
- Release merge commit: `71e476641bb5026dfa4d41dbd88131db2326800b`
- Annotated tag: `v1.3.0`

## Future Direction

After v1.4.0, candidate directions include continuous chat integration, Economy-backed game rewards, cross-platform identity mapping, administration interfaces, Discord role translation, expanded Ticket workflows, and persistent Website sessions.

Every future milestone must preserve the established Core, Provider, Module, and Shared ownership boundaries.
