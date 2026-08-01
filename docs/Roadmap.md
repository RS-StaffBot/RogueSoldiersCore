# Rogue Soldiers Framework Roadmap

## Current Status

**Repository Version:** v1.5.0

**Latest Completed Milestone:** v1.4.0 - Hosted Player Administration

**Current Milestone:** v1.5.0 - Player Identity Linking Foundation

**Status:** Release closeout in progress; implementation and required live verification are complete

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

Status: Release closeout in progress; implementation and required live verification are complete

### Goal

Create a secure, platform-neutral identity-linking foundation that can associate Discord members with durable hosted-game identities for future player-specific workflows.

The milestone establishes identity ownership and privacy boundaries. It does not deliver Economy purchases, rewards, statistics, broad account attachment, or broad game automation.

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

Automatic retries, reconnect loops, independent component status, start, stop, restart, configuration-backed reload, safe replacement, restricted administration, and process supervision remain outside this phase.

#### Release-Hardening Corrections

Completed through pull requests `#74` and `#75`.

Implemented and tested:

- recoverable lifecycle logs omit raw exceptions, stack traces, local paths, sockets, credentials, and configuration details
- exact active challenge from a different Steam/EOS identifier fails closed immediately
- mismatch collection clears its timer and removes temporary listeners
- no automatic Steam/EOS association is inferred

### Release Verification

Required live verification completed:

- private `/identity status`
- private `/identity link` challenge instructions
- exact Steam identity and challenge correlation through 7 Days to Die global chat
- verified SQLite persistence
- verified status after framework restart
- already-linked rejection without another challenge
- normal `/game status` and `/game time` after proof collection
- degraded startup with the optional 7 Days to Die Provider unavailable
- privacy-safe recoverable lifecycle logging

### Release Closeout

Remaining release steps:

1. Complete focused source-of-truth documentation synchronization.
2. Run the production dependency audit, complete test suite, ESLint, and `git diff --check`.
3. Open and validate the v1.5.0 release pull request.
4. Create the annotated `v1.5.0` tag only after the user merges the release pull request.

Replacement, relinking, unlinking, revocation, conflict resolution, staff lookup, broad platform attachments, and identity merging remain separate future workflows.

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

## Approved Follow-Up Milestone Options

After v1.5.0, two major follow-up milestones are approved candidates. Their version numbers and order remain undecided until operational priority is selected.

### Component Resilience and Runtime Lifecycle

Choose this direction first when the priority is:

- restarting failed Providers without restarting RSF
- reconnect policy
- configuration-backed reload
- safe component replacement
- restricted lifecycle administration
- reducing Provider observation downtime

### RSF Identity Hub and Platform Attachments

Choose this direction first when the priority is:

- establishing an RSF-owned permanent identity
- attaching Discord, Steam, EOS, hosted-game, and future platform accounts
- defining exact match, attachment, merge-candidate, conflict, observation, and privacy contracts
- supporting game-first unclaimed identities
- preserving identity, moderation, alias, and activity history across hosted servers and games
- preparing compatibility and migration boundaries before broader Economy and cross-game systems depend on the narrow v1.5 link model

The Identity Hub contract and persistence phases do not depend on Runtime Lifecycle. Observation ingestion must tolerate Provider downtime, record its source and timestamp, remain idempotent, avoid duplicate identities, and fail closed on conflicts.

Automatic identity merge is not approved for the first Identity Hub implementation. Deterministic evidence may allow direct attachment or create a merge candidate. General merge execution requires a separate transactional and audited design.

Whichever milestone is not selected first should follow before broad Economy purchases, automated game rewards, or cross-game moderation depend on these capabilities.

## Future Direction

Other candidate directions include continuous chat integration, Economy-backed game rewards or purchases, administration interfaces, expanded Ticket workflows, persistent Website sessions, command queuing, and multiple-server support.

Every future milestone must preserve the established Core, Provider, Module, Shared, privacy, fixed-command ownership, and critical-versus-recoverable startup boundaries.
