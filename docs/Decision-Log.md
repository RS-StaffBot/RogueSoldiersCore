# Decision Log

## Discord Is a Provider

### Decision

Discord is a platform Provider, not the framework itself. It translates Discord interactions, permissions, identities, API behavior, and responses at the platform boundary.

### Reason

Keeping Discord-specific behavior in a Provider allows Core to coordinate lifecycle and infrastructure while Modules retain reusable business rules. Future game or website Providers can use those rules without depending on Discord types or APIs.

## Shared Layer Purpose

### Decision

Shared contains small, platform-neutral contracts and identifiers that are genuinely used across architectural boundaries.

Shared does not own platform integrations, Module business state, Core lifecycle, or speculative generic abstractions. Code remains with its natural owner until reuse across boundaries is proven.

## Stable Documentation Structure

### Decision

The numbered architecture documents remain stable source-of-truth locations:

- `00-Vision.md` defines purpose, verified scope, and future direction.
- `01-Architecture.md` defines system boundaries and dependency direction.
- `02-Core.md` defines Core responsibilities.
- `03-Providers.md` defines platform Provider responsibilities.
- `04-Modules.md` defines business Module responsibilities.
- `05-Events.md` defines event boundaries.
- `06-Permissions.md` defines reusable permission ownership and translation.
- `07-Coding-Standards.md` defines repository coding rules.

Supporting status, roadmap, glossary, dependency, onboarding, and decision documents must remain cumulative and consistent with the repository.

## Architecture Change Rule

### Decision

A major architecture change requires evidence from at least two of these conditions:

- A second real implementation needs the boundary.
- Current ownership produces duplicated responsibility.
- The existing design blocks a verified requirement.
- Tests or operational evidence expose a lifecycle, integrity, or isolation problem.

Preference or hypothetical reuse alone is insufficient. Approved changes must update the affected source-of-truth documentation with the implementation.

## Milestone Workflow

### Decision

Milestones move through an explicit sequence:

```text
Plan
  |
  v
Implement cohesive checkpoints
  |
  v
Verify behavior and boundaries
  |
  v
Close documentation and version state
  |
  v
Commit, push, and tag when authorized
```

The roadmap identifies the next planned milestone. Project status records verified completed implementation. A planned milestone is not implemented merely because it appears in future direction.

## Single Discord Command Architecture

### Decision

RSF uses one active Discord slash-command architecture:

- Discord command definitions live under `src/providers/discord/commands`.
- `CommandLoader` discovers and validates command modules.
- The Discord Command Registry owns loaded command definitions.
- `CommandRegistrar` registers the same definitions with Discord.
- `InteractionHandler` dispatches runtime interactions through that registry.

Registration and runtime execution share one command source:

```text
Command files
    |
    v
CommandLoader
    |
    v
Discord Command Registry
    |                         |
    v                         v
CommandRegistrar        InteractionHandler
    |                         |
    v                         v
Discord REST            Command execution
```

Commands translate Discord input and output. They resolve framework-loaded Modules and do not construct replacement Modules or access persistence directly.

## Moderation Responsibility Split

### Decision

Moderation is divided between the Moderation Module, Shared permission identifiers, and the Discord Provider.

### Ownership

Moderation Module:

- Supported actions
- Action-to-permission mapping
- Audit records
- Audit store contract and validated public records

Shared:

- Reusable moderation permission identifiers

Discord Provider:

- Interaction input
- Member and channel resolution
- Discord permission checks
- Hierarchy and manageability checks
- Discord API operations
- Discord responses

## Centralized Logging and Color

Terminal formatting and ANSI color behavior belong only in Core Logger. This provides consistent behavior across compatible terminals and plain-text fallback elsewhere.

## Economy Ownership and State Integrity

### Decision

Economy business logic is platform-neutral and owned by `EconomyModule`. Discord commands resolve the framework-loaded Economy Module through the Core Registry and Module Manager rather than constructing a separate instance.

Economy writes are atomic through the selected store implementation. Failed operations do not partially change balances, accounts, daily claim timestamps, transactions, ordering, or transaction ID sequencing.

Public Economy reads return defensive account, transaction, configuration, array, and `Date` snapshots so callers cannot mutate internal state through returned values.

Production Economy persistence and database-backed atomicity are implemented through the v0.7.0 SQLite store integration described below.

## Ticket Ownership, Authorization, and State Integrity

### Decision

Ticket business logic is platform-neutral and owned by `TicketModule`. Discord Ticket commands resolve the one framework-loaded Module through the Core Registry and Module Manager rather than constructing another instance.

Ticket and message IDs retain Module-owned public formats and derive from independent successful store sequences. Ticket writes are atomic through the selected store implementation, and public Ticket records and messages are frozen defensive snapshots.

Creator-owned operations and staff authorization remain Module-owned. The Discord Provider translates platform permissions into reusable Ticket permission identifiers. `ManageMessages` is the current fixed, non-configurable staff boundary, while `Administrator` supplies the administrative override and Discord's individual permission grants.

Production Ticket persistence and database-backed atomicity are implemented through the v0.7.0 SQLite store integration described below. Discord channel and thread Ticket architecture, transcripts, permission overwrites, configurable roles, external portals, and web administration remain future work.

## Future Administration Boundary

Future administrative interfaces must invoke validated RSF settings and operations. They must not directly mutate Module properties, configuration files, or database rows. Such an interface will require permissions, audit logging, and persistence. The current Website Provider and authentication contract do not implement that administrative interface.

## Website Authentication Contract

### Decision

The Website Provider uses a focused, Provider-local `WebsiteAuthenticator` boundary. `WebsiteServer` retains explicit routing for `GET /health` and `GET /api/me`; two fixed routes do not justify a generic router or middleware framework.

Production authentication denies access by default. Tests may inject deterministic identities to verify request handling, validation, allowlisting, and failure behavior. Authenticated identity results remain Provider-local and do not introduce a Shared principal model.

### Boundaries

- `GET /health` remains unauthenticated and reports Website transport readiness only.
- `GET /api/me` returns identity only when an injected authenticator supplies a valid result.
- Missing or invalid identities fail closed with `401`.
- Authenticator operational failures return a generic request-level `503` and do not move the Website Provider to `ERROR`.
- Discord OAuth, sessions, cookies, permission translation, Module access, persistence, frontend behavior, and production login are not implemented.

### Reason

The contract proves separation between HTTP transport and future authentication without selecting or simulating a production login system. A Shared principal, session system, OAuth client, Module route, or generic routing abstraction would exceed the current verified requirement.

## Website Authentication Configuration Validated Before Real Authentication Is Enabled

### Decision

Website authentication configuration is validated by the Provider-local `WebsiteAuthenticationConfiguration` boundary during `WebsiteProvider` initialization. Authentication remains disabled by default. Disabled configuration does not require deployment values and produces a frozen `{ enabled: false }` snapshot.

When enabled, configuration requires a canonical HTTPS public origin, valid Discord guild and client IDs, an environment-supplied Discord client secret, and bounded OAuth and session lifetimes. The callback URI is derived exactly from the canonical public origin rather than configured independently or inferred from request headers. The returned snapshot excludes the client secret.

Invalid enabled configuration fails before the Website listener starts. Valid enabled configuration also fails closed with an explicit configured-but-unimplemented error until real authentication is implemented.

### Reason

The final deployment values do not yet exist, so disabled configuration lets Rogue Soldiers continue local Website development safely. Validating the security-sensitive deployment contract before adding OAuth or sessions establishes one deterministic source for the future callback URI and prevents partially configured authentication from appearing operational. Keeping secrets environment-only and out of returned configuration snapshots reduces accidental exposure. Failing before transport startup ensures the framework cannot serve a misleading partially enabled authentication state. Real OAuth remains a separately reviewed security phase.

### Guardrails

- This decision does not implement OAuth authorization, callback processing, state or replay protection, sessions, cookies, logout, or production identities.
- The callback URI must not be derived from untrusted request headers.
- The disabled Website remains usable for transport health while production authentication continues to deny requests.
- Authentication remains disabled by default, and complete configuration does not make it operational.
- Secrets remain outside tracked JSON.
- This decision does not introduce Module, Registry, store, database, Ticket, frontend, settings API, settings interface, or secret service access.

## 7 Days to Die Command Execution Deferral

### Decision

The optional `SevenDaysToDieProvider` currently owns configuration validation and lifecycle coordination for its raw TCP client. The client owns connection, authentication, readiness, timeout, and disconnection behavior. Administrative command execution is not implemented.

A direct single-command client operation remains the preferred future command-execution shape. Its implementation is deferred until deployment-specific output evidence establishes deterministic response completion, unsolicited-log filtering, server-version and hosting compatibility, and safe command-timeout behavior. No command queue, separate command coordinator, generic command framework, response marker, or prompt delimiter is approved.

Future game-server configuration may be entered through a validated web administration interface. That interface must call validated RSF configuration operations rather than edit source files, and secrets must remain outside tracked configuration files. The current Website Provider does not expose game-server configuration or persist configuration changes. Game-server behavior remains Provider-owned.

## Database Infrastructure Foundation

### Decision

SQLite is the selected local database engine. Database lifecycle and migration coordination are Core responsibilities, while Modules retain business validation and Providers remain independent of storage.

RSF uses the `node:sqlite` API included with Node 22.13 and newer. This avoids reintroducing a native npm SQLite add-on and its Windows compilation toolchain. No ORM or query builder is selected by this foundation checkpoint.

Bootstrap creates and registers one Database service. The service owns connection initialization, health checks, transactional migration application, migration history, and controlled shutdown. It does not expose its connection through the Registry.

Module schemas and persistence integrations remain separate checkpoints. Providers and commands must not access database tables directly.

## Moderation Persistence Authority

### Decision

Moderation is the first Module persistence integration because its single append-only audit stream provides useful restart recovery with the smallest schema and public-API risk.

SQLite is authoritative for production Moderation audit state. `ModerationModule` retains action validation, immutable public record construction, and logging order. A Module-specific store owns parameterized SQL and row mapping. Bootstrap injects that store through `ModuleLoader`; Providers and commands do not access it. Module migrations join one globally ordered `NNN_lowercase_name` sequence through the Core migration loader.

Audit storage must succeed before the Module logs or reports a successful action. Stored records are reconstructed through `ModerationAuditRecord`, so invalid durable data fails Module initialization instead of bypassing Module validation.

## Economy Persistence Authority

### Decision

SQLite is authoritative for production Economy accounts, balances, transaction history, and daily-claim timestamps. Direct `EconomyModule` construction uses an in-memory store implementing the same Module-specific contract.

The Economy Module retains input validation, transfer policy and authorization, balance calculations, transaction construction, public records, and public errors. The store owns durable rows, parameterized queries, transaction boundaries, deterministic ordering, restart recovery, and durable transaction sequence allocation.

Credits, debits, transfers, and daily claims commit every affected balance, claim timestamp, transaction row, and successful transaction identity in one SQLite transaction. Public transaction IDs retain the `economy-N` format and derive from committed SQLite transaction sequence values. A rolled-back operation does not consume the next successful public ID.

Daily claims are included with the core ledger because leaving cooldown timestamps in memory would permit duplicate rewards after restart and create mixed persistence authority. Economy configuration remains validated Module configuration rather than durable user state.

## Ticket Persistence Authority

### Decision

SQLite is authoritative for production Ticket records, status, assignment, messages, ordering, and public identity sequences. Direct `TicketModule` construction uses an in-memory store implementing the same Module-specific contract.

`TicketModule` retains validation, creator ownership, staff authorization, administrative override, status transitions, open-Ticket restrictions, public errors, and frozen public records. The store owns durable rows, parameterized queries, transaction boundaries, explicit ordering, restart recovery, and independent Ticket and message sequence allocation.

Public IDs retain the `ticket-N` and `ticket-message-N` formats and derive from separate committed SQLite sequences. Failed writes roll back their row and sequence change together. Discord list and recent-message presentation uses optional bounded Module reads while existing unbounded Module APIs remain compatible for non-interaction callers.

## v0.7.0 Persistence Boundary

### Decision

The completed v0.7.0 architecture uses SQLite for the current single-process deployment boundary through Node's built-in `node:sqlite` API. Core owns the single connection, migration lifecycle, health checks, controlled store construction, and shutdown. Migrations run before Module loading.

Moderation, Economy, and Tickets use separate Module-specific store contracts. SQLite is authoritative in production, while direct isolated Module construction uses in-memory stores. Providers, commands, and Shared components remain persistence-blind.

Public Module identities remain domain identities rather than exposed database row types. Database transactions protect multi-row Module writes and successful ID sequencing. They do not roll back external Discord actions.

No ORM, query builder, native SQLite npm package, remote database, replication, clustering, backup system, or administration interface is selected. A future database replacement must preserve Module validation, authorization, public identities, store contracts, transactional guarantees, and Provider isolation.

## Website Authentication Uses Discord OAuth and In-Memory Sessions

### Decision

Website authentication uses Discord OAuth with opaque, server-side in-memory sessions for the first production-shaped Website login checkpoint.

### Reason

- Discord is the established Rogue Soldiers identity source.
- The authorization-code flow with PKCE and one-time state provides a secure login boundary.
- Opaque server-side sessions support revocation and avoid browser-visible claims or tokens.
- In-memory storage provides a complete checkpoint without introducing database ownership and migrations into the authentication phase.
- Ticket and Module integration remain separate review boundaries.

### Guardrails

- Authentication remains disabled by default.
- OAuth tokens are not retained.
- Sessions are lost on Provider or process restart.
- Guild membership grants login eligibility only, not RSF staff permission.
- No role translation, Module access, or persistent session claim is implied.
- Public use requires a configured HTTPS reverse proxy and registered Discord callback.
