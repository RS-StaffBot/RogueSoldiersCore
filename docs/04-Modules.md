# Modules

## Active Modules

- Economy
- Moderation
- Tickets

## Persistence Convention

Production Moderation, Economy, and Ticket state is SQLite-authoritative. Direct isolated Module construction defaults to an in-memory store implementing the same Module-specific contract.

Modules retain validation, authorization, state transitions, public errors, public identities, and defensive public records. Stores own durable rows, parameterized SQL, explicit ordering, transactions, and restart recovery. Modules do not open database connections, and Providers and commands do not access stores.

## Economy Module

The Economy Module owns platform-neutral Economy business logic and validates state reconstructed through its store contract.

Verified responsibilities:

- Create and reuse accounts with a configurable starting balance
- Look up balances
- Credit and debit accounts with positive safe-integer amounts
- Transfer balances under `DISABLED`, `STAFF_ONLY`, or `EVERYONE` policies
- Enforce Module-level transfer authorization
- Record `CREDIT`, `DEBIT`, and `TRANSFER` transactions
- Return bounded, newest-first transaction history
- Grant configurable daily rewards and enforce configurable cooldowns
- Rank accounts by descending balance with deterministic user-ID tie ordering
- Validate configurable reward, cooldown, leaderboard, pagination, and transfer-policy settings
- Persist production accounts, transactions, daily claims, and ordering in SQLite
- Recover balances, history, claims, ordering, configuration overrides, and transaction identity after restart

### Configurable Economy Settings

v1.1 provides six validated Economy settings:

- `startingBalance`
- `dailyReward`
- `dailyCooldownMilliseconds`
- `leaderboardLimit`
- `transactionPageLimit`
- `transferPolicy`

Persisted overrides are resolved during Module loading. Invalid stored values fail startup rather than silently producing unsafe configuration.

Live settings mutations are coordinated through Core. Successful changes update persistence, audit history, and the running Economy Module as one logical operation. Failed persistence, audit, transaction completion, or partial runtime application restores the previous runtime value.

Changing `startingBalance` affects accounts created after the change. It does not rewrite existing balances or historical transactions.

The Economy Module does not expose an administrative interface. Discord and Website settings interfaces, role mapping, shops, cross-platform identity, and in-game purchases remain future work.

## Ticket Module

The Ticket Module owns platform-neutral Ticket business logic, creator ownership, staff authorization, immutable records, messages, assignment, status transitions, and SQLite persistence.

Ticket writes validate before committing and roll back forced storage failures. Public Ticket records and messages are frozen defensive snapshots. Discord Ticket commands resolve the framework-loaded Module and do not access storage directly.

The Ticket Module does not implement Discord channels, threads, categories, permission overwrites, transcripts, configurable staff roles, external portals, web administration, reopening, deletion, attachments, priorities, escalation, or SLA systems.

## Moderation Module

The Moderation Module owns supported action validation, reusable permission mapping, immutable audit records, persistence through its injected store, and formatted audit output through Core Logger.

Supported actions:

```text
BAN
KICK
WARN
TIMEOUT
UNTIMEOUT
PURGE
```

Production Moderation audit records are durable in SQLite. Storage failures do not report success or emit a successful moderation audit log.

## Settings Ownership Boundary

Modules own business validation and active business values. Core owns setting definitions, permissions, persistence, audit coordination, and live mutation orchestration.

A future interface must call Core settings services. It must not directly edit Module properties, Module stores, configuration files, or database rows.

Secret configuration does not belong to Module settings and cannot enter normal settings persistence or administration audit history.
