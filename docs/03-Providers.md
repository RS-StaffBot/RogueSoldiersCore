# Providers

## Discord Provider

The Discord Provider owns Discord clients, interactions, REST registration, Discord permission checks, hierarchy checks, manageability checks, API operations, and Discord responses.

Initialization prepares the Discord client, commands, and interaction handling. The Provider may report `RUNNING` only after login readiness and slash-command registration succeed. Missing configuration, login failure, readiness failure, or registration failure propagates to framework startup and leaves the Provider in `ERROR`. Shutdown awaits client destruction.

## Verified Commands

The Discord Provider loads exactly 12 unique commands:

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

## Economy Commands

The Discord Provider implements three Economy-facing commands:

- `/balance` resolves a selected Discord user, or the invoking user, and displays the balance returned by the Economy Module.
- `/daily` requests a daily reward and formats successful and cooldown responses.
- `/leaderboard` requests ranked Economy entries and formats them for Discord.

These commands translate Discord interactions and format responses. Economy accounts, balances, rewards, cooldowns, transactions, settings, and leaderboard rules remain in `EconomyModule`.

Each Economy command resolves the framework-loaded Economy Module through the Core Registry and Module Manager. The commands do not instantiate `EconomyModule`.

## Ticket Command

The Discord Provider implements one `/ticket` command with creator-owned subcommands:

- `/ticket create`
- `/ticket list`
- `/ticket view`
- `/ticket message`
- `/ticket close`

The command also provides a staff subcommand group:

- `/ticket staff list`
- `/ticket staff view`
- `/ticket staff message`
- `/ticket staff assign`
- `/ticket staff unassign`
- `/ticket staff close`

Ticket responses are ephemeral. Creator and staff lists request at most 20 Tickets from the Module and report any remainder. Staff Ticket views request at most the latest five messages, normalize message whitespace, and truncate long displayed content.

Discord user IDs are translated into Ticket actor, creator, author, and assignee identities. Discord permissions are translated into reusable Ticket permission identifiers, while final validation and authorization remain in `TicketModule`. Discord mentions, timestamps, response wording, and presentation limits belong to the Provider.

The command resolves the framework-loaded Ticket Module through the Core Registry and Module Manager. It does not instantiate `TicketModule` or access its internal storage. The current workflow does not create Discord channels, threads, categories, permission overwrites, or transcripts.

## DiscordModerationGuard

Verified location:

```text
src/providers/discord/services/DiscordModerationGuard.js
```

The guard centralizes Discord-specific safety checks and wording for ban, kick, timeout, and untimeout actions.

Checks include:

- Self-target prevention
- Server-owner protection
- Moderator role hierarchy
- Bot role hierarchy
- Target manageability
- Action-specific rejection wording

## Boundary

Discord-specific behavior remains in the Provider. Reusable moderation actions, Economy and Ticket business operations, permission identifiers, authorization, and audit-record behavior remain outside the Provider.

Providers and commands are persistence-blind. They resolve framework-loaded Modules and do not access Module stores, issue SQL, construct database connections, or depend on SQLite row formats.

## 7 Days to Die Provider

`SevenDaysToDieProvider` is an optional game-server Provider and is disabled by default. `ProviderLoader` omits it when its configuration is missing or disabled, so absent connection values are safe while it is disabled. Connection values are validated only when the Provider is enabled.

The Provider coordinates configuration, lifecycle, and `SevenDaysToDieTelnetClient`. The client uses Node's built-in `node:net` API to open the game server's raw TCP management connection, submit the Telnet password after the verified prompt, and wait for confirmed authentication and console readiness within the configured connection timeout. The Provider reports `RUNNING` only after that readiness completes.

An unexpected socket error or closure after readiness moves the Provider to `ERROR` through a one-time client notification. Intentional shutdown does not create an error state, removes live connection listeners, and awaits idempotent client disconnection.

Raw TCP management traffic is unencrypted. It must use loopback, a LAN, a VPN, or another protected private path rather than exposing the Telnet service or password to the public internet.

The current Provider does not execute administrative commands, parse players or server events, perform player administration, connect Discord to the game, or invoke Economy behavior. Automated coverage uses handwritten client and socket fakes and does not require a live game server.

### Command Execution Deferral

Administrative command execution is deferred. Current official documentation does not define a deterministic command-response terminator or reliable isolation between command output and unsolicited server logs. Implementation must wait until deployment-specific evidence establishes response completion boundaries, unsolicited-log filtering behavior, server-version and hosting compatibility, and safe command-timeout behavior.

A direct single-command client operation remains the preferred future shape. No response marker or prompt has been approved, and no command queue, command coordinator, generic command framework, or guessed delimiter is implemented.

### Future Configuration Boundary

A future validated web administration interface may collect game-server connection settings and deployment-specific console information. It must invoke validated RSF configuration operations rather than edit source files directly. Telnet passwords or secret references must remain outside tracked JSON.

This is future architecture only. The current Website Provider does not expose game-server configuration, persist configuration changes, or provide a live administration workflow. Game-server protocol and command behavior remain owned by the 7 Days to Die Provider, and command execution must remain unavailable until its connection and response-boundary requirements are satisfied.

Reusable moderation, Economy, authorization, transaction, and cross-platform business policy remains Module-owned. Game Providers must invoke validated Module operations and must not directly access Module database tables.

## Website Provider

`WebsiteProvider` is optional and disabled by default. When enabled, `ProviderLoader` adds it after Discord and the optional 7 Days to Die Provider. Production configuration requires the exact loopback host `127.0.0.1`; public binding is not implemented.

`WebsiteServer` uses Node's built-in `node:http` API and reports readiness only after listening succeeds. It retains the tested Provider lifecycle behavior for startup failure, unexpected post-readiness server loss, bounded shutdown, forced connection cleanup, and repeated safe shutdown.

The server currently exposes two fixed routes:

- `GET /health` is unauthenticated and reports Website transport readiness only.
- `GET /api/me` invokes the Website authentication boundary.

`WebsiteAuthenticator` defines the Provider-local `authenticate(request)` boundary. The production implementation intentionally denies every request by returning no authenticated identity. Automated tests may inject `FakeWebsiteAuthenticator` to prove deterministic authenticated responses without providing a production login mechanism.

An injected authenticated identity must contain a non-empty actor ID, a non-empty display name, and an array of non-empty permission strings. `WebsiteServer` normalizes duplicate permissions, creates a frozen defensive snapshot, and returns only allowlisted identity fields. Invalid or missing identities return `401`, unsupported `/api/me` methods return `405`, and authenticator operational failures return a generic `503` without changing Website Provider transport state.

### Authentication Configuration

`WebsiteAuthenticationConfiguration` is a Provider-local validator invoked during `WebsiteProvider` initialization. It validates configuration without network, database, Module, or Registry access and returns a frozen non-secret snapshot.

Authentication is disabled by default. While disabled, `publicOrigin` and `discordGuildId` may remain empty, and neither a Discord client ID nor a Discord client secret is required. The Website Provider can start, `GET /health` remains available, and production `GET /api/me` continues to deny authentication. Login and callback routes are not implemented.

When authentication is enabled, initialization requires:

- A canonical HTTPS public origin without credentials, a path, query, fragment, or trailing slash
- Valid positive Discord guild and client snowflake strings
- A non-empty `DISCORD_CLIENT_SECRET` from the environment
- A Discord request timeout and OAuth state, session idle, and session absolute lifetimes within their validated bounds
- A session absolute lifetime at least as long as the session idle lifetime

The callback URI is derived exactly as `<publicOrigin>/auth/discord/callback`. It is not configured separately and is not inferred from `Host`, `Forwarded`, or `X-Forwarded-*` request headers.

Invalid enabled configuration fails Provider initialization before the HTTP listener is started. Valid enabled configuration also fails closed with `Website authentication is configured but is not implemented.` until real Discord authentication exists.

This authentication contract and configuration validation are not working end-user login. Discord OAuth authorization, OAuth state handling, callback handling, sessions, cookies, logout, production authenticated identities, CORS, Module and Registry access, stores, database access, frontend behavior, public network exposure, settings interfaces, and permission translation remain unimplemented.
