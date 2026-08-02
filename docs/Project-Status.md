# Project Status

## Current Version

v1.7.0

Status: Released and complete. Version files are synchronized to `1.7.0`, release pull request `#101` is merged, annotated tag `v1.7.0` exists, and the GitHub release is published.

## Latest Completed Milestone

v1.7.0 - Audit and Activity Foundation

Status: Completed, merged, verified, tagged, and published.

Release record:

- Implementation and documentation pull requests: `#86` through `#101`
- Release pull request: `#101`
- Release merge commit: `0ef848b0bc073c43d038694172d9e8d6974feb4f`
- Annotated tag: `v1.7.0`
- GitHub release: published
- Release validation: GitHub Actions passed
- Release notes: `docs/releases/Release-Notes-v1.7.0.md`

## Current Milestone

No broader implementation milestone is active.

Status: Repository hygiene and documentation consolidation is the approved checkpoint. PR `#100` remains dormant forward foundation and does not activate broader v1.8.0 work.

## Completed Implementation Checkpoint

The released `v1.7.0` milestone includes Audit development through merged pull request `#98` and release hardening through pull request `#101`:

- Milestone activation and architecture approval: `#86`
- Phase 1 - Audit contracts and in-memory foundation: `#87`
- Phase 2 - SQLite Audit persistence: `#88`
- Phase 3 - narrow Audit recording and query services: `#89`
- Phase 4 - lifecycle administration Audit integration: `#90`
- Phase 5A - Discord `/ban` and `/kick` Audit integration: `#91`
- Phase 5B - hosted-player administration Audit integration: `#92`
- Phase 5C - remaining Discord moderation Audit integration: `#95`
- Phase 5D - Ticket staff mutation Audit integration: `#96`
- Phase 6 - Restricted Discord Audit Lookup: `#98`

PR `#98` head commit:

```text
89fa955d1c73b9e8fa4eda1ebfef30d8b2c04704
```

PR `#98` merge commit:

```text
270179ca75e4800f29c46beb80ee0593494b1388
```


PR `#100` is merged dormant forward foundation on current `main`.

Required interpretation:

```text
Merged, dormant forward foundation included on current main.
Not activated as the current milestone.
Not a completed permission system.
Not a released v1.8.0 capability.
```

PR `#100` does not replace current Discord, Moderation, Ticket, game, lifecycle, or Audit authorization behavior.

Phase 6 was completed and merged through PR `#98` and released as part of `v1.7.0`.

Implemented restricted lookup commands:

- `/audit recent`
- `/audit record`

The command family is guild-only, declares `ManageGuild` at registration, checks `ManageGuild` again at runtime, denies access before protected queries, and always uses ephemeral responses. Core privately constructs `AuditQueryService` and provides Discord only a frozen `getById()` and `list()` boundary.

Queries are bounded and allowlisted. Identifiers are inert, Discord mention parsing is disabled, failures are sanitized, the command is omitted when the query boundary is unavailable, and lookup does not self-record. Discord receives no Audit Module, stores, SQLite connection, SQL, rows, or mutable service internals.


Phase 7 release-hardening evidence:

- focused SQLite Audit restart tests passed
- controlled disposable-database restart verification passed
- `audit-1` and `audit-2` remained available after reconstruction
- exact lookup recovered `audit-1`
- recent lookup remained newest-first as `audit-2`, `audit-1`
- the next record continued as `audit-3`
- excluded private-data terms were absent
- temporary verification data was removed
- 60 focused outcome, authorization, privacy, and compatibility tests passed

Final repository validation and release pull request `#101` completed the milestone. Annotated tag `v1.7.0` and the published GitHub release are authoritative.

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

Status: Completed and merged in PR `#98`.

Implemented:

- `/audit recent`
- `/audit record`
- guild-only private use
- registration-time and runtime `ManageGuild`
- denial before protected query operations
- ephemeral success, denial, and failure responses
- private Core construction of `AuditQueryService`
- frozen `getById()` and `list()` boundary
- bounded allowlisted queries
- inert identifiers and disabled mention parsing
- sanitized failures
- command omission when the boundary is unavailable
- no lookup self-recording
- no Audit Module or persistence internals exposed


### Phase 7 - Live Verification and Release Hardening

Status: Completed, merged in release pull request `#101`, tagged as `v1.7.0`, and published.

Verified:

- durable recovery through automated and controlled disposable-database restart verification
- deterministic Audit IDs and newest-first ordering after reconstruction
- exact lookup after reconstruction
- privacy-safe reconstruction with excluded data absent
- success, denial, failure, and unavailable outcome coverage
- Moderation, Ticket, lifecycle, hosted-player, and restricted Audit lookup compatibility
- version synchronization to `1.7.0`
- release documentation and release notes preparation

Deferred and non-blocking:

- Discord identity presentation using mutable names
- Ticket command-family restructuring

Permanent Discord IDs remain the durable identity representation. Mutable Discord names are not persisted, mentions remain disabled, and inert ID-only fallback remains valid.

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

Complete the approved repository hygiene and documentation consolidation checkpoint.

Do not treat PR `#100` as an active v1.8.0 milestone or permission-system release. Broader v1.8.0 work remains held until the hygiene checkpoint is completed and Framework Planning authorizes the next milestone.
