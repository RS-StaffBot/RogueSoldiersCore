# Providers

## Discord Provider

The Discord Provider owns Discord clients, interactions, REST registration, Discord permission checks, hierarchy checks, manageability checks, API operations, and Discord responses.

## Verified Commands

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

Ticket responses are ephemeral. Creator and staff lists display at most 20 Tickets and report any remainder. Staff Ticket views display at most the latest five messages, normalize message whitespace, and truncate long displayed content.

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
