# Rogue Soldiers Framework Roadmap

## Current Status

**Repository Version:** v1.5.0

**Latest Completed Milestone:** v1.5.0 - Player Identity Linking Foundation

**Current Milestone:** v1.6.0 - Component Resilience and Runtime Lifecycle

**Status:** Active; Phase 1 planning approved

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

## v1.6.0 - Component Resilience and Runtime Lifecycle

Status: Active; Phase 1 planning approved

### Goal

Create a safe runtime lifecycle foundation that allows independently recoverable Providers and Modules to be observed, controlled, recovered, reloaded, and eventually administered without restarting the entire RSF process.

The milestone builds on the v1.5 degraded-startup boundary and must preserve truthful component state, privacy-safe results, dependency safety, and the distinction between recoverable component failures and fatal framework failures.

### Approved Ownership

Core owns:

- lifecycle coordination
- critical-versus-recoverable policy
- operation serialization
- privacy-safe lifecycle contracts
- trusted reconstruction coordination
- framework-wide status and mutation boundaries

ProviderManager owns:

- registered Provider lookup
- Provider lifecycle status
- controlled Provider lifecycle operations

ModuleManager owns:

- registered Module lookup
- Module lifecycle status
- controlled Module lifecycle operations

Providers and Modules retain responsibility for their own initialization, startup, operation, cleanup, and platform or business-specific behavior.

Discord and Website administration interfaces may use only narrow Core lifecycle services. They must not receive Manager internals, component instances, constructors, source paths, configuration objects, credentials, sockets, clients, stores, database handles, or raw errors.

### Safety Requirements

- Status and mutation results must be frozen, defensive, deterministic, and privacy-safe.
- Raw exceptions, stack traces, paths, addresses, credentials, tokens, sockets, configuration, clients, stores, and database internals must not be exposed.
- Future mutation operations must resolve only registered trusted components.
- Arbitrary source paths, dynamic code loading, and request-controlled constructors are prohibited.
- Lifecycle mutations must be serialized and reject overlapping or conflicting operations.
- Failed operations must leave truthful observable state.
- Recoverable component failures must not trigger total framework rollback.
- Core, Database, health, migration, Loader-wide, and other framework-critical failures remain fatal.
- Automatic retry must be bounded, opt-in, and appropriate to the Provider when implemented.
- Discord must not be allowed to unsafely restart or replace itself through an in-process command.
- Reload and replacement must use trusted Loader-owned reconstruction and atomic replacement.

### Phase 1 - Read-Only Lifecycle Status Foundation

Objective: add privacy-safe read-only status contracts for registered Providers and Modules.

Planned operations:

```text
listProviderStatuses()
getProviderStatus(name)
listModuleStatuses()
getModuleStatus(name)
```

Approved result facts:

- component type
- registered component name
- current component state
- whether initialization previously succeeded
- whether the component is operational
- lifecycle actions supported by the current state

Required behavior:

- deterministic registered order
- frozen status objects and arrays
- defensive results
- safe unknown-component behavior
- no component instances or Manager internals
- no lifecycle mutation
- no change to current startup, degraded-startup, or shutdown behavior

Phase 1 excludes start, stop, restart, reconnect, reload, replacement, automatic retry, Discord commands, Website routes, configuration changes, process supervision, and multiple-server support.

### Phase 2 - Controlled Individual Stop and Start

Planned objective:

- stop one registered recoverable component
- start one successfully initialized registered component
- validate state transitions
- preserve dependency safety
- return sanitized immutable results
- leave unrelated components untouched

### Phase 3 - Safe Restart Coordination

Planned objective:

- introduce one lifecycle-operation lock
- reject overlapping lifecycle mutations
- coordinate stop then start for one component
- preserve truthful failure states
- define restart outcomes without raw error exposure

### Phase 4 - Provider Reconnect Policy

Planned objective:

- define Provider eligibility for reconnect
- implement bounded opt-in reconnect policy
- avoid endless loops and log flooding
- preserve explicit failure visibility
- stop retrying when configuration or authentication is invalid

### Phase 5 - Configuration-Backed Reload and Safe Replacement

Planned objective:

- reconstruct components through trusted Loader-owned factories
- validate configuration before replacement
- initialize and start replacements before publishing them when safe
- replace registered components atomically
- retain or restore the previous component when replacement fails where practical
- prohibit arbitrary source paths, classes, and dynamic code loading

### Phase 6 - Restricted Lifecycle Administration

Planned objective:

- private permission-gated status and lifecycle workflows
- purpose-limited Discord administration
- optional Website administration when separately approved
- audited lifecycle mutations
- no unsafe self-restart path for the Discord Provider

### Phase 7 - Live Recovery Verification and Release Hardening

Required verification will include:

- status reporting for healthy and failed components
- degraded startup with an unavailable optional Provider
- controlled stop, start, and restart
- operation-lock behavior
- bounded reconnect behavior
- configuration-backed reload and failed-replacement handling
- privacy-safe Discord or Website output where implemented
- no regression to Identity, game commands, Website, Tickets, Economy, Moderation, Database, or shutdown
- production dependency audit
- complete tests
- ESLint
- `git diff --check`
- synchronized versions and release documentation

### Outside v1.6.0

- OS-level process supervision
- arbitrary shell commands
- arbitrary Node module loading
- public lifecycle administration
- multiple RSF processes or clustering
- remote database hosting or replication
- multiple hosted game servers unless separately approved
- broad Identity Hub persistence or merge execution
- Economy-backed game purchases or rewards
- continuous Discord and game chat bridging

## v1.5.0 - Player Identity Linking Foundation

Status: Completed and tagged

### Release Record

- Release pull request: `#76`
- Release merge commit: `0c318bddbfc4b5937d0d791b2df8610bfa0aff5c`
- Annotated tag: `v1.5.0`
- Release validation: GitHub Actions passed
- Release notes: `docs/Release-Notes-v1.5.0.md`

### Completed Capabilities

- platform-neutral Identity Module and immutable records
- in-memory and SQLite identity stores
- migration `006_create_identity_links`
- private `/identity status`
- private `/identity link user-id:<Steam_...|EOS_...>`
- exact short-lived 7DTD global-chat proof
- proof-gated verified-link persistence
- verified-link recovery after framework restart
- active Discord-user and game-identity uniqueness
- degraded startup isolation
- privacy-safe recoverable lifecycle logging
- immediate fail-closed proof mismatch handling

The v1.5 identity link remains the active narrow compatibility foundation until a tested future migration exists.

## Future RSF Identity Hub and Platform Attachments

This remains the approved major milestone after or alongside the runtime lifecycle foundation according to operational priority.

Future scope may include:

- RSF-owned permanent identities
- Discord, Steam, EOS, hosted-game, and future platform attachments
- game-first unclaimed identities
- exact durable-identifier matching
- observations, aliases, and activity history
- conflict records and merge candidates
- moderation references preserving exact platform and server scope
- compatibility migration from v1.5 identity links

Automatic merge execution is not approved for the first Identity Hub implementation. Matching, attachment, merge candidacy, and merge execution remain separate operations.

## Other Future Directions

Other candidates include:

- continuous Discord and in-game chat integration
- Economy-backed hosted-game rewards and purchases
- multiple hosted game servers
- expanded Ticket workflows
- persistent Website sessions
- broader administration interfaces

Every future milestone must preserve the established Core, Provider, Module, Shared, privacy, fixed-command ownership, and critical-versus-recoverable startup boundaries.
