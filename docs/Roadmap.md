# Rogue Soldiers Framework Roadmap

## Current Status

**Repository Version:** v1.4.0

**Latest Completed Milestone:** v1.4.0 - Hosted Player Administration

**Current Milestone:** v1.5.0 - Player Identity Linking Foundation

**Status:** Phases 1-4 and Phase 5A completed; Provider proof collection is next

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
- v1.4.0 - Hosted Player Administration

## v1.5.0 - Player Identity Linking Foundation

Status: In progress; Phases 1-4 and Phase 5A completed

### Goal

Create a secure, platform-neutral identity-linking foundation that can associate Discord members with durable hosted-game identities for future player-specific workflows.

The milestone establishes identity ownership and privacy boundaries. It does not deliver Economy purchases, rewards, statistics, or broad game automation.

### Approved Architecture

The Identity Module owns:

- identity-link validation
- uniqueness and conflict rules
- authorization decisions
- verification and revocation state
- private owner status
- immutable records
- narrow persistence contracts

Core owns migration coordination and database lifecycle. Module-specific stores own durable rows and transactions.

The Discord Provider owns Discord commands, Discord identity translation, platform authorization, interaction handling, and private response formatting.

The 7 Days to Die Provider owns game-protocol evidence and sanitized durable-player proof evidence. It does not own Discord-to-game identity records.

Shared contains reusable identity permissions proven necessary across Module and Provider boundaries.

### Privacy and Safety Requirements

- Steam and EOS identifiers remain private operational data by default.
- Ordinary public responses must not expose platform identifiers or raw server output.
- Explicit staff visibility must be permission-gated, purpose-limited, and private or ephemeral.
- One durable game identity must not be linked to conflicting Discord members.
- Display names and online entity IDs are not sufficient proof of identity.
- Fuzzy matching and automatic account merging are prohibited.
- Ambiguous ownership or verification must fail closed.
- Providers must not expose raw Telnet, socket, configuration, credential, path, IP, position, health, inventory, or internal-error details.

### Completed Phases

#### Phase 1 - Identity Domain Contract

Completed through pull request `#59`.

Implemented and tested:

- canonical fields `discordUserId` and `gameUserId`
- supported durable IDs `Steam_...` and `EOS_...`
- one active link per Discord member
- one active owner per game identity
- pending, verified, and revoked states
- atomic revoke-and-pend replacement semantics
- private-by-default identifier visibility
- reusable identity permissions
- narrow persistence contract

#### Phase 2 - Immutable Records and In-Memory Store

Completed through pull request `#60`.

Implemented and tested:

- frozen status and error contracts
- immutable validated records
- defensive in-memory storage
- active identity uniqueness
- stale-state detection
- atomic replacement and rollback

#### Phase 3 - SQLite Persistence

Completed through pull request `#61`.

Implemented and tested:

- migration `006_create_identity_links`
- SQLite identity-link store
- partial unique indexes for active identities
- transactional replacement and rollback
- restart recovery
- synchronized global migration ordering

#### Phase 4 - Fail-Closed 7DTD Proof Contract

Completed through pull request `#63`.

Implemented and tested:

- short-lived in-game challenge requirement
- one exact durable Steam/EOS and challenge match
- allowed evidence fields `gameUserId`, `challenge`, and `observedAt`
- five-minute evidence lifetime
- immediate temporary-evidence disposal requirement
- fail-closed handling for missing, stale, malformed, future, and ambiguous evidence
- explicit rejection of display-name and entity-ID matching as proof

The current `listplayers` and `listplayerids` evidence is insufficient because it does not bind a durable identifier to an ownership action.

#### Phase 5A - Identity Module and Private Owner Status

Completed through pull request `#64`.

Implemented and tested:

- framework-loaded `Identity` Module
- in-memory direct-construction store
- SQLite store injection through `ModuleLoader`
- durable-state validation during initialization
- frozen private owner-status results
- approved status and timestamp fields only
- no Discord, Steam, or EOS identifiers in ordinary owner status

### Remaining Planned Work

1. Add an evidence-backed 7 Days to Die Provider proof-collection prerequisite.
2. Add a private Discord owner-status command through the Identity Module.
3. Add self-link creation and verification only after the Provider proof path is operational.
4. Add explicit staff lookup, conflict resolution, replacement, and revocation workflows with narrow permissions and ephemeral output.
5. Complete registration, dispatch, privacy, malformed-input, authorization, persistence, and regression coverage.
6. Complete live Discord-to-game verification and apply only evidence-backed corrections.
7. Synchronize documentation and versions, add release notes, run final validation, and close v1.5.0.

Phase order may be narrowed when repository inspection proves a smaller safe sequence. No self-link command may create a pending or verified record without the merged proof contract and an operational evidence collector.

### Next Phase

Objective: define and test the smallest safe 7 Days to Die proof-collection boundary.

Required decisions and tests:

- exact fixed Provider operation or event shape used to obtain proof evidence
- exact durable Steam/EOS identifier and short-lived challenge observed together
- deterministic completion or event-correlation rules
- sanitized output limited to `gameUserId`, `challenge`, and `observedAt`
- rejection of unrelated chat, display names, entity IDs, duplicate matches, malformed lines, stale evidence, and raw output
- retention and disposal of temporary evidence
- single-active-command and timeout behavior
- unavailable, disconnected, and malformed Provider outcomes

The phase must end with focused automated tests. It must not add a partially verifiable self-link command, expose raw Telnet output, or trust display-name matching.

### Outside v1.5.0

- Economy purchases or automatic reward delivery
- Continuous Discord and in-game chat bridging
- General player statistics or telemetry
- Multiple game servers
- Arbitrary console execution or free-form Telnet
- Public identifier lookup
- Automatic account merging or fuzzy matching
- Generic identity support for unimplemented platforms
- Website identity administration unless explicitly approved during the milestone

## v1.4.0 - Hosted Player Administration

Status: Completed and tagged

### Implemented Command Family

- `/game kick entity-id:<id> reason:<text>`
- `/game ban user-id:<Steam_...|EOS_...> duration:<number> unit:<choice> reason:<text> display-name:<text>`
- `/game unban display-name:<exact text>`
- `/game whitelist add user-id:<Steam_...|EOS_...> display-name:<text>`
- `/game whitelist remove user-id:<Steam_...|EOS_...> display-name:<text>`

### Release Record

- Release pull request: `#56`
- Release merge commit: `8d9b7c9b50bdff7cab612e3905da7606c13f27e9`
- Annotated tag: `v1.4.0`
- Final validation: 0 production vulnerabilities, 435 passing tests, ESLint passing, and `git diff --check` clean

## v1.3.0 - Discord Game Server Command Interface

Status: Completed and tagged

### Release Record

- Release pull request: `#43`
- Release merge commit: `71e476641bb5026dfa4d41dbd88131db2326800b`
- Annotated tag: `v1.3.0`

## Future Direction

After v1.5.0, candidate directions include continuous chat integration, Economy-backed game rewards or purchases, administration interfaces, expanded Ticket workflows, persistent Website sessions, command queuing, and multiple-server support.

Every future milestone must preserve the established Core, Provider, Module, Shared, privacy, and fixed-command ownership boundaries.
