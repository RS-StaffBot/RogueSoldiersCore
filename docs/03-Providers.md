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

`WebsiteAuthenticator` owns the Provider-local `authenticate(request)` boundary. It denies authentication while Website authentication is disabled. When enabled, it resolves opaque Website session cookies through the session store and returns an identity plus whether an invalid supplied session cookie must be cleared. The Website identity contains only `actorId`, `displayName`, and an empty `permissions` array.

### Discord OAuth and Session Boundaries

`DiscordOAuthClient` is the focused Discord OAuth protocol boundary. It builds the Discord authorization URL, exchanges authorization codes, fetches the current Discord user and configured guild member, and revokes OAuth authorization. It uses Node 22 built-in `fetch` and crypto behavior, normalizes failures without exposing secrets or Discord response bodies, and retains no OAuth token after callback completion.

`InMemoryWebsiteOAuthStateStore` holds bounded one-time OAuth attempts in memory. Each attempt uses separate state, PKCE verifier, and browser-binding values. Sensitive lookup values are stored as digests where implemented. The store enforces expiration, replay rejection, atomic consumption, and capacity, clears all attempts on shutdown, and does not persist attempts across restart.

`InMemoryWebsiteSessionStore` holds opaque Website sessions in memory. It stores token digests, frozen Website identity snapshots, and timestamps; enforces idle and absolute expiration; supports activity refresh, revocation, capacity enforcement, and shutdown clearing. Sessions do not survive Provider or process restart. No JWT or database session persistence exists.

`WebsiteCookieService` owns focused cookie parsing and serialization. The session cookie is `__Host-rsf_session`; the OAuth binding cookie is `__Secure-rsf_oauth_binding`. Both use `Secure`, `HttpOnly`, `SameSite=Lax`, an approved `Path`, integer `Max-Age`, and no `Domain`.

`WebsiteOAuthFlow` coordinates login initiation and callback processing. It uses Discord authorization-code OAuth with PKCE S256, one-time state, and browser binding. It enforces configured guild membership and rejects bots, system users, pending members, guest members, and non-members. It maps identity as:

```text
actorId = Discord user ID
displayName = guild nickname -> global name -> username
permissions = []
```

The flow revokes Discord OAuth authorization before creating an RSF session. Guild membership grants login eligibility only; it creates no Module permission or staff role mapping.

### Website Ticket Boundary

`WebsiteTicketService` is a focused Website Provider service that translates an authenticated Website identity into a creator-owned Ticket Module read.

The service resolves the framework-loaded `Tickets` Module through an injected Module Manager-backed resolver. It does not construct `TicketModule`, access Ticket stores, issue SQL, or depend on SQLite row formats.

The service supplies the authenticated `actorId` as both the Ticket creator and actor identity:

```text
creatorId = authenticated actorId
actorId = authenticated actorId
actorPermissions = authenticated permissions
```

It invokes `TicketModule.listTicketsForCreator` with fixed read options:

```text
limit = 20
offset = 0
latest = true
```

Request-controlled creator IDs, actor IDs, limits, offsets, status filters, and permission values are not accepted.

Successful responses contain only allowlisted creator-facing fields:

- `ticketId`
- `status`
- `createdAt`

Creator identity, assignee identity, messages, persistence details, and raw Ticket records are not exposed.

### Website Routes

- `GET /health` remains unauthenticated, reports transport readiness only, and makes no Discord or Module request.
- `GET /auth/discord` exists only when authentication is enabled. It creates state, PKCE, and browser binding, sets the binding cookie, and returns a `303` Discord authorization redirect.
- `GET /auth/discord/callback` validates and consumes state before Discord access, enforces browser binding, exchanges the code, verifies identity and membership, revokes the OAuth grant, creates an RSF session, and returns `303` to `/api/me`. It returns generic `400`, `401`, `403`, or `503` failures and clears the binding cookie on callback outcomes.
- `POST /auth/logout` requires the exact configured `Origin`. Missing or mismatched origins return `403`; valid requests revoke the session, clear cookies, return an empty `204`, and remain idempotent.
- `GET /api/me` uses the session-backed authenticator when enabled. Valid sessions receive the existing allowlisted `200` identity response. Missing or invalid sessions receive `401`; invalid supplied session cookies are cleared. Internal authentication failures return generic `503`.
- `GET /api/tickets` exists only when authentication and the Website Ticket service are enabled. It authenticates the session, binds the Ticket creator and actor to the authenticated identity, and returns an allowlisted creator-owned Ticket list. Missing or invalid sessions return `401`; invalid supplied session cookies are cleared. Authentication, Ticket Module availability, and Ticket operation failures return generic `503`.
- Non-`GET` requests to `/api/tickets` return `405` with `Allow: GET` without authenticating or invoking the Ticket Module.

### Authentication Configuration

`WebsiteAuthenticationConfiguration` is a Provider-local validator invoked during `WebsiteProvider` initialization. It validates configuration without network, database, Module, or Registry access and returns a frozen non-secret snapshot.

Authentication is disabled by default. While disabled, `publicOrigin` and `discordGuildId` may remain empty, and neither a Discord client ID nor a Discord client secret is required. The Website Provider can start, `GET /health` remains available, production `GET /api/me` remains deny-only, and authentication routes return `404`. No OAuth client, state store, session store, or OAuth flow is constructed.

When authentication is enabled, initialization requires:

- A canonical HTTPS public origin without credentials, a path, query, fragment, or trailing slash
- Valid positive Discord guild and client snowflake strings
- A non-empty `DISCORD_CLIENT_SECRET` from the environment
- A Discord request timeout and OAuth state, session idle, and session absolute lifetimes within their validated bounds
- A session absolute lifetime at least as long as the session idle lifetime

The callback URI is derived exactly as `<publicOrigin>/auth/discord/callback`. It is not configured separately and is not inferred from `Host`, `Forwarded`, or `X-Forwarded-*` request headers.

Invalid enabled configuration fails Provider initialization before the HTTP listener is started. Valid enabled configuration constructs the OAuth and session boundaries before listener startup.

Request-level Discord failures do not move `WebsiteProvider` to `ERROR`; unexpected transport loss retains existing `ERROR` behavior. Shutdown marks the OAuth flow as stopping, stops transport, and clears pending attempts and sessions.

### Current Boundaries

- Creator-owned Ticket listing is the only implemented Website-to-Module capability.
- Ticket creation, Ticket detail views, Ticket messages, closing, staff workflows, Moderation, Economy, configuration, and administration routes are not implemented.
- The Website Provider resolves only the framework-loaded Ticket Module through the narrow `WebsiteTicketService` boundary.
- The Website Provider does not access Module stores, database connections, SQL, or SQLite rows.
- No persistent session storage, frontend, public binding, trusted-proxy behavior, or role-to-permission translation exists.
- No public deployment has been completed.
- Live use requires a configured HTTPS reverse proxy and registered Discord callback. The loopback listener must not be exposed directly.
