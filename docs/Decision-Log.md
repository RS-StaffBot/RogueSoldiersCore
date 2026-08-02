# Decision Log

## v1.7.0 Phase 7 Release Hardening and v1.8.0 Sequencing

### Decision

Complete v1.7.0 Audit and Activity Foundation release hardening before any broader v1.8.0 permission work.

Phase 7 uses existing automated evidence plus controlled disposable-database reconstruction to verify durable Audit recovery, exact lookup, newest-first ordering, deterministic ID continuation, privacy exclusions, and cleanup.

Version-bearing files are synchronized to `1.7.0`. Release pull request `#101` is merged, annotated tag `v1.7.0` exists, and the GitHub release is published. v1.7.0 is released and complete.

PR `#100` is retained as merged dormant forward foundation included on current `main`.

Required interpretation:

```text
Merged, dormant forward foundation included on current main.
Not activated as the current milestone.
Not a completed permission system.
Not a released v1.8.0 capability.
```

Discord identity presentation and Ticket command-family restructuring are deferred and non-blocking for v1.7.0.

### Guardrails

- Do not revert PR `#100`.
- Do not activate broader v1.8.0 permission work until the approved repository hygiene checkpoint is completed and Framework Planning authorizes the next milestone.
- Do not treat dormant contracts as replacement authorization behavior.
- Do not persist mutable Discord names.
- Keep mentions disabled and permit inert ID-only fallback.
- Keep the mixed `/ticket` command family for v1.7.0.
- Runtime authorization remains mandatory.
- Do not alter or recreate the authoritative v1.7.0 tag or GitHub release during repository hygiene work.

## Runtime Lifecycle Coordination and Recovery

### Decision

RSF provides privacy-safe runtime lifecycle status and controlled lifecycle mutation for registered Providers and Modules without exposing component internals or requiring a full framework restart.

ProviderManager and ModuleManager own registered component lookup, initialization tracking, status creation, and individual start, stop, and restart operations.

A shared non-reentrant lifecycle-operation lock serializes individual start, stop, restart, Provider replacement, and eligible Provider reconnect work. Conflicting operations return a sanitized `BUSY` outcome rather than waiting, overlapping, or exposing lock internals.

Lifecycle status and operation results are frozen and defensive. They expose only approved facts such as component type, trusted registered name, state, initialization status, operational status, operation, outcome, and success.

### Guardrails

- Unknown request-controlled names must not be echoed in lifecycle results.
- Raw errors, stack traces, paths, addresses, ports, credentials, tokens, sockets, clients, configuration, stores, database handles, and component instances must not be exposed.
- Failed operations must leave truthful observable state.
- Core, Database, health, migration, Loader-wide, and other framework-critical failures remain fatal.
- Recoverable component failure must not trigger total framework rollback.
- Bulk startup and shutdown ownership remains unchanged.

## 7 Days to Die Reconnect Policy

### Decision

Unexpected runtime connection loss may trigger a Provider-owned bounded reconnect policy only when reconnect is explicitly enabled in trusted 7 Days to Die configuration.

Reconnect is limited by validated maximum attempts and delay, uses one active sequence, runs under the shared lifecycle-operation lock, and is cancelled during intentional stop.

Reconnect does not apply to initial configuration, initialization, or authentication failure. Successful recovery returns the Provider to `RUNNING`; exhausted attempts leave it in `ERROR`.

### Guardrails

- Reconnect must never become an endless loop.
- Reconnect must not conceal persistent failure.
- Intentional stop must cancel reconnect work.
- Reconnect logs must remain generic and privacy-safe.
- Reconnect remains Provider-specific rather than a generic Core retry mechanism.

## Trusted Provider Reconstruction and Atomic Replacement

### Decision

Provider reconstruction is owned by `ProviderLoader` through a fixed allowlist. The only currently reconstructable Provider is `7 Days to Die`.

Reconstruction reloads trusted configuration before candidate construction. It does not accept request-controlled source paths, class names, constructors, modules, or arbitrary Provider names.

ProviderManager replacement acquires the shared lifecycle-operation lock, constructs a candidate, initializes it, starts it, verifies `RUNNING`, stops the existing Provider, and atomically replaces the registry entry.

Replacement is allowed for an initialized existing Provider in `RUNNING` or `ERROR`. `CREATED`, `READY`, and `STOPPED` remain invalid replacement states.

If candidate construction, initialization, startup, or old-Provider cleanup fails, the existing Provider remains registered and the candidate is cleaned up where possible.

### Guardrails

- Candidate readiness must be proven before registry replacement.
- Arbitrary dynamic code loading is prohibited.
- Discord and Website must not receive constructors, Loader internals, configuration objects, or Provider instances.
- Discord self-replacement is prohibited.
- Module reconstruction and replacement remain future work.

## Restricted Discord Lifecycle Administration

### Decision

The Discord Provider exposes a guild-only private lifecycle command family fixed to the `7 Days to Die` Provider:

```text
/lifecycle status
/lifecycle restart
/lifecycle reload
```

Discord `ManageGuild` is required at registration time and checked again at runtime. Every response is ephemeral.

Discord receives only a frozen lifecycle service exposing `getStatus()`, `restart()`, and `reload()` for the fixed target.

### Guardrails

- Arbitrary component selection is not supported.
- Discord cannot restart or replace itself.
- ProviderManager, ProviderLoader, component instances, constructors, configuration, credentials, sockets, clients, and raw errors remain private.
- Lifecycle administration does not provide configuration editing, process restart, source-code hot reload, Website control, or Module control.
- Durable actor-attributed Audit records are implemented for `/lifecycle restart` and `/lifecycle reload`; `/lifecycle status` remains intentionally unaudited.

## Audit Phase 5 Privileged Workflow Integration

### Decision

Phase 5 of `v1.7.0 - Audit and Activity Foundation` is completed through PR `#96`.

Implemented privileged workflow integrations are:

```text
/lifecycle restart
/lifecycle reload
/ban
/kick
/warn
/timeout
/untimeout
/purge
/game kick
/game ban
/game unban
/game whitelist add
/game whitelist remove
/ticket staff message
/ticket staff assign
/ticket staff unassign
/ticket staff close
```

Recent merge checkpoints:

- PR `#95` merge commit: `c91f87adcc8eee7a08e0a20f91fa99416f7c6e9e`
- PR `#96` merge commit: `2dcfac2ef8fc10b92925b389aac5d35e48abb686`

Existing Module and Provider-owned records remain authoritative. Audit records are bounded accountability summaries. Core owns database and lifecycle infrastructure, not Audit business rules. Providers and Modules receive only narrow Audit service boundaries.

Audit recording for the integrated workflows is best effort and non-blocking after the owning workflow determines its result. An Audit failure does not alter an already determined lifecycle, moderation, hosted-game, or Ticket result.

### Guardrails

- Audit records must not store moderation reasons, Ticket message content, raw console output, raw Discord responses, credentials, addresses, configuration, sockets, SQL, database rows, stack traces, or arbitrary objects.
- Successful accountability must not be recorded before the authoritative owning Module mutation commits or Provider operation completes.
- Ordinary read-only commands and harmless member interactions are not recorded by default.
- The authoritative intentional exclusion list is maintained in `04-Modules.md`.
- Phase 6 - Restricted Discord Audit Lookup was completed and merged through PR `#98`. Phase 7 release hardening was completed and merged through release pull request `#101`. v1.7.0 is released and complete.

## Restricted Discord Audit Lookup

### Decision

Phase 6 of `v1.7.0 - Audit and Activity Foundation` was completed through PR `#98`.

The Discord Provider exposes the guild-only private `/audit recent` and `/audit record` operations. Discord `ManageGuild` is fixed in registration metadata and checked again at runtime. Permission denial occurs before any protected query operation.

Core privately resolves the framework-loaded Audit Module and constructs `AuditQueryService`. Discord receives only a frozen boundary exposing:

```text
getById()
list()
```

The Audit Module owns record validation and bounded allowlisted query policy. Discord owns interaction handling, authorization, and sanitized private presentation.

### Guardrails

- Every success, denial, and failure response is ephemeral.
- Identifiers are rendered as inert bounded text.
- Discord mention parsing is disabled.
- Failures are sanitized.
- The command is omitted when the query capability is unavailable.
- Lookup does not create an Audit record for itself.
- Discord receives no Audit Module, store, SQLite connection, SQL, database rows, or mutable service internals.
- Audit summaries do not replace authoritative Module or Provider-owned business histories.

These controls preserve permanent ownership, least-privilege capability exposure, privacy-safe presentation, and defense in depth between Discord visibility, runtime authorization, Module policy, and persistence.

## Critical and Recoverable Startup Boundary

### Decision

RSF distinguishes framework-critical startup failures from identifiable component failures.

Core configuration, Registry or Bootstrap infrastructure, Loader-wide component construction, Database initialization, Database health, and migration failures remain fatal. These failures abort startup and preserve authoritative rollback behavior.

An initialization or startup failure attributable to one registered Provider or independently recoverable Module is isolated to that component. The failed component remains registered in `ERROR`, a component that failed initialization is not started, and healthy unrelated components remain active.

ProviderManager and ModuleManager remain the lifecycle owners for their registered components and return frozen, privacy-safe lifecycle summaries. Bootstrap coordinates those summaries and reports `STARTED` when all recoverable component operations succeed or `STARTED_DEGRADED` when Core and the Database are healthy but one or more recoverable components fail.

### Guardrails

- A recoverable Provider or Module failure must not trigger total framework rollback.
- Framework-critical failures must not be downgraded into degraded startup.
- Lifecycle summaries must not expose raw errors, stack traces, configuration, paths, addresses, sockets, tokens, credentials, or other private internals.
- Shutdown remains Providers -> Modules -> Database and must handle mixed `RUNNING` and `ERROR` component states.
- Runtime reload must use controlled reconstruction and replacement rather than arbitrary source paths, classes, configuration, or dynamic code loading.

## Website Authentication Configuration Boundary

### Decision

Website authentication configuration is validated by the Provider-local `WebsiteAuthenticationConfiguration` boundary during `WebsiteProvider` initialization. Authentication remains disabled by default. Disabled configuration does not require deployment values and produces a frozen `{ enabled: false }` snapshot.

When enabled, configuration requires a canonical HTTPS public origin, valid Discord guild and client IDs, an environment-supplied Discord client secret, and bounded OAuth and session lifetimes. The callback URI is derived exactly from the canonical public origin rather than configured independently or inferred from request headers. Returned snapshots exclude the client secret.

Invalid enabled configuration fails before the Website listener starts. Secrets remain environment-only and outside tracked JSON.

### Guardrails

- The callback URI must not be derived from untrusted request headers.
- Authentication remains disabled by default.
- Secrets remain outside tracked JSON.
- Website transport, authentication, Module access, and configuration responsibilities remain separate boundaries.

## 7 Days to Die Command Execution Boundary

### Decision

`SevenDaysToDieProvider` owns the remote command-service boundary and exposes Provider-level `executeCommand(command)`. The Discord Provider receives only a frozen service exposing that method and does not receive Telnet, socket, credential, configuration, Registry, or Provider Manager internals.

`SevenDaysToDieTelnetClient` owns raw TCP connection, password-authenticated and direct-console readiness, Telnet control-byte removal, line framing, UTF-8 chunk preservation, CRLF command writes, connection timeout, connection-loss notification, and awaited idempotent disconnection.

`SevenDaysToDieCommandService` owns one active command at a time. A response-start gate excludes stale startup-banner output. Incoming console lines are classified and separated into active-command response lines and unsolicited event lines.

Evidence-backed deterministic completion is implemented for `gettime`, `listplayers`, `lp`, `say`, `help`, `kick`, `ban add`, `ban remove`, `whitelist add`, `whitelist remove`, and invalid or unknown commands. Other meaningful multiline output uses a bounded inactivity fallback.

Command results, completion decisions, response arrays, event arrays, and failure contracts are immutable and defensive.

### Guardrails

- Raw Telnet remains private administrative transport on loopback, LAN, VPN, or another protected path.
- Public Telnet exposure is prohibited.
- One active command remains the supported concurrency boundary.
- Arbitrary console execution, free-form Telnet input, command queues, multiple servers, continuous chat bridging, and Economy-backed game effects remain outside the implementation.
- Telnet secrets remain outside tracked JSON.

## Discord Game Command Authorization Boundary

### Decision

The guild-only `/game` command family uses Discord `ManageGuild` as its fixed staff requirement.

The Discord Provider owns command definitions, Discord authorization, input validation, reply deferral, safe output parsing, and user-facing formatting. The 7 Days to Die Provider owns remote execution outcomes.

### Guardrails

- Commands fail closed when the Provider is missing, not running, or exposes an invalid service boundary.
- `/game status` does not execute a remote command.
- Remote commands use only fixed operation paths.
- Validation occurs before Provider resolution.
- Raw Provider and Telnet details are never returned through ordinary Discord responses.
- Hosted-player targets must be exact; fuzzy matching is not implemented.

## Hosted Player Administration Contracts

### Decision

Hosted-player administration remains a Discord Provider to 7 Days to Die Provider operation and does not introduce a Module because no reusable cross-platform business policy has been proven.

Approved fixed execution contracts are:

```text
kick <online entity id> "<validated reason>"
ban add <durable user id> <duration> <unit> "<reason>" "<display name>"
ban list
ban remove <exact stored UserID>
ban list
whitelist add <durable user id> <display name>
whitelist remove <durable user id>
```

Unban success requires the second `ban list` to prove that the exact stored UserID is absent.

### Guardrails

- Online entity IDs are kick targets only while the player is online.
- Steam and EOS combined identifiers are durable administration targets.
- Ordinary Discord results use validated display names and do not echo durable identifiers.
- Whitelist groups, fuzzy matching, and arbitrary console execution are excluded.

## Staff Platform Identifier Visibility

### Decision

Steam and EOS player identifiers are private operational data by default, but they are not categorically hidden from authorized staff.

An explicitly authorized staff lookup or administration workflow may return a requested player's Steam ID, EOS ID, or both when operationally necessary. The workflow must be permission-gated, scoped to the requested player and purpose, and use an ephemeral or equivalently private response.

### Guardrails

- Platform identifiers must not be exposed publicly or to ordinary members.
- Raw login, authentication, Telnet, socket, configuration, and server-console output must not be returned merely to reveal an identifier.
- IP addresses, credentials, positions, health, inventory, internal errors, and unrelated player identifiers remain private.

## Database Infrastructure Foundation

### Decision

SQLite is the selected local database engine. Database lifecycle and migration coordination are Core responsibilities, while Modules retain business validation and Providers remain independent of storage.

RSF uses the `node:sqlite` API included with Node 22.13 and newer. Bootstrap creates and registers one Database service. The service owns connection initialization, health checks, transactional migration application, migration history, and controlled shutdown. It does not expose its connection through the Registry.

Module schemas and persistence integrations remain separate. Providers and commands must not access database tables directly.

## Moderation Persistence Authority

### Decision

SQLite is authoritative for production Moderation audit state. `ModerationModule` retains action validation, immutable public record construction, and logging order. A Module-specific store owns parameterized SQL and row mapping.

Audit storage must succeed before the Module reports a successful action.

## Economy Persistence Authority

### Decision

SQLite is authoritative for production Economy accounts, balances, transaction history, and daily-claim timestamps. Direct `EconomyModule` construction uses an in-memory store implementing the same Module-specific contract.

The Economy Module retains input validation, transfer policy and authorization, balance calculations, transaction construction, public records, and public errors. The store owns durable rows, parameterized queries, transaction boundaries, deterministic ordering, restart recovery, and durable transaction sequence allocation.

Credits, debits, transfers, and daily claims commit every affected balance, claim timestamp, transaction row, and successful transaction identity in one SQLite transaction.
