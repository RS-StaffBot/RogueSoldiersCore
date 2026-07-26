# Glossary

## Economy Module

The platform-neutral Module that owns Economy accounts, balances, transfers, transactions, daily rewards, leaderboards, validated settings, and in-memory state integrity.

## Economy Account

An in-memory record identified by a non-empty user ID with a non-negative safe-integer balance and creation date.

## Economy Transaction

An in-memory `CREDIT`, `DEBIT`, or `TRANSFER` record with a sequential successful transaction ID, validated amount, reason, resulting balance data, and creation date.

## Economy Transfer Policy

The Module setting that controls transfers: `DISABLED`, `STAFF_ONLY`, or `EVERYONE`.

## Daily Reward

A configurable Economy credit that a user may claim after the configured cooldown has elapsed.

## Leaderboard

A ranked defensive snapshot of Economy accounts ordered by descending balance and then user ID for deterministic ties.

## Transaction Pagination

The Economy Module API that returns bounded, newest-first transaction pages with page metadata. Future database-backed pagination should retrieve bounded database results instead of loading every transaction.

## Defensive Snapshot

An independently mutable account, transaction, configuration, array, or `Date` result that does not expose the Economy Module's internal state.

## Atomic In-Memory Write

An Economy operation that either commits all related in-memory balance, account, daily claim, transaction, and ID changes or leaves all of them unchanged on failure. Multi-process atomicity requires future database support.

## Ticket Module

The platform-neutral Module that owns Ticket records, messages, assignment, status transitions, creator ownership, staff authorization, ID generation, and in-memory state integrity.

## Ticket Record

An immutable record containing a Ticket ID, creator identity, optional assignee identity, `OPEN` or `CLOSED` status, and creation time.

## Ticket Status

The current Ticket state. v0.6.0 supports `OPEN` and `CLOSED`, with only the `OPEN` to `CLOSED` transition.

## Ticket Message

An immutable, append-only Ticket history entry containing a globally sequential message ID, Ticket ID, author identity, content, and creation time.

## Ticket Creator

The identity that creates a Ticket and owns its creator-authorized operations.

## Ticket Assignee

An optional identity recorded as responsible for an open Ticket. Assignment alone grants no Ticket authority.

## Creator-Owned Ticket Operation

A Ticket read, message, or closing operation that its creator may perform without a staff permission.

## Ticket Permission

A reusable `tickets.*` identifier used by `TicketModule` to authorize staff operations independently of Discord permissions.

## Ticket Assignment

The Module-owned operation that assigns, reassigns, or unassigns an open Ticket.

## Ticket Message History

The per-Ticket, append-ordered collection of immutable messages. Closed Ticket history remains readable.

## Defensive Frozen Snapshot

An immutable Ticket record or message copied from internal state. Public arrays containing snapshots are independent from Module storage.

## Atomic In-Memory Ticket Write

A Ticket operation that either commits its complete in-memory record, history, and ID-sequence change or leaves all related state unchanged on failure. Multi-process atomicity requires future database support.

## Discord Ticket Permission Translation

The Provider process that maps Discord permissions into reusable Ticket permission identifiers before `TicketModule` makes the final authorization decision. The v0.6.0 mapping is fixed and non-configurable.

## Moderation Module

The Module that owns supported moderation actions, action-to-permission mapping, audit-record creation, and in-memory audit storage.

## Moderation Action

A supported operation: `BAN`, `KICK`, `WARN`, `TIMEOUT`, `UNTIMEOUT`, or `PURGE`.

## Moderation Permission

A reusable permission identifier required by a moderation action. The Discord Provider translates it into Discord permission checks.

## DiscordModerationGuard

A Discord Provider service that centralizes target safety, hierarchy, manageability checks, and action wording.

## Moderation Audit Record

An in-memory record containing action, guild, moderator, optional target, reason, and details.

## Moderation Audit

The formatted terminal output produced for a successfully recorded moderation action.

## Logger

The Core class responsible for log categories, ANSI terminal colors, and plain-text fallback.

## Audit Persistence

Future storage of audit records outside process memory. Not implemented in v0.4.0.

## Economy Persistence

Future storage of Economy accounts, balances, claims, and transactions outside process memory. It belongs to the v0.7.0 Database milestone and is not implemented in v0.5.0.

## Ticket Persistence

Future storage of Tickets, messages, assignments, and ID sequences outside process memory. It belongs to the v0.7.0 Database milestone and is not implemented in v0.6.0.

## Discord Ticket Infrastructure

Future channel, thread, category, permission-overwrite, transcript, and configurable-role workflows. They are not implemented in v0.6.0.
