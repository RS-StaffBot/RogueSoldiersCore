# Rogue Soldiers Framework Roadmap

## Current Status

**Repository Version:** v1.4.0

**Latest Completed Milestone:** v1.4.0 - Hosted Player Administration

**Current Milestone:** v1.5.0 - Player Identity Linking Foundation

**Status:** Phases 1-4, Phases 5A-5E, and resilient startup isolation completed; live end-to-end verification and release hardening are next

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

Status: In progress; Phases 1-4, Phases 5A-5E, and resilient startup isolation completed

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

#### Phase 5D - Private Discord Owner Status

Completed through pull request `#69`.

Implemented and tested:

- guild-only `/identity status`
- ephemeral owner-only responses
- authenticated Discord member identity from the interaction
- narrow Identity Module resolver
- privacy-safe unlinked, pending, and verified status formatting
- safe unavailable and malformed boundary behavior

#### Phase 5E - Private Discord Self-Link

Completed through pull request `#70`.

Implemented and tested:

- guild-only `/identity link user-id:<Steam_...|EOS_...>`
- cryptographically random short-lived challenges
- private five-minute in-game global-chat instructions
- deferred ephemeral interaction handling
- narrow proof Provider resolver
- exact sanitized proof evaluation before persistence
- first verified link creation only after exact proof
- no platform-ID repetition in ordinary Discord output
- fail-closed invalid-input, existing-link, unavailable, timeout, disconnect, malformed-proof, ambiguous-proof, and persistence-conflict behavior

#### Resilient Startup Isolation

Completed through pull request `#72`.

Implemented and tested:

- independent lifecycle handling for every registered Provider and Module
- failed components retained in `ERROR`
- failed initialization prevents startup of that component
- healthy components continue to `RUNNING`
- recoverable component failure produces `STARTED_DEGRADED`
- frozen sanitized lifecycle summaries
- healthy Modules, Providers, and Database remain active after recoverable failures
- fatal Core, Loader-wide, migration, health, and Database startup failures still propagate and roll back
- existing Providers -> Modules -> Database shutdown order remains intact
- 0 production vulnerabilities, 490 passing tests, and ESLint passing

Automatic retries, reconnect loops, independent component status, start, stop, restart, configuration-backed reload, safe replacement, restricted administration, and process supervision remain outside this phase.

### Remaining Planned Work

1. Complete live Discord-to-7DTD first-link verification and apply only evidence-backed corrections.
2. Verify restart persistence, ordinary status output, privacy boundaries, normal command recovery after proof collection, and degraded startup when an optional Provider is unavailable.
3. Synchronize versions, release notes, source-of-truth documents, and dependency records where required.
4. Run final audit, complete tests, lint, diff validation, and release checks.
5. Open and validate the v1.5.0 release pull request, then tag the release after the user merges it.

Replacement, relinking, unlinking, revocation, conflict resolution, and staff lookup remain separate explicit workflows. They are not required to close the first-link foundation unless live evidence identifies a blocking gap.

### Next Phase

Objective: complete live end-to-end verification and release hardening for the merged private identity workflow.

Required verification:

- live registration of `/identity status` and `/identity link`
- ephemeral owner-only status behavior
- private challenge instructions without repeating the submitted Steam/EOS ID
- exact 7DTD global-chat challenge correlation
- verified SQLite persistence through the Identity Module
- verified status after linking and after framework restart
- safe failure for wrong identity, timeout, unavailable Provider, and already-linked use where practical
- no raw Telnet, platform identifiers, credentials, paths, socket details, or internal errors in ordinary output or logs
- normal game-command execution after proof collection ends
- optional Provider failure leaves healthy framework components running in degraded mode
- complete automated regression coverage and final release validation

The phase must not add replacement, unlinking, revocation, staff lookup, public identifier output, free-form Telnet, Economy integration, multiple-server support, automatic retries, independent component status, start, stop, restart, configuration-backed reload, safe replacement, or restricted administration.

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
- automatic component retries or reconnect policy
- independent component status, start, stop, restart, configuration-backed reload, and safe replacement
- restricted lifecycle administration commands or process supervision

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

After v1.5.0, candidate directions include continuous chat integration, Economy-backed game rewards or purchases, administration interfaces, expanded Ticket workflows, persistent Website sessions, command queuing, multiple-server support, and a dedicated runtime lifecycle milestone covering independent component status, start, stop, restart, configuration-backed reload, safe replacement, and restricted administration.

Every future milestone must preserve the established Core, Provider, Module, Shared, privacy, fixed-command ownership, and critical-versus-recoverable startup boundaries.
