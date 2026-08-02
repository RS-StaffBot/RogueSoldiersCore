# Rogue Soldiers Framework Roadmap

## Current Status

**Repository Version:** v1.7.0

**Latest Completed Milestone:** v1.7.0 - Audit and Activity Foundation

**Current Milestone:** No broader implementation milestone activated

**Status:** v1.7.0 is released and complete. Repository hygiene and documentation consolidation is the approved checkpoint. Broader v1.8.0 work remains held.

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
- v1.5.0 - Player Identity Linking Foundation
- v1.6.0 - Component Resilience and Runtime Lifecycle
- v1.7.0 - Audit and Activity Foundation

## v1.7.0 - Audit and Activity Foundation

Status: Completed, merged through release pull request `#101`, tagged as `v1.7.0`, and published as a GitHub release

### Completed Checkpoint

- Milestone activation: PR `#86`
- Phase 1 - Audit contracts and in-memory foundation: PR `#87`
- Phase 2 - SQLite Audit persistence: PR `#88`
- Phase 3 - narrow Audit services and query policy: PR `#89`
- Phase 4 - lifecycle administration Audit integration: PR `#90`
- Phase 5A - Discord `/ban` and `/kick` Audit integration: PR `#91`
- Phase 5B - hosted-player administration Audit integration: PR `#92`
- Phase 5C - remaining Discord moderation Audit integration: PR `#95`
- Phase 5D - Ticket staff mutation Audit integration: PR `#96`
- Phase 6 - Restricted Discord Audit Lookup: PR `#98`
- Phase 7 - controlled restart verification, compatibility evidence, version synchronization, documentation, and release notes: release-hardening branch
- PR `#100` - merged dormant forward permission foundation; not the active milestone, not a completed permission system, and not a released v1.8.0 capability

Recent merge checkpoints:

- PR `#95` merge commit: `c91f87adcc8eee7a08e0a20f91fa99416f7c6e9e`
- PR `#96` merge commit: `2dcfac2ef8fc10b92925b389aac5d35e48abb686`
- PR `#98` head commit: `89fa955d1c73b9e8fa4eda1ebfef30d8b2c04704`
- PR `#98` merge commit: `270179ca75e4800f29c46beb80ee0593494b1388`

### Goal

Create a durable, privacy-safe, actor-attributed record of meaningful RSF actions without turning terminal logging, the EventBus, or existing Module histories into responsibilities they do not own.

The milestone establishes one platform-neutral Audit Module that can be used by approved Discord, Website, lifecycle, Module, and game-server workflows through narrow service boundaries.

### Approved Responsibility Boundary

The Audit Module owns immutable records, action taxonomy, actor/source/target/outcome validation, bounded metadata, recording, querying, and its store contract.

Core owns SQLite, migrations, Audit Module construction, lifecycle loading, and private store injection.

Providers authenticate platform actors and format platform responses. They do not access SQL, database rows, the Audit store, or mutable Module internals.

Existing business histories remain authoritative:

- Moderation cases and actions
- Economy transactions and balances
- Ticket records and messages
- Identity links and verification state
- Current lifecycle state

Audit records summarize accountability and may reference safe stable business-record identifiers. They do not duplicate or replace complete business records.

### Phase 1 - Audit Contracts and In-Memory Foundation

Status: Completed in PR `#87`.

Implemented:

- immutable defensive Audit records
- fixed actor, source, target, action, outcome, and metadata validation
- RSF-generated IDs and timestamps
- bounded allowlisted metadata
- in-memory store parity foundation
- deterministic bounded record and query behavior

### Phase 2 - SQLite Audit Persistence

Status: Completed in PR `#88`.

Implemented:

- ordered migration `007_create_audit_records`
- SQLite Audit store
- deterministic ordering and restart recovery
- database-row reconstruction through Audit record validation
- store isolation from Providers and commands

### Phase 3 - Narrow Audit Services and Query Policy

Status: Completed in PR `#89`.

Implemented:

- frozen recording and bounded-query services
- newest-first pagination
- allowlisted filters
- opaque continuation cursors
- normalized privacy-safe failures
- immutable defensive query pages

### Phase 4 - Lifecycle Administration Audit Integration

Status: Completed in PR `#90`.

Implemented:

- authenticated Discord lifecycle restart and reload records
- fixed 7 Days to Die Provider target
- denied, busy, invalid-state, unavailable, failed, and successful decision mapping
- bounded previous/current lifecycle state and status metadata
- preserved private lifecycle responses
- best-effort Audit writes that cannot change an already determined lifecycle result

### Phase 5 - Existing Privileged Workflow Integration

Status: Completed.

Completed integrations:

- lifecycle `/lifecycle restart` and `/lifecycle reload`
- Discord `/ban`, `/kick`, `/warn`, `/timeout`, `/untimeout`, and `/purge`
- hosted-player `/game kick`, `/game ban`, `/game unban`, `/game whitelist add`, and `/game whitelist remove`
- Ticket staff `/ticket staff message`, `/ticket staff assign`, `/ticket staff unassign`, and `/ticket staff close`

The integrated workflows use authenticated Discord actor attribution, fixed action and target shapes, sanitized outcomes, bounded metadata, and best-effort non-blocking recording. Existing Module and Provider-owned records remain authoritative, and success is recorded only after the owning workflow commits or completes successfully.

Moderation reasons, Ticket message content, raw Discord responses, raw game-console output, credentials, addresses, configuration, sockets, SQL, database rows, stack traces, and arbitrary objects are not copied into Audit records.

The authoritative intentional exclusion list is maintained in `04-Modules.md`. Phase 5 does not audit ordinary read-only commands, ordinary member Ticket workflows, or self-service Identity workflows.

### Phase 6 - Restricted Discord Audit Lookup

Status: Completed in PR `#98`.

Implemented:

- `/audit recent`
- `/audit record`
- guild-only private use
- registration-time and runtime `ManageGuild`
- denial before protected query operations
- ephemeral success, denial, and failure responses
- private Core construction of the bounded query service
- frozen `getById()` and `list()` operations
- command omission when the query capability is unavailable
- inert identifiers
- disabled Discord mention parsing
- sanitized failures
- no lookup self-recording
- no Module, store, SQLite, SQL, rows, or mutable internals exposed


### Phase 7 - Live Verification and Release Hardening

Status: Completed, merged in release pull request `#101`, tagged as `v1.7.0`, and published.

Evidence:

- existing SQLite restart automation passed
- controlled disposable SQLite reconstruction passed
- recovered IDs remained `audit-1` and `audit-2`
- exact lookup recovered `audit-1`
- newest-first lookup returned `audit-2`, `audit-1`
- sequence continuation produced `audit-3`
- excluded private-data terms were absent
- temporary verification data was removed
- 60 focused outcome, authorization, privacy, and compatibility tests passed
- version files are synchronized to `1.7.0`
- release documentation and `docs/releases/Release-Notes-v1.7.0.md` are prepared

Release state:

- release pull request `#101` is merged
- annotated tag `v1.7.0` exists
- the GitHub release is published
- v1.7.0 is released and complete

Deferred and non-blocking:

- Discord identity presentation
- Ticket command-family restructuring

Permanent Discord IDs remain durable identifiers. Mutable names are not persisted, mentions remain disabled, and inert ID-only fallback remains valid.

### Safety Requirements

- Audit records are immutable, defensive, and validated before persistence.
- Record IDs and timestamps are generated by RSF.
- Arbitrary serialized request objects and metadata keys are prohibited.
- Raw Discord messages and raw game-console output are not retained.
- Raw errors, stack traces, credentials, addresses, tokens, sockets, configuration, database rows, SQL, positions, health, inventory, and unrelated identifiers are prohibited.
- Audit lookup is private, permission-gated, bounded, and purpose-limited.
- The EventBus is not an authoritative Audit path.
- Audit integration must not cause a business operation to report success before its authoritative business transaction commits.
- Audit write-failure behavior must be explicitly defined and tested per integration.

### Outside v1.7.0

- general event sourcing
- logging every command or interaction
- user-behavior surveillance
- replacement of Module-owned histories
- Website Audit administration
- configurable retention administration
- external telemetry or log aggregation
- remote database hosting, replication, or clustering
- Identity Hub implementation
- Linux and Docker deployment hardening
- expanded Ticket portal implementation
- Economy-backed hosted-game purchases
- continuous Discord and game chat bridging
- multiple hosted game servers

## v1.6.0 - Component Resilience and Runtime Lifecycle

Status: Completed, merged, live verified, and tagged

### Release Record

- Implementation pull requests: `#77` through `#84`
- Release pull request: `#85`
- Release merge commit: `2519014b7b1a80bc8e12d45787c644da91c21d8a`
- Annotated tag: `v1.6.0`
- GitHub Actions validation: passed
- Release notes: `docs/releases/Release-Notes-v1.6.0.md`

### Completed Capabilities

- privacy-safe Provider and Module lifecycle status
- controlled individual start, stop, and restart
- shared lifecycle mutation serialization
- bounded opt-in 7 Days to Die reconnect recovery
- trusted configuration-backed reconstruction
- atomic replacement from `RUNNING` and recoverable `ERROR`
- private permission-gated Discord lifecycle administration
- live degraded operation and `ERROR -> reload -> RUNNING` recovery
- BOM-free tracked application JSON

## Decided Future Flow

The working milestone order is:

1. Complete the approved repository hygiene and documentation consolidation checkpoint
2. Identity Hub and Platform Attachments
3. Linux and Docker Deployment Hardening
4. Expanded Ticket Workflows and Staff Portal Foundation
5. Economy-to-Game Rewards and Purchases
6. Continuous Discord and In-Game Chat Bridge
7. Multiple Hosted Game Servers

This order remains the preferred direction unless a concrete operational dependency or Rogue Soldiers priority justifies reevaluation.

Every future milestone must preserve the established Core, Provider, Module, Shared, privacy, fixed-command ownership, database, and critical-versus-recoverable lifecycle boundaries.
