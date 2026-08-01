# Rogue Soldiers Framework Roadmap

## Current Status

**Repository Version:** v1.6.0

**Latest Completed Milestone:** v1.6.0 - Component Resilience and Runtime Lifecycle

**Current Milestone:** v1.7.0 - Audit and Activity Foundation

**Status:** Active; Phases 1 through 4 and the first focused Phase 5 integration are completed and merged

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

## v1.7.0 - Audit and Activity Foundation

Status: Active; implementation checkpoint completed through PR `#91`

### Completed Checkpoint

- Milestone activation: PR `#86`
- Phase 1 - Audit contracts and in-memory foundation: PR `#87`
- Phase 2 - SQLite Audit persistence: PR `#88`
- Phase 3 - narrow Audit services and query policy: PR `#89`
- Phase 4 - lifecycle administration Audit integration: PR `#90`
- Phase 5A - Discord `/ban` and `/kick` Audit integration: PR `#91`

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

Status: Active.

Completed checkpoint integration:

- Discord `/ban` and `/kick` in PR `#91`

The merged moderation integration provides authenticated moderator attribution, fixed action and target summaries, sanitized denied and failed statuses, success only after authoritative Moderation history commits, and best-effort Audit recording. Moderation reasons and raw Discord or storage details are not copied into Audit records.

Remaining candidate integrations must be separate focused pull requests:

- hosted-player kick, ban, unban, and whitelist administration
- Ticket staff assignment, response, and closure
- Economy staff credit, debit, or transfer operations where implemented
- Identity staff administration only after such a workflow exists

Read-only commands and ordinary harmless interactions are not recorded individually by default.

### Phase 6 - Restricted Discord Audit Lookup

Objective:

- add one private guild-only staff command
- require a fixed Discord permission at registration and runtime
- return bounded recent Audit records
- support only allowlisted filters
- sanitize identifiers and metadata according to the approved staff purpose
- expose no database, SQL, raw error, configuration, or platform-client internals

### Phase 7 - Live Verification and Release Hardening

Required verification:

- durable Audit recovery after restart
- deterministic IDs and ordering
- actor and source attribution
- denied, failed, and successful privileged outcomes
- privacy-safe metadata and lookup output
- permission denial
- lifecycle and existing workflow compatibility
- no regression to Moderation, Economy, Tickets, Identity, game commands, lifecycle, Website, Database, or shutdown
- production dependency audit
- complete automated tests
- ESLint
- `git diff --check`
- synchronized versions and release documentation

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
- Release notes: `docs/Release-Notes-v1.6.0.md`

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

1. v1.7.0 - Audit and Activity Foundation
2. Identity Hub and Platform Attachments
3. Linux and Docker Deployment Hardening
4. Expanded Ticket Workflows and Staff Portal Foundation
5. Economy-to-Game Rewards and Purchases
6. Continuous Discord and In-Game Chat Bridge
7. Multiple Hosted Game Servers

This order remains the preferred direction unless a concrete operational dependency or Rogue Soldiers priority justifies reevaluation.

Every future milestone must preserve the established Core, Provider, Module, Shared, privacy, fixed-command ownership, database, and critical-versus-recoverable lifecycle boundaries.