# Rogue Soldiers Framework Roadmap

## Current Status

**Repository Version:** v1.6.0

**Latest Completed Milestone:** v1.6.0 - Component Resilience and Runtime Lifecycle

**Status:** Completed, merged, live verified, and awaiting release PR merge and tag

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

## v1.6.0 - Component Resilience and Runtime Lifecycle

Status: Completed and live verified

### Completed Capabilities

- privacy-safe Provider and Module lifecycle status contracts
- controlled individual start and stop operations
- shared lifecycle-operation serialization
- safe Provider and Module restart coordination
- bounded opt-in 7 Days to Die reconnect behavior
- reconnect cancellation during intentional stop
- trusted Loader-owned 7 Days to Die reconstruction
- configuration-backed candidate creation
- candidate-first initialization and startup
- atomic Provider replacement
- replacement recovery from both `RUNNING` and `ERROR`
- private permission-gated Discord lifecycle status, restart, and reload
- degraded operation while 7 Days to Die is unavailable
- live `ERROR -> reload -> RUNNING` recovery
- privacy-safe immutable outcomes
- BOM-free application JSON for reliable fresh-clone startup

### Preserved Safety Boundaries

- Core, Database, health, migration, and Loader-wide failures remain fatal.
- Recoverable component failure does not trigger total framework rollback.
- Lifecycle output excludes raw errors, stack traces, local paths, credentials, tokens, IP addresses, socket details, clients, configuration objects, database handles, Module stores, and Provider internals.
- Lifecycle mutations are serialized and reject overlapping work.
- Reconnect is bounded, opt-in, and Provider-specific.
- Replacement accepts only trusted registered component names and Loader-owned factories.
- Arbitrary source paths, dynamic code loading, request-controlled constructors, Discord self-replacement, and public lifecycle administration remain prohibited.

### Release Verification

Live testing confirmed:

- healthy lifecycle status
- controlled restart
- configuration-backed reload
- game command operation after restart and reload
- transition to `ERROR` after bounded reconnect exhaustion
- continued Discord and framework operation while 7 Days to Die was unavailable
- successful reload from `ERROR` after Telnet returned
- final healthy `RUNNING` status

## Approved Future Direction

### Audit and Activity Foundation

A future focused milestone should make RSF the authoritative durable record for meaningful staff, infrastructure, moderation, Economy, Ticket, identity, and game-server actions.

The foundation should distinguish:

- operational runtime logging
- durable actor-attributed audit records
- Module-owned business history
- permission-gated staff lookup and website administration

Privileged lifecycle actions should eventually record who initiated the action, the source interface, the fixed target, the sanitized outcome, and the RSF-generated timestamp.

This is future work and is not implemented in v1.6.0.

### Identity Hub and Platform Attachments

Future scope may include:

- RSF-owned permanent identities
- Discord, Steam, EOS, hosted-game, and future platform attachments
- game-first unclaimed identities
- exact durable-identifier matching
- observations, aliases, and activity history
- conflict records and merge candidates
- moderation references preserving exact platform and server scope
- compatibility migration from v1.5 identity links

Automatic merge execution is not approved for the first Identity Hub implementation.

### Other Future Candidates

- continuous Discord and in-game chat integration
- Economy-backed hosted-game rewards and purchases
- multiple hosted game servers
- expanded Ticket workflows
- persistent Website sessions
- broader administration interfaces
- Linux and Docker deployment hardening
- OS-level process supervision

Every future milestone must preserve the established Core, Provider, Module, Shared, privacy, fixed-command ownership, and critical-versus-recoverable boundaries.
