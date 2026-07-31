# Rogue Soldiers Framework Roadmap

## Current Status

**Repository Version:** v1.3.0

**Current Milestone:** v1.4.0 - Hosted Player Administration

**Status:** In progress; Phase 10 is in progress

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

### Intended Command Family

- `/game kick`
- `/game ban`
- `/game unban`
- `/game whitelist add`
- `/game whitelist remove`

Exact Discord options and server command forms require live evidence before exposure.

### Architecture Boundary

The Discord Provider owns command definitions, authorization, validation, interactions, reply deferral, safe result parsing, and user-facing wording.

The 7 Days to Die Provider owns fixed command construction, Telnet communication, execution, completion detection, event separation, timeout and connection failures, and single-active-command enforcement.

No arbitrary console entry is exposed. Discord commands resolve only the frozen `executeCommand` boundary. Direct platform administration does not introduce a Module unless reusable cross-platform policy is later proven.

### Completed Phases

1. Captured live kick evidence, online identifiers, success and invalid-target output, restart behavior, and cleanup noise.
2. Approved online entity ID resolution and `kick <entity id> "<reason>"`.
3. Added deterministic Provider completion for kick success and invalid-target rejection.
4. Added reusable Discord-side entity-ID and reason validation plus privacy-safe kick result formatting.
5. Added `/game kick entity-id:<id> reason:<text>` through the existing authorization, Provider resolution, remote execution, validation, and formatting boundaries.
6. Captured exact ban and unban evidence, added deterministic Provider completion for `ban add`, and added `/game ban` through the approved fixed contract.
7. Added deterministic `ban remove` completion and `/game unban display-name:<exact text>` through exact active-ban lookup, exact stored-UserID removal, and required post-removal `ban list` verification.
8. Added deterministic Provider completion for evidence-backed individual whitelist add, successful remove, and missing remove terminal lines.
9. Added Discord-side durable-ID and display-name validation coverage plus privacy-safe whitelist add, remove, missing-entry, malformed-result, and raw-output formatting.

Phase 7 verifies:

- exact case-sensitive display-name matching against the active `ban list`
- exactly one matching active row before removal
- removal by the exact stored UserID returned by the server
- a second `ban list` proving that stored UserID is absent
- the success-looking removal line is command completion only
- malformed, missing, ambiguous, failed-removal, and failed-verification outcomes fail safely
- ordinary Discord responses do not expose stored platform identifiers or raw Telnet output
- registration and dispatch remain inside the existing `/game` command

Phase 8 evidence verifies:

- combined durable identifiers such as `Steam_<id>` and `EOS_<id>` are one command argument
- `whitelist add <durable user id> <display name>`
- `whitelist remove <durable user id>`
- add success on `<stored user id> added to whitelist.`
- remove success on `<stored user id> removed from the whitelist.`
- missing removal on `<stored user id> was not on the whitelist.`
- first-entry activation and final-entry deactivation are separate mode lines
- final-entry deactivation appears before the removal-success line
- duplicate add does not create a duplicate row
- entries persist across a normal server restart
- reload, local path, login, authentication, performance, entity, inventory, disconnect, and stack-trace output are unrelated noise

### Current Phase

10. Register and dispatch `/game whitelist add` and `/game whitelist remove` through the existing authorization, Provider resolution, remote execution, validation, and formatting boundaries.

Phase 10 requires:

- one nested `whitelist` subcommand group under the existing guild-only `/game` command
- required durable `user-id` and bounded `display-name` options for add and remove
- all validation before Provider resolution
- fixed execution of only `whitelist add <durable user id> <display name>` and `whitelist remove <durable user id>`
- ephemeral deferred responses
- safe timeout, disconnect, malformed-result, not-whitelisted, and success handling
- no platform identifiers, IP addresses, configuration paths, or raw server output in ordinary Discord results
- complete command-definition and interaction-dispatch regression coverage

The remove display name is used only to produce a useful private staff result. It is not included in the server remove command.

### Remaining Phases

11. Complete live Discord-to-game verification for whitelist add and remove and apply only evidence-backed corrections.
12. Synchronize documentation and versions, add release notes, run final regression, and close v1.4.0.

### Verified Kick Contract

Online discovery:

```text
id=<entity id>, <player name>
Total of <count> in the game
```

Discord operation:

```text
/game kick entity-id:<online entity id> reason:<validated reason>
```

Provider execution:

```text
kick <online entity id> "<validated reason>"
```

Success:

```text
Kicking Player <name>: <reason>
```

Offline or invalid target:

```text
"<target>" is not a valid entity id, player name or user id.
```

### Verified Ban Contract

Discord operation:

```text
/game ban user-id:<Steam_...|EOS_...> duration:<number> unit:<choice> reason:<text> display-name:<text>
```

Provider execution:

```text
ban add <durable user id> <duration> <unit> "<reason>" "<display name>"
```

Success:

```text
<stored user id> banned until YYYY-MM-DD HH:MM:SS, reason: <reason>.
```

The stored identifier may remain Steam-backed or normalize to EOS. Ordinary Discord responses never receive the raw stored identifier.

### Verified Unban Contract

Discord operation:

```text
/game unban display-name:<exact text>
```

Provider execution sequence:

```text
ban list
ban remove <exact stored UserID>
ban list
```

Success requires the second `ban list` to prove that the exact stored UserID is absent.

### Verified Individual Whitelist Contract

Discord add:

```text
/game whitelist add user-id:<Steam_...|EOS_...> display-name:<text>
```

Discord remove:

```text
/game whitelist remove user-id:<Steam_...|EOS_...> display-name:<text>
```

Provider add:

```text
whitelist add <Steam_...|EOS_...> <display name>
```

Provider remove:

```text
whitelist remove <Steam_...|EOS_...>
```

Add completion:

```text
<stored user id> added to whitelist.
```

Remove completion:

```text
<stored user id> removed from the whitelist.
```

Missing remove completion:

```text
<stored user id> was not on the whitelist.
```

Ordinary Discord results use the validated display name and do not echo the durable platform identifier.

### Safety and Privacy Requirements

- Administrative actions remain guild-only and permission-gated.
- Targets must be exact and unambiguous.
- Ambiguous names must not be guessed.
- Fixed operations reject command-shaping characters and malformed identifiers before Provider execution.
- Discord must not receive raw Telnet output, credentials, IP addresses, positions, health values, socket details, platform identifiers, or internal errors through ordinary responses.
- Platform identifiers may be stored internally when durable administration requires them.
- An explicitly authorized staff lookup or administration workflow may display requested Steam or EOS identifiers when operationally necessary, permission-gated, purpose-limited, and private or ephemeral.
- Timeout, disconnect, not-found, already-banned, not-banned, already-whitelisted, not-whitelisted, invalid-target, and server rejection outcomes fail safely.
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

## v1.3.0 - Discord Game Server Command Interface

Status: Completed and tagged

### Implemented Commands

- `/game status`
- `/game time`
- `/game players`
- `/game say <message>`

### Completed Work

1. Reusable `ManageGuild` authorization and narrow Provider resolution.
2. Guild-only status without remote execution.
3. Fixed `gettime` execution.
4. Privacy-safe `listplayers` execution.
5. Fixed quoted `say` execution.
6. Shared safe remote-command failure formatting.
7. Registration and interaction coverage.
8. Live Discord-to-game verification.
9. Regression, documentation, version synchronization, release notes, merge, and release tagging.

### Release Record

- Release pull request: `#43`
- Release merge commit: `71e476641bb5026dfa4d41dbd88131db2326800b`
- Annotated tag: `v1.3.0`

## Future Direction

After v1.4.0, candidate directions include continuous chat integration, Economy-backed game rewards, cross-platform identity mapping, administration interfaces, Discord role translation, expanded Ticket workflows, and persistent Website sessions.

Every future milestone must preserve the established Core, Provider, Module, and Shared ownership boundaries.
