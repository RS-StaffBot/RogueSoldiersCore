# Project Status

## Current Version

v1.6.0

## Latest Completed Milestone

v1.6.0 - Component Resilience and Runtime Lifecycle

Status: Completed, merged, live verified, and tagged.

Release record:

- Implementation pull requests: `#77` through `#84`
- Release pull request: `#85`
- Release merge commit: `2519014b7b1a80bc8e12d45787c644da91c21d8a`
- Annotated tag: `v1.6.0`
- Release validation: GitHub Actions passed
- Release notes: `docs/Release-Notes-v1.6.0.md`

## Current Milestone

v1.7.0 - Audit and Activity Foundation

Status: Active; milestone architecture and phase plan approved.

## Milestone Goal

Create a durable, privacy-safe, actor-attributed record of meaningful RSF staff, infrastructure, moderation, Economy, Ticket, identity, and hosted-game actions.

The milestone must distinguish three separate responsibilities:

1. Runtime logs describe operational health and failures.
2. The Audit Module stores durable cross-feature accountability records.
3. Existing Module-owned histories remain authoritative for detailed business state.

The audit foundation must support future Discord and Website staff lookup without exposing database rows, raw errors, credentials, addresses, configuration, socket details, private console output, or unrelated user data.

## Approved Ownership

### Audit Module

The Audit Module owns:

- immutable audit record validation
- stable action identifiers
- actor, source, target, outcome, and timestamp rules
- privacy-safe metadata validation
- recording and bounded query operations
- Module-specific store contracts
- retention-policy enforcement when implemented

### Core

Core owns:

- the SQLite connection
- ordered database migrations
- Audit Module construction and lifecycle loading
- injection of the private Audit store

Core does not own audit business rules and the EventBus is not an authoritative audit store.

### Providers and Other Modules

Providers and Modules may receive only narrow audit recording or query services required for an approved workflow.

They must not receive the Audit store, SQLite connection, SQL, database rows, or mutable Audit Module internals.

The source boundary that authenticates an actor is responsible for supplying that verified actor context. For example, Discord supplies the authenticated Discord user for a Discord lifecycle command.

## Authoritative History Boundary

The framework-wide audit record does not replace existing business histories.

- Moderation records remain authoritative for moderation case detail.
- Economy transactions remain authoritative for balances and financial history.
- Ticket records and messages remain authoritative for support history.
- Identity records remain authoritative for verified identity links.
- Lifecycle status remains authoritative for current component state.

Audit records provide a durable accountability summary that may reference the owning business record through a safe stable identifier.

## Initial Audit Record Facts

The first implementation may contain only validated, privacy-safe facts such as:

- audit record ID
- action identifier
- actor type and stable actor identifier
- source interface
- target type and safe target identifier
- sanitized outcome
- optional owning business-record reference
- bounded allowlisted metadata
- RSF-generated timestamp

Raw request payloads, arbitrary objects, secrets, IP addresses, credentials, configuration, sockets, stack traces, database handles, game-console output, and unrestricted metadata are prohibited.

## Phase Plan

### Phase 1 - Audit Contracts and In-Memory Foundation

Create the immutable audit record, validated action taxonomy, narrow recording/query contract, and in-memory store for focused testing.

This phase does not add SQLite, Discord commands, or production workflow integration.

### Phase 2 - SQLite Audit Persistence

Add the ordered audit migration and SQLite store while preserving the same Module-owned contract and defensive public records.

### Phase 3 - Audit Service Boundaries and Query Policy

Expose frozen narrow recording and bounded-query services. Define deterministic ordering, pagination, filtering, and privacy-safe failure behavior.

### Phase 4 - Lifecycle Administration Audit Integration

Record authorized `/lifecycle restart` and `/lifecycle reload` attempts and outcomes, including denied, busy, failed, and successful operations where the interaction reaches an auditable authorization or execution decision.

### Phase 5 - Existing Privileged Workflow Integration

Integrate meaningful existing workflows without duplicating their business histories. Candidate areas include Discord moderation, hosted-player administration, Ticket staff actions, Economy staff mutations, and Identity administration only where an implemented privileged workflow exists.

Each integration remains a separate focused pull request.

### Phase 6 - Restricted Discord Audit Lookup

Add a private permission-gated staff command for bounded recent audit lookup using allowlisted filters and sanitized presentation.

### Phase 7 - Live Verification and Release Hardening

Verify durable recovery, actor attribution, privacy boundaries, authorization, bounded queries, existing workflow compatibility, dependency audit, tests, lint, diff checks, version synchronization, and release documentation.

## Required Safety Boundaries

- Audit writes must be validated before persistence.
- Audit records must be immutable and defensive.
- Timestamps and record identities must be generated by RSF, not trusted from interaction input.
- Arbitrary metadata keys and unrestricted serialized objects are prohibited.
- Ordinary users must not receive audit lookup access.
- Staff lookup must be private and permission-gated.
- Platform identifiers may appear only when explicitly required by an approved staff workflow and must remain purpose-limited.
- Audit lookup must not expose raw errors, stack traces, credentials, IP addresses, sockets, configuration, database rows, SQL, game-console output, positions, health, inventory, or unrelated identifiers.
- A business operation must not report success before its authoritative business store commits.
- Audit failure policy must be defined explicitly per workflow before integration; it must never silently fabricate success.
- The EventBus remains non-durable and must not be used as the authoritative audit path.

## Explicit Exclusions

v1.7.0 does not include:

- a general event-sourcing system
- replacement of Economy, Moderation, Ticket, or Identity histories
- arbitrary user activity surveillance
- logging every read-only command
- raw Discord message retention
- raw game-console retention
- Website audit administration
- configurable retention administration
- external log aggregation
- multiple databases, replication, or clustering
- Identity Hub implementation
- Linux or Docker deployment hardening
- Economy-backed game purchases
- continuous Discord and game chat bridging

## Next Step

Implement Phase 1 as a focused Audit Module contract and in-memory foundation after the milestone activation pull request is reviewed, validated, and merged.
