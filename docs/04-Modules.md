# Modules

## Active Modules

- Economy
- Moderation

## Economy Module

The Economy Module owns platform-neutral Economy business logic and in-memory state.

Verified responsibilities:

- Create and reuse accounts with a configurable starting balance
- Look up balances
- Credit and debit accounts with positive safe-integer amounts
- Transfer balances under `DISABLED`, `STAFF_ONLY`, or `EVERYONE` policies
- Enforce Module-level transfer authorization
- Record `CREDIT`, `DEBIT`, and `TRANSFER` transactions
- List all transactions or transactions involving one user
- Return paginated transaction history in newest-first order
- Grant configurable daily rewards and enforce configurable cooldowns
- Rank accounts by descending balance with deterministic user-ID tie ordering
- Validate configurable reward, cooldown, leaderboard, pagination, and transfer-policy settings
- Validate public user IDs as non-empty strings

Economy write operations validate the complete operation before committing state. Failed credits, debits, transfers, and daily claims leave balances, account count, daily claim timestamps, transaction history, ordering, and transaction IDs unchanged. Transaction IDs are sequential for successfully stored transactions.

Public account, transaction, configuration, leaderboard, daily-status, and claim results are defensive snapshots. Returned arrays and `Date` objects do not expose the Module's internal mutable instances.

Discord Economy commands resolve the framework-loaded Module instance through the Core Registry and Module Manager. The Module does not depend on Discord, and commands do not create a separate Economy instance.

Economy storage is in memory and is lost when the process stops. Database persistence belongs to v0.7.0. Database-backed operations will be required for multi-process atomicity, and future transaction pagination should query bounded database pages rather than loading every transaction. Leaderboard indexes or caches should be introduced only when persistence and measured scale justify them.

The Economy Module does not implement a shop, cross-platform identity mapping, a Discord `/transfer` command, or an administrative interface.

## Moderation Module

Verified responsibilities:

- Define supported actions
- Map actions to required permission identifiers
- Validate supported actions
- Create moderation audit records
- Store audit records in memory
- Return audit-record copies and counts
- Send formatted audit output through Core Logger

Supported actions:

```text
BAN
KICK
WARN
TIMEOUT
UNTIMEOUT
PURGE
```

Audit records are in-memory and are lost when the process stops.
