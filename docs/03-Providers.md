# Providers

## Provider Responsibility

Providers integrate RSF with external platforms and systems. They own platform clients, protocols, lifecycle, platform-specific validation, interaction handling, API calls, and presentation. Providers remain persistence-blind and must not access Module stores, database connections, SQL, or SQLite row formats.

## Discord Provider

The Discord Provider owns Discord login, readiness, slash-command registration, interaction dispatch, Discord permission and hierarchy checks, API operations, and Discord responses.

It reports `RUNNING` only after login readiness and slash-command registration succeed. Missing configuration, login failure, readiness failure, or registration failure propagates to framework startup and leaves the Provider in `ERROR`. Shutdown awaits client destruction.

### Verified Commands

The Discord Provider loads 13 unique top-level commands:

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

### Module-Facing Commands

Economy, Moderation, and Ticket commands translate Discord interactions into narrow calls to framework-loaded Modules. They do not construct Modules or access Module persistence.

The Ticket command supports creator and staff workflows through ephemeral responses. The current workflow does not create Discord channels, threads, categories, permission overwrites, or transcripts.

### Discord Moderation Safety

`DiscordModerationGuard` centralizes Discord-specific moderation safety checks, including self-target prevention, server-owner protection, moderator and bot role hierarchy, target manageability, and action-specific rejection wording.

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

The Discord Provider owns command definitions, authorization, input validation, response deferral, safe result parsing, and user-facing formatting.

Commands resolve the framework-loaded `7 Days to Die` Provider through a focused resolver. Successful resolution returns only a frozen service exposing `executeCommand`. Commands do not receive Provider Manager, Registry, Telnet, socket, configuration, or credential internals.

Remote operations use stable Discord-side handling for timeout, disconnect, generic execution failure, malformed results, and thrown errors. Raw Telnet output, credentials, IP addresses, positions, health values, socket details, configuration paths, platform identifiers, and internal errors are not exposed through ordinary Discord responses.

`/game kick` validates an exact positive online entity ID and a bounded reason before Provider resolution. It constructs only:

```text
kick <entity id> "<reason>"
```

`/game ban` validates a combined Steam or EOS identifier, positive duration, verified duration unit, bounded reason, and bounded display name before Provider resolution. It constructs only:

```text
ban add <durable user id> <duration> <unit> "<reason>" "<display name>"
```

`/game unban` validates an exact display name, reads `ban list`, requires exactly one active row with that display name, removes the row by its exact stored UserID, reads `ban list` again, and reports success only after that stored UserID is absent.

`/game whitelist add` and `/game whitelist remove` validate durable combined identifiers and bounded display names before Provider resolution. They construct only:

```text
whitelist add <durable user id> <display name>
whitelist remove <durable user id>
```

The remove display name is used only in the private staff-facing result and is not sent to the game server.

## 7 Days to Die Provider

`SevenDaysToDieProvider` is optional and disabled by default. `ProviderLoader` omits it when configuration is missing or disabled. Enabled configuration is validated before client use.

The Provider owns lifecycle and the command-service boundary. It exposes Provider-level `executeCommand(command)` while keeping transport and command internals private.

### Telnet Client and Readiness

`SevenDaysToDieTelnetClient` uses Node's built-in `node:net` API to open the raw TCP management connection.

Verified transport behavior includes:

- password-authenticated readiness
- direct-console readiness when no password prompt appears
- raw line framing across split and combined chunks
- Telnet control-byte and subnegotiation stripping
- UTF-8 preservation across chunk boundaries
- CRLF command writes
- bounded connection readiness timeout
- one-time unexpected connection-loss notification
- idempotent awaited disconnection

The Provider reports `RUNNING` only after console readiness is confirmed. Unexpected socket loss after readiness moves it to `ERROR`. Intentional shutdown remains `STOPPED`.

### Command-Response Boundary

The Provider owns one active command at a time through `SevenDaysToDieCommandService`.

The response-start gate excludes stale startup-banner lines from the first command result. Incoming lines are classified and separated into command response lines and unsolicited event lines.

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

Unverified multiline output, including `ban list`, uses a bounded inactivity fallback after meaningful output begins.

Command results and failure contracts are immutable and defensive. Supported outcomes cover success, timeout, disconnect, write failure, completion-decision failure, size truncation, and generic execution failure.

The command execution boundary and hosted-player workflows were live verified against a running 7 Days to Die V3.1.0 b13 server.

### Hosted Player Identifier Evidence

`listplayerids` exposes online player rows in the verified form:

```text
id=<entity id>, <player name>
```

The entity ID remained associated with the same saved player across reconnects and a clean server restart, but the server accepted it as a kick target only while the player was online. It is therefore an online administration target, not a globally durable account identity.

Steam and EOS combined identifiers are durable game-account targets for ban and whitelist operations. A submitted Steam identifier may normalize to EOS when the server resolves an online player.

Duplicate active bans refresh the existing expiry. Expired temporary bans disappear automatically. Duplicate whitelist add returns success without creating a duplicate row.

### Security Boundary

Raw Telnet is unencrypted, administrative, and untrusted. It must remain on loopback, LAN, VPN, or another protected private path. It must not be exposed directly to the public internet.

Telnet passwords remain environment-only and outside tracked JSON.

### Current Exclusions

The current Provider and Discord integration do not include:

- arbitrary console execution
- free-form Telnet input
- cross-platform identity linking
- continuous Discord and in-game chat bridging
- Economy-backed in-game purchases or rewards
- command queues or simultaneous commands
- multiple game servers
- automatic process supervision

## Website Provider

`WebsiteProvider` is optional and disabled by default. When enabled, it binds only to the exact loopback host `127.0.0.1`; public binding is not implemented.

Website authentication uses Discord OAuth authorization-code flow with PKCE S256, one-time state, browser binding, guild-membership enforcement, token revocation, secure cookies, bounded in-memory attempts, and bounded in-memory sessions.

Creator-owned Ticket listing is the only implemented Website-to-Module capability. Ticket creation, detail views, messages, closing, staff workflows, Moderation, Economy, configuration, administration routes, frontend, persistent sessions, public binding, trusted-proxy behavior, and role-to-permission translation are not implemented.
