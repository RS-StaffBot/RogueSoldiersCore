# Project Status

## Current Version

v1.6.0

## Latest Completed Milestone

v1.6.0 - Component Resilience and Runtime Lifecycle

Status: Completed, merged, live verified, and awaiting release PR merge and tag.

Release record:

- Implementation pull requests: `#77` through `#84`
- Release pull request: pending
- Release merge commit: pending
- Annotated tag: pending
- Release validation: GitHub Actions required before merge
- Release notes: `docs/Release-Notes-v1.6.0.md`

## Verified v1.6 Capabilities

- frozen privacy-safe lifecycle status contracts for registered Providers and Modules
- controlled individual Provider and Module start and stop operations
- one shared non-reentrant lifecycle-operation lock
- safe Provider and Module restart coordination
- bounded opt-in 7 Days to Die reconnect policy
- cancellation of reconnect work during intentional stop
- fixed Loader-owned 7 Days to Die reconstruction allowlist
- configuration reload before replacement candidate construction
- candidate initialization and startup before atomic registry replacement
- failed-candidate cleanup while preserving the existing Provider
- replacement of an initialized 7 Days to Die Provider from `RUNNING` or `ERROR`
- guild-only private `/lifecycle status`
- guild-only private `/lifecycle restart`
- guild-only private `/lifecycle reload`
- Discord registration-time and runtime `ManageGuild` enforcement
- fixed 7 Days to Die lifecycle target with no arbitrary component selection
- degraded operation while the 7 Days to Die Provider is unavailable
- live recovery from `ERROR` to `RUNNING` after the game server and Telnet return
- continued `/game time` operation after restart, reload, and degraded recovery
- fresh-clone JSON startup compatibility through BOM-free `config/core/app.json`

## Live Verification Record

Live verification confirmed:

1. healthy 7 Days to Die lifecycle status
2. controlled restart followed by successful game command execution
3. configuration-backed reload followed by successful game command execution
4. Provider transition to `ERROR` after the game server was stopped and bounded recovery was exhausted
5. Discord and unrelated RSF components remaining online during the Provider failure
6. successful reload from `ERROR` after the game server and Telnet returned
7. final Provider status of `RUNNING`, initialized and operational
8. private Discord lifecycle responses with no raw Telnet, address, credential, path, or stack-trace exposure

## Architecture Boundary

Core owns lifecycle coordination, status and result contracts, operation serialization, trusted replacement coordination, and framework-wide critical-versus-recoverable policy.

ProviderManager and ModuleManager own registered component lookup and lifecycle operations. Components retain responsibility for their own initialization, startup, cleanup, and platform or business behavior.

Discord receives only narrow frozen lifecycle services. It does not receive Manager internals, component instances, constructors, source paths, configuration objects, credentials, sockets, clients, stores, database handles, or raw errors.

The 7 Days to Die Provider owns reconnect behavior. Reconnect is bounded, opt-in, Provider-specific, and cancelled during intentional stop.

Provider reconstruction is fixed to trusted Loader-owned factories. Arbitrary paths, class names, dynamic code loading, request-controlled constructors, and Discord self-replacement remain prohibited.

## Current Production Boundaries

- RSF supports one application process and one Core-owned SQLite connection.
- Node.js 22.13 or newer is required for `node:sqlite`.
- Registered Providers and Modules are initialized and started independently.
- Recoverable component failures leave healthy unrelated components running.
- Failed components remain registered with truthful state.
- Core, Database, health, migration, and Loader-wide failures remain fatal.
- Shutdown remains Providers -> Modules -> Database.
- Lifecycle status is available for Providers and Modules.
- Individual start, stop, and restart contracts exist for Providers and Modules.
- Configuration-backed replacement is currently approved only for the 7 Days to Die Provider.
- Discord lifecycle administration is fixed to the 7 Days to Die Provider.
- Website lifecycle administration is not implemented.
- OS-level process supervision is not implemented.
- Durable actor-attributed framework-wide audit/activity history is not implemented.

## Deferred Audit and Activity Foundation

A future focused milestone should provide durable RSF-owned records for meaningful privileged and business actions, including actor, source, action, target, outcome, and timestamp. Lifecycle restart and reload should eventually record the authorized Discord or Website actor that initiated them.

This future work must not be confused with terminal logging. Runtime logs should remain operational and privacy-safe, while durable audit records should be queryable through permission-gated staff interfaces.

## Next Step

Merge the v1.6.0 release pull request only after the production dependency audit, complete test suite, ESLint, `git diff --check`, version consistency checks, and release-document review pass. After merge, create the annotated `v1.6.0` tag.
