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

The guild-only `/game` family requires `ManageGuild` and includes:

- `/game status`
- `/game time`
- `/game players`
- `/game say message:<text>`

The Discord Provider owns command definitions, authorization, input validation, response deferral, safe result parsing, and user-facing formatting.

Commands resolve the framework-loaded `7 Days to Die` Provider through a focused resolver. Successful resolution returns only a frozen service exposing `executeCommand`. Commands do not receive Provider Manager, Registry, Telnet, socket, configuration, or credential internals.

Remote operations use stable Discord-side handling for timeout, disconnect, generic execution failure, malformed results, and thrown errors. Raw Telnet output, credentials, IP addresses, positions, health values, socket details, and internal errors are not exposed to Discord.

Hosted-player administration is not yet registered through Discord. The first approved future operation is online kick after shared Discord-side validation and result formatting are implemented.

## 7 Days to Die Provider

`SevenDaysToDieProvider` is optional and disabled by default. `ProviderLoader` omits it when configuration is missing or disabled. Enabled configuration is validated before client use.

The Provider owns lifecycle and the command-service boundary. It exposes Provider-level `executeCommand(command)` while keeping transport and command internals private.

### Telnet Client and Readiness

`SevenDaysToDieTelnetClient` uses Node's built-in `node:net` API to open the raw TCP management connection.

Verified transport behavior includes:

- Password-authenticated readiness
- Direct-console readiness when the server does not present a password prompt
- Raw line framing across split and combined chunks
- Telnet control-byte and subnegotiation stripping
- UTF-8 preservation across chunk boundaries
- CRLF command writes
- Bounded connection readiness timeout
- One-time unexpected connection-loss notification
- Idempotent awaited disconnection

The Provider reports `RUNNING` only after console readiness is confirmed. Unexpected socket loss after readiness moves it to `ERROR`. Intentional shutdown remains `STOPPED`.

### Command-Response Boundary

The Provider owns one active command at a time through `SevenDaysToDieCommandService`.

The implemented response-start gate excludes stale startup-banner lines from the first command result. Incoming lines are classified and separated into command response lines and unsolicited event lines.

Evidence-backed deterministic completion exists for:

- `gettime`
- `listplayers`
- `lp`
- `say`
- `help`
- `kick`
- Invalid or unknown commands

Verified `kick` completion uses either:

```text
Kicking Player <name>: <reason>
```

or:

```text
"<target>" is not a valid entity id, player name or user id.
```

The command service completes on the verified terminal line. Later disconnect events, cleanup warnings, and engine stack traces are not included in the completed command result.

Unverified multiline output uses a bounded inactivity fallback after meaningful output begins.

Command results and failure contracts are immutable and defensive. Supported outcomes cover success, timeout, disconnect, write failure, completion-decision failure, size truncation, and generic execution failure.

The command execution boundary was live verified against a running 7 Days to Die V3.1.0 b13 server.

### Hosted Player Identifier Evidence

`listplayerids` exposes online player rows in the verified form:

```text
id=<entity id>, <player name>
```

The entity ID remained associated with the same saved player across reconnects and a clean server restart, but the server accepted it as a kick target only while the player was online. It is therefore an online administration target, not a globally durable account identity.

Steam and EOS identifiers remain the durable game-account identifiers for future offline ban, whitelist, cross-server, and identity-linking work.

### Discord Operations

The Discord Provider currently uses the command service for:

- `gettime` through `/game time`
- `listplayers` through `/game players`
- quoted `say` through `/game say`

`/game status` inspects Provider availability without executing a remote command.

The Provider has deterministic kick completion support, but `/game kick` is not yet registered or available through Discord.

### Security Boundary

Raw Telnet is unencrypted, administrative, and untrusted. It must remain on loopback, LAN, VPN, or another protected private path. It must not be exposed directly to the public internet.

Telnet passwords remain environment-only and outside tracked JSON.

### Current Exclusions

The current Provider and Discord integration do not include:

- Arbitrary console execution
- Discord-accessible hosted-player ban, kick, whitelist, or other administration workflows
- Cross-platform identity linking
- Continuous Discord and in-game chat bridging
- Economy-backed in-game purchases or rewards
- Command queues or simultaneous commands
- Multiple game servers
- Automatic process supervision

## Website Provider

`WebsiteProvider` is optional and disabled by default. When enabled, it binds only to the exact loopback host `127.0.0.1`; public binding is not implemented.

`WebsiteServer` owns HTTP transport and reports readiness only after listening succeeds. It retains tested startup-failure, unexpected-loss, bounded-shutdown, forced-connection-cleanup, and repeated-shutdown behavior.

### Authentication Boundary

Website authentication is disabled by default. When enabled, the Provider validates a canonical HTTPS public origin, Discord guild and client IDs, an environment-supplied Discord client secret, and bounded OAuth and session lifetimes.

The implemented OAuth boundary uses Discord authorization-code flow with PKCE S256, one-time state, browser binding, guild-membership enforcement, token revocation before RSF session creation, secure cookies, bounded in-memory attempts, and bounded in-memory sessions.

Website sessions and pending OAuth attempts do not survive Provider or process restart.

### Website Ticket Boundary

Creator-owned Ticket listing is the only implemented Website-to-Module capability. The Provider resolves the framework-loaded Tickets Module through a narrow service and returns only allowlisted creator-facing fields.

Ticket creation, detail views, messages, closing, staff workflows, Moderation, Economy, configuration, administration routes, frontend, persistent sessions, public binding, trusted-proxy behavior, and role-to-permission translation are not implemented.
