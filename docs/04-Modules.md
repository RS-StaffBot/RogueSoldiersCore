# Modules

## Active Modules

- Economy
- Moderation
- Tickets

## Persistence Convention

Production Moderation, Economy, and Ticket state is SQLite-authoritative. Direct isolated Module construction defaults to an in-memory store implementing the same Module-specific contract.

Core applies the Module migrations before loading Modules:

```text
001_create_moderation_audit_records
002_create_economy_ledger
003_create_ticket_aggregate
```

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
- List all transactions or transactions involving one user
- Return paginated transaction history in newest-first order
- Grant configurable daily rewards and enforce configurable cooldowns
- Rank accounts by descending balance with deterministic user-ID tie ordering
- Validate configurable reward, cooldown, leaderboard, pagination, and transfer-policy settings
- Validate public user IDs as non-empty strings
- Persist production accounts, transactions, daily claims, bounded transaction pages, and leaderboard queries in SQLite
- Recover balances, history, claims, ordering, and transaction identity after restart

Economy write operations validate the complete operation before committing state. Failed credits, debits, transfers, and daily claims leave balances, account count, daily claim timestamps, transaction history, ordering, and transaction IDs unchanged. Production writes use one SQLite transaction, and transaction IDs are allocated only for successfully committed transaction rows.

Public account, transaction, configuration, leaderboard, daily-status, and claim results are defensive snapshots. Returned arrays and `Date` objects do not expose the Module's internal mutable instances.

Discord Economy commands resolve the framework-loaded Module instance through the Core Registry and Module Manager. The Module does not depend on Discord, and commands do not create a separate Economy instance.

SQLite is authoritative for production Economy state. Direct `EconomyModule` construction uses an in-memory implementation of the same store contract for isolated tests. Production transaction pagination uses bounded indexed queries, and leaderboards read durable balances in deterministic order without a second cache.

The Economy Module does not implement a shop, cross-platform identity mapping, a Discord `/transfer` command, or an administrative interface.

## Ticket Module

The Ticket Module owns platform-neutral Ticket business logic and authorization and validates state reconstructed through its store contract.

Verified responsibilities:

- Define the `OPEN` and `CLOSED` Ticket statuses and allow only `OPEN` to `CLOSED`
- Create immutable Ticket records with creator identity, optional assignee identity, status, and creation time
- Create immutable Ticket messages with author identity, content, and creation time
- Generate sequential Ticket and globally sequential Ticket message IDs
- Create and look up Tickets
- Count and list Tickets
- Filter Tickets by creator, status, assignee, or unassigned state
- Preserve deterministic Ticket creation order and per-Ticket message append order
- Close open Tickets without changing identity, creator, assignee, creation time, ordering, or the next Ticket ID
- Append messages to open Tickets and retain readable history after closing
- Assign, reassign, and unassign open Tickets
- Authorize creator-owned reads, messages, and closing
- Authorize staff operations through reusable Ticket permission identifiers
- Treat `tickets.administrate` as an administrative override
- Validate Ticket, actor, creator, assignee, message, status, date, and permission inputs
- Persist production Tickets, messages, status, assignment, ordering, and independent ID sequences in SQLite
- Recover the complete Ticket aggregate after restart
- Provide optional bounded Ticket and latest-message reads for Discord presentation paths

Ticket writes validate before committing and roll back forced storage failures. Failed creation, message, transition, and assignment operations preserve Ticket state, message history, ordering, and Ticket or message ID sequencing. Production writes use one SQLite transaction and do not report success before commit.

Public Ticket records and messages are frozen defensive snapshots, and returned arrays are independent. Callers cannot mutate Module state through public results.

Discord Ticket commands resolve the framework-loaded Module through the Core Registry and Module Manager. They do not instantiate another Ticket Module, access internal storage, or duplicate Ticket validation and authorization. Discord formatting and permission translation remain Provider responsibilities.

SQLite is authoritative for production Ticket state. Direct `TicketModule` construction uses an in-memory implementation of the same store contract. Independent committed SQLite sequences preserve public Ticket and message identity, creation order, append order, and restart continuation.

The Ticket Module does not implement Discord channels, threads, categories, permission overwrites, transcripts, configurable staff roles, external portals, web administration, reopening, deletion, attachments, priorities, escalation, or SLA systems.

## Moderation Module

Verified responsibilities:

- Define supported actions
- Map actions to required permission identifiers
- Validate supported actions
- Create moderation audit records
- Commit audit records through an injected Module-specific store
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

Production Moderation audit records are durable in SQLite and ordered by their stored append sequence. The Module validates business input, constructs immutable public records, commits storage before reporting success or logging the audit, and reconstructs and validates stored records during initialization and reads.

SQLite is authoritative for production Moderation audit state. Direct `ModerationModule` construction uses the same store contract with an in-memory implementation for isolated use and testing. Providers and commands do not access the store or database.

An invalid durable record causes Moderation initialization to fail rather than being silently accepted. Storage failures do not report success or emit a successful moderation audit log.

Moderation, Economy, and Ticket persistence has been verified across restart. Database transactions protect the durable facts owned by each Module but cannot roll back external Discord actions.
