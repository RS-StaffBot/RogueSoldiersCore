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

## Economy Commands

The Discord Provider implements three Economy-facing commands:

- `/balance` resolves a selected Discord user, or the invoking user, and displays the balance returned by the Economy Module.
- `/daily` requests a daily reward and formats successful and cooldown responses.
- `/leaderboard` requests ranked Economy entries and formats them for Discord.

These commands translate Discord interactions and format responses. Economy accounts, balances, rewards, cooldowns, transactions, settings, and leaderboard rules remain in `EconomyModule`.

Each Economy command resolves the framework-loaded Economy Module through the Core Registry and Module Manager. The commands do not instantiate `EconomyModule`.

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

Discord-specific behavior remains in the Provider. Reusable moderation actions, Economy business operations, permission identifiers, and audit-record behavior remain outside the Provider.
