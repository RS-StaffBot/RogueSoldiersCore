# Providers

## Provider Responsibility

Providers integrate RSF with external platforms and systems. They own platform clients, protocols, lifecycle, platform-specific validation, interaction handling, API calls, and presentation.

Providers remain persistence-blind. They must not access Module stores, database connections, SQL, or SQLite row formats.

## Discord Provider

The Discord Provider owns Discord login, readiness, slash-command registration, interaction dispatch, Discord permission and hierarchy checks, API operations, and Discord responses.

It reports `RUNNING` only after login readiness and slash-command registration succeed. Missing configuration, login failure, readiness failure, or registration failure leaves the Provider in `ERROR`. Shutdown awaits client destruction.

### Verified Commands

The Discord Provider loads 15 unique top-level commands:

- `/ping`
- `/help`
- `/ban`
- `/kick`
- `/warn`
- `/timeout`
- `/untimeout`
- `/purge`
- `/balance`
- `/daily`
- `/leaderboard`
- `/ticket`
- `/game`
- `/identity`
- `/lifecycle`

### Module-Facing Commands

Economy, Moderation, Ticket, and Identity commands translate Discord interactions into narrow calls to framework-loaded Modules. They do not construct Modules or access Module persistence.

The Ticket command supports creator and staff workflows through ephemeral responses. The current workflow does not create Discord channels, threads, categories, permission overwrites, or transcripts.

### Discord Moderation Safety

`DiscordModerationGuard` centralizes Discord-specific moderation safety checks, including self-target prevention, server-owner protection, moderator and bot role hierarchy, target manageability, and action-specific rejection wording.

### Discord Identity Boundary

The guild-only `/identity` family includes:

- `/identity status`
- `/identity link user-id:<Steam_...|EOS_...>`

Both workflows use ephemeral responses. The invoking Discord identity comes from the authenticated interaction.

`/identity status` resolves the framework-loaded Identity Module through a narrow service boundary.

`/identity link` uses a cryptographically random short-lived challenge sent through 7 Days to Die global chat. The current workflow creates only the first verified link. Replacement, relinking, unlinking, revocation, staff lookup, broad platform attachments, and Identity Hub behavior remain future work.

### Discord Game Command Boundary

The guild-only `/game` family requires Discord `ManageGuild` and includes:

- `/game status`
- `/game time`
- `/game players`
- `/game say message:<text>`
- `/game kick entity-id:<id> reason:<text>`
- `/game ban user-id:<Steam_...|EOS_...> duration:<number> unit:<choice> reason:<text> display-name:<text>`
- `/game unban display-name:<exact text>`
- `/game whitelist add user-id:<Steam_...|EOS_...> display-name:<text>`
- `/game whitelist remove user-id:<Steam_...|EOS_...> display-name:<text>`

Commands resolve only a frozen game-server service exposing approved operations. They do not receive ProviderManager, Registry, Telnet, socket, configuration, or credential internals.

### Discord Lifecycle Administration

The guild-only `/lifecycle` family requires Discord `ManageGuild` at registration time and runtime.

Implemented subcommands:

- `/lifecycle status`
- `/lifecycle restart`
- `/lifecycle reload`

Every response is ephemeral.

The command is fixed to the registered `7 Days to Die` Provider. Request-controlled component names and arbitrary component selection are not supported.

Discord receives a frozen `DiscordLifecycleService` boundary exposing only:

```text
getStatus()
restart()
reload()
```

`status` uses the privacy-safe Provider status contract. `restart` uses the shared-lock ProviderManager restart contract. `reload` uses Loader-owned configuration reconstruction and ProviderManager atomic replacement.

Discord does not receive ProviderManager internals, Provider instances, constructors, source paths, configuration objects, sockets, clients, credentials, or raw errors.

Discord cannot restart or replace itself through this command path.

### Privileged Audit Integration

Through PR `#96`, the Discord Provider supplies authenticated actor context to narrow workflow-specific Audit adapters for:

- `/lifecycle restart`
- `/lifecycle reload`
- `/ban`
- `/kick`
- `/warn`
- `/timeout`
- `/untimeout`
- `/purge`
- `/game kick`
- `/game ban`
- `/game unban`
- `/game whitelist add`
- `/game whitelist remove`
- `/ticket staff message`
- `/ticket staff assign`
- `/ticket staff unassign`
- `/ticket staff close`

The Provider receives only narrow recording boundaries. It does not receive the Audit store, SQLite connection, SQL, database rows, or mutable Audit Module internals.

Existing Module and Provider-owned records remain authoritative. Audit records are bounded accountability summaries. Recording is best effort and non-blocking after the owning workflow determines its result.

Audit records do not copy moderation reasons, Ticket message content, raw console output, raw Discord responses, credentials, addresses, configuration, sockets, SQL, database rows, stack traces, or arbitrary objects. The authoritative intentional exclusion list is maintained in `04-Modules.md`.

## 7 Days to Die Provider

`SevenDaysToDieProvider` is optional and disabled by default. `ProviderLoader` omits it when configuration is missing or disabled. Enabled configuration is validated before client use.

The Provider owns lifecycle, Telnet transport integration, command execution, identity proof collection, and reconnect behavior.

### Telnet Client and Readiness

`SevenDaysToDieTelnetClient` uses Node's built-in `node:net` API.

Verified transport behavior includes:

- password-authenticated readiness
- direct-console readiness when no password prompt appears
- line framing across split and combined chunks
- Telnet control-byte stripping
- UTF-8 preservation across chunk boundaries
- CRLF command writes
- bounded connection readiness timeout
- one-time unexpected connection-loss notification
- idempotent awaited disconnection

The Provider reports `RUNNING` only after console readiness is confirmed. Intentional shutdown ends in `STOPPED`.

### Command Execution

The Provider owns one active command at a time through `SevenDaysToDieCommandService`.

Evidence-backed deterministic completion exists for:

- `gettime`
- `listplayers`
- `lp`
- `say`
- `help`
- `kick`
- `ban add`
- `ban remove`
- `whitelist add`
- `whitelist remove`
- invalid or unknown commands

Other meaningful multiline output uses a bounded inactivity fallback.

Command results and failure contracts are immutable and defensive. Supported failures include timeout, disconnect, write failure, completion-decision failure, size truncation, and generic execution failure.

### Bounded Reconnect Policy

Unexpected connection loss after completed startup moves the Provider to `ERROR` and may begin reconnect recovery when reconnect is explicitly enabled in trusted configuration.

The reconnect policy is:

- opt-in
- bounded by a validated maximum attempt count
- delayed by a validated configured interval
- limited to one active sequence
- protected by the shared lifecycle-operation lock
- cancelled during intentional stop
- unavailable for initial configuration, initialization, or authentication failure

Successful recovery returns the Provider to `RUNNING`. Exhausted attempts leave it truthfully in `ERROR`.

Reconnect logs remain generic and do not expose raw errors, credentials, addresses, ports, sockets, or server output.

### Configuration-Backed Reconstruction and Replacement

`ProviderLoader` owns a fixed reconstruction allowlist. The only approved reconstructable Provider is:

```text
7 Days to Die
```

Reconstruction reloads trusted configuration before creating a candidate. It does not accept file paths, class names, constructors, source modules, or arbitrary Provider names from Discord or another request source.

ProviderManager replacement:

1. acquires the shared lifecycle-operation lock
2. validates the registered initialized Provider
3. creates a trusted candidate
4. initializes the candidate
5. starts the candidate and proves `RUNNING`
6. stops the existing Provider
7. atomically replaces the registry entry
8. records the candidate as initialized

Replacement is allowed when the initialized existing Provider is `RUNNING` or `ERROR`.

If candidate creation, initialization, startup, or old-Provider cleanup fails, the registry retains the existing Provider and the candidate is cleaned up where possible.

`CREATED`, `READY`, and `STOPPED` remain invalid replacement states.

### Identity Proof Collection

The Provider can collect one temporary identity proof while no normal command is active. It requires the exact active challenge and exact submitted durable Steam or EOS identifier.

The collector returns only sanitized evidence and fails closed on timeout, disconnect, malformed evidence, ambiguity, or identifier mismatch.

### Security Boundary

Raw Telnet is unencrypted administrative transport. It must remain on loopback, LAN, VPN, or another protected private path and must not be exposed directly to the public internet.

Telnet passwords remain environment-only and outside tracked JSON.

### Current Exclusions

- arbitrary console execution
- free-form Telnet input
- continuous Discord and in-game chat bridging
- Economy-backed in-game purchases or rewards
- command queues or simultaneous commands
- multiple game servers
- OS-level process supervision
- arbitrary Provider reconstruction
- general Provider activity auditing outside the approved privileged workflows

## Website Provider

`WebsiteProvider` is optional and disabled by default. When enabled, it binds only to `127.0.0.1`; public binding is not implemented.

Website authentication uses Discord OAuth authorization-code flow with PKCE S256, one-time state, browser binding, guild-membership enforcement, token revocation, secure cookies, bounded in-memory attempts, and bounded in-memory sessions.

Creator-owned Ticket listing is the only implemented Website-to-Module capability.

Website lifecycle administration, Ticket creation, Ticket detail and message workflows, Moderation, Economy, configuration editing, public binding, persistent sessions, and general staff administration are not implemented.
