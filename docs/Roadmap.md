# Rogue Soldiers Framework Roadmap

## Current Status

**Repository Version:** v1.4.0

**Latest Completed Milestone:** v1.4.0 - Hosted Player Administration

**Current Milestone:** v1.5.0 - Player Identity Linking Foundation

**Status:** Phases 1-4 and Phases 5A-5C completed; private Discord identity commands are next

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

Status: In progress; Phases 1-4 and Phases 5A-5C completed

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
- proof-gated verified-link mutation
- immutable records
- narrow persistence contracts

Core owns migration coordination and database lifecycle. Module-specific stores own durable rows and transactions.

The Discord Provider owns Discord commands, Discord identity translation, challenge generation, platform authorization, interaction handling, and private response formatting.

The 7 Days to Die Provider owns game-protocol behavior and sanitized durable-player proof evidence. It does not own Discord-to-game identity records.

Shared contains reusable identity permissions proven necessary across Module and Provider boundaries.

### Privacy and Safety Requirements

- Steam and EOS identifiers remain private operational data by default.
- Ordinary public responses must not expose platform identifiers or raw server output.
- Identity commands must use private or ephemeral Discord responses.
- The invoking Discord identity must come from the interaction, not request-controlled input.
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

#### Phase 5B - 7DTD Provider Proof Collection

Completed through pull request `#66`.

Implemented and tested:

- exact live global-chat event parsing
- temporary unsolicited-event proof collection
- exact durable-ID and challenge matching
- sanitized evidence limited to `gameUserId`, `challenge`, and `observedAt`
- safe timeout, disconnect, malformed-line, and wrong-identity behavior
- serialization with normal Provider command execution
- no player-list, display-name, or entity-ID ownership inference

#### Phase 5C - Proof-Gated Verified Link Mutation

Completed through pull request `#67`.

Implemented and tested:

- `IdentityModule.recordVerifiedSelfLink(...)`
- exact verified-proof acceptance only
- first link persisted directly as `VERIFIED`
- verification timestamp used for creation and verification
- active Discord-user and game-identity uniqueness preserved
- malformed, ambiguous, unsuccessful, and expanded proof objects rejected
- replacement and relinking excluded

### Remaining Planned Work

1. Add private Discord `/identity status` and first-link workflows through the merged Module and Provider boundaries.
2. Add explicit staff lookup, conflict resolution, replacement, and revocation workflows with narrow permissions and ephemeral output.
3. Complete registration, dispatch, privacy, malformed-input, authorization, persistence, and regression coverage.
4. Complete live Discord-to-game verification and apply only evidence-backed corrections.
5. Synchronize documentation and versions, add release notes, run final validation, and close v1.5.0.

Phase order may be narrowed when repository inspection proves a smaller safe sequence. Replacement and revocation must remain explicit and must never occur silently during ordinary self-link creation.

### Next Phase

Objective: add the smallest private Discord identity command family through the merged proof collector, evaluator, and Identity Module mutation boundary.

Required implementation and tests:

- guild-only `/identity status`
- guild-only `/identity link user-id:<Steam_...|EOS_...>`
- invoking Discord identity derived only from the interaction
- cryptographically strong challenge generation inside the Discord Provider
- private instruction to send the exact challenge through normal in-game global chat
- deferred private interaction while waiting for Provider evidence
- exact proof evaluation through `SevenDaysToDieIdentityProofEvaluator`
- durable verified-link creation only after exact proof
- safe already-linked, identity-conflict, timeout, unavailable-Provider, malformed-input, and generic-failure responses
- no Steam/EOS identifier disclosure in ordinary status, success, or failure output
- complete command-definition, registration, dispatch, and full-list regression coverage

The phase must not add replacement, unlinking, revocation, staff lookup, public identifier output, free-form Telnet, or Economy integration.

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
