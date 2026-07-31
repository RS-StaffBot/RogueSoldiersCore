# Rogue Soldiers Framework Roadmap

## Current Status

**Repository Version:** v1.4.0

**Latest Completed Milestone:** v1.4.0 - Hosted Player Administration

**Current Milestone:** v1.5.0 - Player Identity Linking Foundation

**Status:** Phases 1-3 completed; Phase 4 is next

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

Status: In progress; Phases 1-3 completed

### Goal

Create a secure, platform-neutral identity-linking foundation that can associate Discord members with durable hosted-game identities for future player-specific workflows.

The milestone establishes identity ownership and privacy boundaries. It does not deliver Economy purchases, rewards, statistics, or broad game automation.

### Approved Architecture

The Identity Module owns:

- identity-link validation
- uniqueness and conflict rules
- authorization decisions
- verification and revocation state
- immutable public records
- narrow persistence contracts

Core owns migration coordination and database lifecycle. Module-specific stores own durable rows and transactions.

The Discord Provider owns Discord commands, Discord identity translation, platform authorization, interaction handling, and private response formatting.

The 7 Days to Die Provider owns game-protocol evidence and verified durable player identifiers. It does not own Discord-to-game identity business records.

Shared contains reusable identity permissions proven necessary across Module and Provider boundaries.

### Privacy and Safety Requirements

- Steam and EOS identifiers remain private operational data by default.
- Ordinary public responses must not expose platform identifiers or raw server output.
- Explicit staff visibility must be permission-gated, purpose-limited, and private or ephemeral.
- One durable game identity must not be linked to conflicting Discord members.
- Display names are not sufficient proof of identity.
- Fuzzy matching and automatic account merging are prohibited.
- Ambiguous ownership or verification must fail closed.
- Providers must not expose raw Telnet, socket, configuration, credential, path, IP, position, health, inventory, or internal-error details to the Module or Discord users.

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
- narrow future persistence contract

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

### Remaining Planned Phases

4. Define the verified 7 Days to Die identity-proof workflow using evidence-backed fixed operations only.
5. Add Discord member self-link and private status workflows through the Identity Module.
6. Add explicit staff lookup, conflict resolution, replacement, and revocation workflows with narrow permissions and ephemeral output.
7. Complete registration, dispatch, privacy, malformed-input, authorization, persistence, and regression coverage.
8. Complete live Discord-to-game verification and apply only evidence-backed corrections.
9. Synchronize documentation and versions, add release notes, run final validation, and close v1.5.0.

Phase order may be narrowed when repository inspection proves a smaller safe sequence. No command name or verification mechanism is final until its contract is reviewed and tested.

### Phase 4

Objective: define the smallest safe 7 Days to Die identity-proof contract before any Discord linking command becomes operational.

Required decisions and tests:

- exact fixed Provider operation used to obtain proof evidence
- exact sanitized evidence fields allowed across the Provider boundary
- deterministic matching rules for one durable game identity
- behavior for missing, ambiguous, malformed, stale, or conflicting evidence
- how the requesting Discord member participates in the proof without trusting display names alone
- whether proof requires a short-lived challenge, an in-game action, or another evidence-backed operation
- retention and disposal rules for temporary proof evidence
- privacy-safe failure types and messages
- single-active-command and timeout behavior during proof collection

Required repository review:

- current 7 Days to Die command execution and completion contracts
- player-list and durable-ID parsing behavior
- unsolicited event separation
- fixed-command authorization boundaries
- Provider resolver injection
- raw-output sanitization and privacy-safe formatting
- Identity Module store and status contracts from Phases 1-3

Phase 4 must end with focused automated contract tests. It must not add a partially verified self-link command, expose raw Telnet output, or trust display-name matching.

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

### Goal

Provide a narrow Discord interface for administering individual players on the hosted 7 Days to Die server while preserving the existing Provider boundary and preventing arbitrary console access.

### Implemented Command Family

- `/game kick entity-id:<id> reason:<text>`
- `/game ban user-id:<Steam_...|EOS_...> duration:<number> unit:<choice> reason:<text> display-name:<text>`
- `/game unban display-name:<exact text>`
- `/game whitelist add user-id:<Steam_...|EOS_...> display-name:<text>`
- `/game whitelist remove user-id:<Steam_...|EOS_...> display-name:<text>`

### Completed Phases

1. Captured live kick evidence and approved the fixed online kick contract.
2. Added deterministic kick completion, validation, privacy-safe formatting, registration, and dispatch.
3. Captured ban and unban evidence and added fixed ban plus verified unban workflows.
4. Captured individual whitelist evidence and added deterministic completion, validation, formatting, registration, and dispatch.
5. Completed live Discord-to-game whitelist verification and final release synchronization.

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
