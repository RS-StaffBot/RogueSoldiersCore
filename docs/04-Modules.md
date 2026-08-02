# Modules

## Active Modules

- Audit
- Economy
- Moderation
- Tickets
- Identity

## Persistence Convention

Production Audit, Moderation, Economy, Ticket, and Identity state is SQLite-authoritative. Direct isolated Module construction defaults to an in-memory store implementing the same Module-specific contract.

Core applies the Module migrations before loading Modules:

```text
001_create_moderation_audit_records
002_create_economy_ledger
003_create_ticket_aggregate
006_create_identity_links
007_create_audit_records
```

Modules retain validation, authorization, state transitions, public errors, public identities, and defensive public records. Stores own durable rows, parameterized SQL, explicit ordering, transactions, and restart recovery. Modules do not open database connections, and Providers and commands do not access stores.

## Audit Module

The Audit Module owns durable platform-neutral accountability summaries. It does not replace the detailed histories owned by Moderation, Economy, Tickets, Identity, or lifecycle state.

Verified responsibilities through PR `#98`:

- validate immutable defensive Audit records
- generate sequential `audit-N` record IDs and timestamps inside RSF
- validate fixed actor types, sources, outcomes, actions, target types, target identifiers, and bounded allowlisted metadata
- reject arbitrary metadata keys and unrestricted serialized objects
- record and reconstruct Audit records through one Module-specific store contract
- provide matching in-memory and SQLite stores
- persist production records through migration `007_create_audit_records`
- recover durable records and sequence continuation after restart
- return deterministic newest-first bounded pages
- support allowlisted actor-type, source, action, target-type, and outcome filters
- validate opaque continuation cursors
- expose frozen narrow recording and bounded-query services
- normalize storage failures at service boundaries without exposing raw internals

Core owns SQLite, ordered migration execution, Module construction, lifecycle loading, and private store injection. Providers and commands may receive only the narrow recording or query boundary approved for a workflow. They do not receive the Audit Module, store, SQLite connection, SQL, database rows, or mutable internals.

Implemented recording integrations through PR `#96` are:

- lifecycle `/lifecycle restart` and `/lifecycle reload`
- Discord `/ban`, `/kick`, `/warn`, `/timeout`, `/untimeout`, and `/purge`
- hosted-player `/game kick`, `/game ban`, `/game unban`, `/game whitelist add`, and `/game whitelist remove`
- Ticket staff `/ticket staff message`, `/ticket staff assign`, `/ticket staff unassign`, and `/ticket staff close`

The integrated workflows authenticate the Discord actor at the Provider boundary, use fixed action and target shapes, store only sanitized outcomes and allowlisted metadata, and treat Audit recording as best effort and non-blocking after the owning workflow determines its result. Successful moderation and Ticket summaries are recorded only after their authoritative Module mutations commit. Hosted-player summaries are recorded only after the authoritative Provider operation completes.

Existing Module and Provider-owned records remain authoritative. Audit records are bounded accountability summaries and do not replace Moderation history, Ticket records and messages, hosted-game command results, Identity links, Economy transactions, or lifecycle state.

Phase 6 consumes the Module-owned bounded query policy through a frozen Discord query boundary. Exact record lookup uses `getById()`; recent bounded lookup uses `list()`. Discord receives no Audit Module, store, SQLite connection, SQL, database rows, or mutable internals. Query operations do not create additional Audit records.

Audit records do not contain moderation reasons, Ticket message content, raw Discord responses, raw game-console output, credentials, addresses, configuration, sockets, stack traces, database rows, SQL, positions, health, inventory, or arbitrary request objects.

### Intentional Audit Exclusions

The following remain unaudited by design:

- ordinary read-only commands
- `/game status`
- `/game time`
- `/game players`
- `/game say`
- `/ticket staff list`
- `/ticket staff view`
- ordinary member Ticket workflows
- `/identity status`
- self-service `/identity link`

Configurable retention administration, Website Audit administration, external telemetry, general event sourcing, and logging every harmless interaction remain unimplemented.

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

The Economy Module does not expose a settings interface. Discord and Website settings interfaces, role mapping, Provider restart controls, cross-platform identity, shops, and in-game purchases remain future work.

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

Moderation audit details must use a plain object as the root. They may contain JSON-compatible `null`, strings, booleans, finite numbers, plain objects, and dense arrays. Details are independently copied and recursively frozen under the same contract in the in-memory and SQLite stores. Cycles, unsupported values, non-finite numbers, sparse arrays, accessors, symbol keys, and custom instances are rejected.

SQLite is authoritative for production Moderation audit state. Direct `ModerationModule` construction uses the same store contract with an in-memory implementation for isolated use and testing. Providers and commands do not access the store or database.

An invalid durable record causes Moderation initialization to fail rather than being silently accepted. Storage failures do not report success or emit a successful moderation audit log.

Moderation, Economy, and Ticket persistence has been verified across restart. Database transactions protect the durable facts owned by each Module but cannot roll back external Discord actions.

## Identity Module

The Identity Module owns the current narrow Discord-to-game identity-link business rules.

Verified responsibilities:

- validate Discord and durable Steam/EOS identifiers
- enforce one active link per Discord member
- enforce one active Discord owner per durable game identity
- represent pending, verified, and revoked link states
- validate durable state during Module initialization
- provide privacy-safe private owner status
- accept only exact internal verified-proof results
- create the first identity link directly as verified
- preserve creation and verification timestamps
- persist production links in SQLite
- recover verified links after framework restart
- reject conflicting ownership and malformed or ambiguous proof

The production store uses migration `006_create_identity_links`. Direct isolated Module construction uses an in-memory store implementing the same narrow persistence contract.

The current Module does not implement broad RSF-owned identities, multiple platform attachments, aliases, observations, game-first identity creation, automatic matching, merge execution, conflict-resolution interfaces, staff lookup, replacement, relinking, unlinking, or revocation workflows.

The future RSF Identity Hub direction is a separate architecture expansion. The existing `identity_links` table and verified links remain active compatibility sources until a tested migration and rollback path are approved.

## Settings Ownership Boundary

Modules own business validation and active business values. Core owns setting definitions, permissions, persistence, administration audit coordination, and live mutation orchestration.

A future administrative interface must call the validated Core settings services. It must not directly edit Module properties, Module stores, configuration files, or database rows.

Secret configuration does not belong to Module settings and cannot enter normal settings persistence or administration audit history.