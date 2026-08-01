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

Status: Active; Audit Phases 1 through 4 and the first two focused Phase 5 integrations are completed and merged.

## Completed Implementation Checkpoint

This checkpoint records completed v1.7.0 work through merged pull request `#92`:

- Milestone activation and architecture approval: `#86`
- Phase 1 - Audit contracts and in-memory foundation: `#87`
- Phase 2 - SQLite Audit persistence: `#88`
- Phase 3 - narrow Audit recording and query services: `#89`
- Phase 4 - lifecycle administration Audit integration: `#90`
- Phase 5A - Discord `/ban` and `/kick` Audit integration: `#91`
- Phase 5B - hosted-player administration Audit integration: `#92`

The framework now loads a platform-neutral Audit Module with immutable validated records, in-memory and SQLite stores, narrow recording and bounded-query services, durable restart recovery, lifecycle administration attribution, and Discord ban/kick accountability summaries.

Later Phase 5 integrations remain separate focused work and are not expanded by this checkpoint.

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

Implemented workflow integrations through PR `#92` provide:

- `/lifecycle restart` and `/lifecycle reload` Audit records
- authenticated Discord actor attribution
- denied, busy, unavailable, failed, and successful lifecycle decision summaries
- Discord `/ban` and `/kick` Audit summaries
- permission-denied, guard-denied, target-unavailable, execution-failed, history-failed, and successful moderation outcomes
- success only after the authoritative Moderation history commit succeeds
- hosted-player `/game kick`, `/game ban`, `/game unban`, `/game whitelist add`, and `/game whitelist remove` Audit summaries
- authenticated Discord staff attribution for hosted-player administration
- privacy-safe, best-effort hosted-player Audit recording that does not change an already completed game-server result
- best-effort Audit writes that do not change an already determined lifecycle or moderation result

Read-only `/game status`, `/game time`, and `/game players` operations and `/game say` are not audited.

Moderation reasons, raw Discord responses, raw game-console output, credentials, addresses, configuration, sockets, stack traces, database rows, SQL, and arbitrary objects are not copied into framework Audit records.

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

Status: Active.

Completed checkpoint integrations:

- Discord `/ban` and `/kick` in PR `#91`
- hosted-player `/game kick`, `/game ban`, `/game unban`, `/game whitelist add`, and `/game whitelist remove` in PR `#92`

Remaining existing privileged workflows must continue through separate focused pull requests without duplicating their authoritative business histories.

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

Continue Phase 5 only through separate focused pull requests for implemented privileged workflows. Do not begin Phase 6 until the current Phase 5 pull request is merged and its checkpoint is reviewed.