# Decision Log

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

Evidence-backed completion rules are implemented for `gettime`, `listplayers`, `lp`, `say`, `help`, and invalid or unknown commands. Other meaningful multiline output uses a bounded inactivity fallback.

Command results, completion decisions, response arrays, event arrays, and failure contracts are immutable and defensive. Failure handling includes timeout, disconnect, write failure, completion-decision failure, size truncation, and generic execution failure.

The command boundary was live verified against a running 7 Days to Die V3.1.0 b13 server. Discord-to-game operations were subsequently live verified for `/game time`, `/game players`, and `/game say`.

### Guardrails

- Raw Telnet remains private administrative transport on loopback, LAN, VPN, or another protected path.
- Public Telnet exposure is prohibited.
- One active command remains the supported concurrency boundary.
- Arbitrary console execution, command queues, multiple servers, hosted-player administration, continuous chat bridging, and Economy-backed game effects remain outside the current implementation.
- Telnet secrets remain outside tracked JSON.
- Game protocol and command behavior remain Provider-owned.
- Reusable authorization, Economy, Moderation, Ticket, identity, and transaction policy remains Module-owned where applicable.

## Discord Game Command Authorization Boundary

### Decision

The guild-only `/game` command family uses Discord `ManageGuild` as its fixed initial staff requirement.

The Discord Provider owns command definitions, Discord authorization, input validation, reply deferral, safe output parsing, and user-facing error formatting. The 7 Days to Die Provider owns remote execution outcomes.

The implemented command family is `/game status`, `/game time`, `/game players`, and `/game say message:<text>`.

### Guardrails

- Commands fail closed when the Provider is missing, not running, or exposes an invalid service boundary.
- `/game status` does not execute a remote command.
- Remote commands use only fixed operation paths.
- `/game say` rejects command-shaping characters and control characters before Provider resolution.
- Raw Provider and Telnet details are never returned to Discord.

## Database Infrastructure Foundation

### Decision

SQLite is the selected local database engine. Database lifecycle and migration coordination are Core responsibilities, while Modules retain business validation and Providers remain independent of storage.

RSF uses the `node:sqlite` API included with Node 22.13 and newer. Bootstrap creates and registers one Database service. The service owns connection initialization, health checks, transactional migration application, migration history, and controlled shutdown. It does not expose its connection through the Registry.

Module schemas and persistence integrations remain separate. Providers and commands must not access database tables directly.

## Moderation Persistence Authority

### Decision

SQLite is authoritative for production Moderation audit state. `ModerationModule` retains action validation, immutable public record construction, and logging order. A Module-specific store owns parameterized SQL and row mapping. Bootstrap injects the store through `ModuleLoader`; Providers and commands do not access it.

Audit storage must succeed before the Module reports a successful action. Stored records are reconstructed through `ModerationAuditRecord`, so invalid durable data fails Module initialization instead of bypassing Module validation.

## Economy Persistence Authority

### Decision

SQLite is authoritative for production Economy accounts, balances, transaction history, and daily-claim timestamps. Direct `EconomyModule` construction uses an in-memory store implementing the same Module-specific contract.

The Economy Module retains input validation, transfer policy and authorization, balance calculations, transaction construction, public records, and public errors. The store owns durable rows, parameterized queries, transaction boundaries, deterministic ordering, restart recovery, and durable transaction sequence allocation.

Credits, debits, transfers, and daily claims commit every affected balance, claim timestamp, transaction row, and successful transaction identity in one SQLite transaction. A rolled-back operation does not consume the next successful public transaction ID.

## Staff Platform Identifier Visibility

### Decision

Steam and EOS player identifiers are private operational data by default, but they are not categorically hidden from authorized staff.

An explicitly authorized staff lookup or administration workflow may return a requested player's Steam ID, EOS ID, or both when those identifiers are operationally necessary. The workflow must be permission-gated, scoped to the requested player and purpose, and use an ephemeral or equivalently private response where the platform supports it.

Ordinary command success and failure responses continue to avoid echoing submitted or server-normalized platform identifiers unless the approved staff workflow specifically requires that disclosure.

### Guardrails

- Platform identifiers must not be exposed publicly or to ordinary members.
- Raw login, authentication, Telnet, socket, configuration, and server-console output must never be returned merely to reveal an identifier.
- Staff visibility requires an explicit command or workflow contract rather than incidental leakage from another operation.
- Only the identifiers and player context required for the approved staff purpose may be returned.
- IP addresses, credentials, positions, health, inventory, internal errors, and unrelated player identifiers remain private even when a platform identifier is authorized for staff viewing.
