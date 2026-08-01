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

Status: Active; Audit Phases 1 through 5 are completed and merged. Phase 6 has not started.

## Completed Implementation Checkpoint

This checkpoint records completed v1.7.0 work through merged pull request `#96`:

- Milestone activation and architecture approval: `#86`
- Phase 1 - Audit contracts and in-memory foundation: `#87`
- Phase 2 - SQLite Audit persistence: `#88`
- Phase 3 - narrow Audit recording and query services: `#89`
- Phase 4 - lifecycle administration Audit integration: `#90`
- Phase 5A - Discord `/ban` and `/kick` Audit integration: `#91`
- Phase 5B - hosted-player administration Audit integration: `#92`
- Phase 5C - remaining Discord moderation Audit integration: `#95`
- Phase 5D - Ticket staff mutation Audit integration: `#96`

Recent merge checkpoints:

- PR `#95` merge commit: `c91f87adcc8eee7a08e0a20f91fa99416f7c6e9e`
- PR `#96` merge commit: `2dcfac2ef8fc10b92925b389aac5d35e48abb686`

The framework now loads a platform-neutral Audit Module with immutable validated records, in-memory and SQLite stores, narrow recording and bounded-query services, durable restart recovery, and completed Phase 5 integration for lifecycle administration, Discord moderation, hosted-player administration, and privileged Ticket staff mutations.

Phase 5 status: Completed

Next implementation phase: Phase 6 - Restricted Discord Audit Lookup

Phase 6 has not started and is not implemented by this checkpoint.

## Milestone Goal

Create a durable, privacy-safe, actor-attributed record of meaningful RSF staff, infrastructure, moderation, Economy, Ticket, identity, and hosted-game actions.

The milestone distinguishes three separate responsibilities:

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

The source boundary that authenticates an actor is responsible for supplying that verified actor context. Discord supplies the authenticated Discord user for lifecycle, moderation, and hosted-player administration Audit records.

## Authoritative History Boundary

The framework-wide audit record does not replace existing business histories.

- Moderation records remain authoritative for moderation case detail.
- Economy transactions remain authoritative for balances and financial history.
- Ticket records and messages remain authoritative for support history.
- Identity records remain authoritative for verified identity links.
- Lifecycle status remains authoritative for current component state.

Audit records provide a durable accountability summary that may reference the owning business record through a safe stable identifier.

## Implemented Audit Foundation

The merged foundation provides:

- immutable defensive `AuditRecord` snapshots
- RSF-generated sequential Audit record IDs and timestamps
- fixed actor, source, outcome, action, target, and metadata validation
- bounded allowlisted metadata fields
- matching in-memory and SQLite Audit stores
- ordered migration `007_create_audit_records`
- deterministic newest-first bounded pagination
- allowlisted query filters and opaque continuation cursors
- frozen narrow recording and query service boundaries
- normalized privacy-safe service failures
- durable restart recovery

Implemented workflow integrations through PR `#96` provide:

- lifecycle administration through `/lifecycle restart` and `/lifecycle reload`
- Discord moderation through `/ban`, `/kick`, `/warn`, `/timeout`, `/untimeout`, and `/purge`
- hosted-player administration through `/game kick`, `/game ban`, `/game unban`, `/game whitelist add`, and `/game whitelist remove`
- Ticket staff mutations through `/ticket staff message`, `/ticket staff assign`, `/ticket staff unassign`, and `/ticket staff close`
- authenticated Discord actor attribution
- fixed actions, target categories, outcomes, and bounded statuses
- success only after the authoritative owning workflow commits or completes successfully
- best-effort, non-blocking Audit writes that do not change an already determined business or Provider result

Existing Module and Provider-owned records remain authoritative. Audit records are bounded accountability summaries and do not replace Moderation history, Ticket records and messages, hosted-game command results, Identity links, Economy transactions, or lifecycle state.

Audit records do not contain moderation reasons, Ticket message content, raw console output, raw Discord responses, credentials, addresses, configuration, sockets, SQL, database rows, stack traces, or arbitrary objects.

## Phase Plan

### Phase 1 - Audit Contracts and In-Memory Foundation

Status: Completed and merged in PR `#87`.

### Phase 2 - SQLite Audit Persistence

Status: Completed and merged in PR `#88`.

### Phase 3 - Audit Service Boundaries and Query Policy

Status: Completed and merged in PR `#89`.

### Phase 4 - Lifecycle Administration Audit Integration

Status: Completed and merged in PR `#90`.

### Phase 5 - Existing Privileged Workflow Integration

Status: Completed.

Completed integrations:

- lifecycle `/lifecycle restart` and `/lifecycle reload` in PR `#90`
- Discord `/ban` and `/kick` in PR `#91`
- hosted-player `/game kick`, `/game ban`, `/game unban`, `/game whitelist add`, and `/game whitelist remove` in PR `#92`
- Discord `/warn`, `/timeout`, `/untimeout`, and `/purge` in PR `#95`
- Ticket staff `/ticket staff message`, `/ticket staff assign`, `/ticket staff unassign`, and `/ticket staff close` in PR `#96`

The integrated workflows preserve their existing authoritative business records and Provider results. Audit recording is privacy-safe, bounded, best effort, and non-blocking after the owning workflow determines its result.

### Phase 6 - Restricted Discord Audit Lookup

Add a private permission-gated staff command for bounded recent Audit lookup using allowlisted filters and sanitized presentation.

### Phase 7 - Live Verification and Release Hardening

Verify durable recovery, actor attribution, privacy boundaries, authorization, bounded queries, existing workflow compatibility, dependency audit, tests, lint, diff checks, version synchronization, and release documentation.

## Required Safety Boundaries

- Audit writes must be validated before persistence.
- Audit records must be immutable and defensive.
- Timestamps and record identities must be generated by RSF, not trusted from interaction input.
- Arbitrary metadata keys and unrestricted serialized objects are prohibited.
- Ordinary users must not receive Audit lookup access.
- Staff lookup must be private and permission-gated.
- Platform identifiers may appear only when explicitly required by an approved staff workflow and must remain purpose-limited.
- Audit lookup must not expose raw errors, stack traces, credentials, IP addresses, sockets, configuration, database rows, SQL, game-console output, positions, health, inventory, or unrelated identifiers.
- A business operation must not report success before its authoritative business store commits.
- Audit failure policy must be defined explicitly per workflow before integration; it must never silently fabricate success.
- The EventBus remains non-durable and must not be used as the authoritative Audit path.

## Explicit Exclusions

v1.7.0 does not include:

- a general event-sourcing system
- replacement of Economy, Moderation, Ticket, or Identity histories
- arbitrary user activity surveillance
- logging every read-only command
- raw Discord message retention
- raw game-console retention
- Website Audit administration
- configurable retention administration
- external log aggregation
- multiple databases, replication, or clustering
- Identity Hub implementation
- Linux or Docker deployment hardening
- Economy-backed game purchases
- continuous Discord and game chat bridging

## Next Step

Phase 5 is completed. The next implementation phase is Phase 6 - Restricted Discord Audit Lookup. Phase 6 has not started and must remain a separate focused implementation pull request.