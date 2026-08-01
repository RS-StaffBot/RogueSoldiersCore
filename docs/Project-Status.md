# Project Status

## Current Version

v1.5.0

## Latest Completed Milestone

v1.5.0 - Player Identity Linking Foundation

Status: Completed, merged, live verified, and tagged.

Release record:

- Release pull request: `#76`
- Release merge commit: `0c318bddbfc4b5937d0d791b2df8610bfa0aff5c`
- Annotated tag: `v1.5.0`
- Release validation: GitHub Actions passed
- Release notes: `docs/Release-Notes-v1.5.0.md`

Verified v1.5 capabilities include:

- private `/identity status`
- private `/identity link user-id:<Steam_...|EOS_...>`
- exact short-lived challenge proof through 7 Days to Die global chat
- proof-gated SQLite persistence
- verified-link recovery after framework restart
- already-linked rejection without another challenge
- normal game commands after proof collection
- degraded startup when the optional 7 Days to Die Provider is unavailable
- privacy-safe recoverable lifecycle logging
- immediate fail-closed completion when the exact challenge comes from a different durable Steam/EOS identifier

The v1.5 `identity_links` model remains the active narrow first-link compatibility foundation. Replacement, relinking, unlinking, revocation, staff lookup, broad platform attachments, and Identity Hub behavior remain future work.

## Current Milestone

v1.6.0 - Component Resilience and Runtime Lifecycle

Status: Active; Phase 1 planning approved.

## Milestone Goal

Give RSF a safe, observable, and controllable runtime lifecycle for independently recoverable Providers and Modules without requiring a full framework restart.

The milestone builds on the v1.5 critical-versus-recoverable startup boundary. It must preserve healthy components when one recoverable component fails and must never downgrade Core, Database, migration, Loader-wide, or other framework-critical failures into ordinary component failures.

The milestone prepares RSF for more reliable hosted-game operation, Linux and Docker deployment, additional game Providers, and future administration interfaces.

## Approved Architecture Boundary

Core owns lifecycle coordination, component registration, operation serialization, lifecycle status contracts, safe reconstruction coordination, and framework-wide critical-versus-recoverable policy.

ProviderManager owns registered Provider lookup and Provider lifecycle operations.

ModuleManager owns registered Module lookup and Module lifecycle operations.

Each Provider and Module remains responsible for its own platform or business cleanup and startup behavior through its existing lifecycle methods.

Discord and Website Providers may expose restricted administrative interfaces only through narrow Core lifecycle services. They must not receive Manager internals, component instances, constructors, arbitrary source paths, configuration objects, errors, sockets, credentials, or raw Provider state.

## Phase Plan

### Phase 1 - Read-Only Lifecycle Status Foundation

Objective: create one privacy-safe status contract for registered Providers and Modules.

Planned operations:

```text
listProviderStatuses()
getProviderStatus(name)
listModuleStatuses()
getModuleStatus(name)
```

Each result may expose only approved runtime facts such as:

- component type
- registered component name
- current component state
- whether initialization previously succeeded
- whether the component is currently operational
- lifecycle actions supported by the current state

Results must be frozen, defensive, deterministic, and free of raw errors, stack traces, configuration, credentials, addresses, IPs, paths, sockets, clients, stores, database handles, and other component internals.

Phase 1 is read-only. It does not mutate lifecycle state.

### Phase 2 - Controlled Individual Stop and Start

Planned objective: add narrow, validated operations for stopping and starting one registered recoverable component while preserving lifecycle ownership and dependency safety.

### Phase 3 - Safe Restart Coordination

Planned objective: serialize lifecycle mutations, prevent overlapping operations, and provide one controlled restart operation with truthful results and rollback-safe behavior where applicable.

### Phase 4 - Provider Reconnect Policy

Planned objective: define evidence-backed opt-in reconnect behavior for eligible Providers without creating uncontrolled retry loops or hiding persistent failures.

### Phase 5 - Configuration-Backed Reload and Safe Replacement

Planned objective: reconstruct approved components from trusted Loader-owned configuration and replace them atomically without arbitrary paths, dynamic code loading, or request-controlled constructors.

### Phase 6 - Restricted Lifecycle Administration

Planned objective: expose approved private staff workflows through Discord and, when appropriate, Website administration boundaries.

### Phase 7 - Live Recovery Verification and Release Hardening

Planned objective: verify degraded operation, controlled recovery, privacy-safe output, operation serialization, restart and reload behavior, and final release documentation.

## Phase 1 Explicit Exclusions

Phase 1 must not add:

- start, stop, restart, reconnect, reload, or replacement operations
- automatic retries or reconnect loops
- Discord or Website lifecycle commands
- configuration mutations
- process supervision
- multiple-server support
- arbitrary component names passed into reconstruction code
- component constructors, instances, Managers, Registry, configuration, or raw errors in public results
- changes to existing startup, degraded-startup, or shutdown behavior

## Required Safety and Privacy Boundaries

- Lifecycle output must never expose raw errors, stack traces, local paths, credentials, tokens, IP addresses, socket details, clients, configuration objects, database handles, Module stores, or Provider internals.
- Component names accepted by future mutation operations must resolve through registered trusted components rather than arbitrary source paths or class names.
- Lifecycle mutations must be serialized and reject conflicting concurrent operations.
- Failed lifecycle operations must report truthful sanitized outcomes and leave component state observable.
- Automatic retry must be bounded, opt-in, and Provider-appropriate when implemented.
- Core, Database, health, migration, Loader-wide, and other framework-critical failures remain fatal.
- Recoverable component failures must not trigger total framework rollback.
- Discord must not be able to restart or replace itself through an unsafe in-process command path.
- Reload and replacement must use trusted Loader-owned reconstruction and atomic replacement rather than dynamic code loading.

## Current Production Boundaries

- RSF supports one application process and one Core-owned SQLite connection.
- Node.js 22.13 or newer is required for `node:sqlite`.
- Registered Providers and Modules are initialized and started independently.
- Recoverable component failures leave healthy unrelated components running and produce degraded startup.
- Failed components remain registered in `ERROR`.
- Core, Database, health, migration, and Loader-wide failures remain fatal.
- Shutdown remains Providers -> Modules -> Database.
- Runtime status, individual lifecycle mutation, reconnect, reload, replacement, and administration are not yet implemented.

## Next Step

Implement Phase 1 as a focused read-only lifecycle status contract with complete automated coverage and no lifecycle mutations.
