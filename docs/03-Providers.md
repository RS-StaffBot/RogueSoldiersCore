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

The Provider coordinates configuration, lifecycle, and `SevenDaysToDieTelnetClient`. The client uses Node's built-in `node:net` API to open the game server's raw TCP management connection, submit the Telnet password after the verified prompt, and wait for confirmed authentication and console readiness. The Provider reports `RUNNING` only after that readiness completes. Shutdown awaits an idempotent client disconnection.

Raw TCP management traffic is unencrypted. It must use loopback, a LAN, a VPN, or another protected private path rather than exposing the Telnet service or password to the public internet.

The current Provider does not execute administrative commands, parse players or server events, perform player administration, connect Discord to the game, or invoke Economy behavior. Automated coverage uses handwritten client and socket fakes and does not require a live game server.

### Command Execution Deferral

Administrative command execution is deferred. Current official documentation does not define a deterministic command-response terminator or reliable isolation between command output and unsolicited server logs. Implementation must wait until deployment-specific evidence establishes response completion boundaries, unsolicited-log filtering behavior, server-version and hosting compatibility, and safe command-timeout behavior.

A direct single-command client operation remains the preferred future shape. No response marker or prompt has been approved, and no command queue, command coordinator, generic command framework, or guessed delimiter is implemented.

### Future Configuration Boundary

A future validated web administration interface may collect game-server connection settings and deployment-specific console information. It must invoke validated RSF configuration operations rather than edit source files directly. Telnet passwords or secret references must remain outside tracked JSON.

This is future architecture only. No web interface, Website Provider responsibility, configuration persistence design, or live deployment workflow is currently implemented. Game-server protocol and command behavior remain owned by the 7 Days to Die Provider, and command execution must remain unavailable until its connection and response-boundary requirements are satisfied.

Reusable moderation, Economy, authorization, transaction, and cross-platform business policy remains Module-owned. Game Providers must invoke validated Module operations and must not directly access Module database tables.
