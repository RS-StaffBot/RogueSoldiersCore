# Project Status

## Current Version

v0.8.0

## Current Milestone

v0.9.0 - Website Provider

Status: In Progress

## Last Completed Milestone

v0.8.0 - 7 Days to Die Provider

Status: Completed

## Previous Completed Milestone

v0.7.0 - Database

Status: Completed

## Verified v0.4.0 Implementation

- Moderation Module lifecycle integration
- Moderation action definitions
- Moderation permission identifiers
- Discord permission enforcement
- Discord moderation guard
- Self-target, owner, hierarchy, and manageability checks
- `/ban`, `/kick`, `/warn`, `/timeout`, `/untimeout`, and `/purge`
- In-memory moderation audit records
- Audit logging for all implemented moderation actions
- Centralized multiline audit output
- Colored terminal logging and plain-text fallback
- ESLint configuration
- Version synchronization to `0.4.0`
- Synchronized v0.4.0 documentation
- Final milestone verification

## Verified v0.5.0 Implementation

- Economy accounts with configurable starting balances
- Balance lookup, credits, debits, and authorized transfers
- `DISABLED`, `STAFF_ONLY`, and `EVERYONE` transfer policies
- Economy permission identifiers
- Credit, debit, and transfer transaction records
- Full and user-filtered transaction history
- Newest-first transaction pagination with configurable limits
- Configurable daily rewards and cooldowns
- Leaderboards with deterministic tie ordering and configurable limits
- Atomic in-memory writes and sequential successful transaction IDs
- Defensive account, transaction, configuration, array, and `Date` snapshots
- Consistent non-empty user-ID validation
- `/balance`, `/daily`, and `/leaderboard`
- Final Economy regression and startup verification

## Verified v0.6.0 Implementation

- Framework-loaded Ticket Module lifecycle
- `OPEN` and `CLOSED` statuses with the `OPEN` to `CLOSED` transition
- Immutable Ticket records, optional assignee identity, and immutable Ticket messages
- In-memory Ticket storage and per-Ticket append-only message history
- Module-generated sequential Ticket and globally sequential message IDs
- Ticket creation, lookup, count, listing, and creator, status, assignee, and unassigned filtering
- Ticket closing, assignment, reassignment, and unassignment
- Creator-owned Ticket reads, messages, and closing
- Reusable Ticket permission identifiers, staff authorization, and administrative override
- Atomic in-memory writes with failed-operation state and ID-sequence preservation
- Deterministic creation and append ordering
- Defensive frozen record and message snapshots with independent public arrays
- `/ticket create`, `/ticket list`, `/ticket view`, `/ticket message`, and `/ticket close`
- `/ticket staff list`, `/ticket staff view`, `/ticket staff message`, `/ticket staff assign`, `/ticket staff unassign`, and `/ticket staff close`
- Fixed Discord `ManageMessages` staff translation and `Administrator` override translation
- Twelve total Discord commands
- Final Ticket, command, permission-translation, lifecycle, and startup verification

## Verified v0.7.0 Implementation

- Core-owned `DatabaseService`, `DatabaseMigrationManager`, and `DatabaseMigrationLoader`
- SQLite through Node's built-in `node:sqlite` API
- One private Core-owned connection with health checks and controlled shutdown
- Foreign keys and file-backed write-ahead logging
- Ordered transactional migrations tracked in `rsf_schema_migrations`
- `001_create_moderation_audit_records`
- `002_create_economy_ledger`
- `003_create_ticket_aggregate`
- Controlled Module-specific store construction without exposing the raw connection
- SQLite-authoritative production state with in-memory stores for direct isolated Module construction
- Durable Moderation audit records with deterministic ordering and restart recovery
- Durable Economy accounts, balances, transactions, transfers, daily claims, pagination, leaderboards, and transaction IDs
- Durable Tickets, messages, status, assignment, ordering, and independent Ticket and message IDs
- Transactional multi-row writes and failed-operation sequence preservation
- Validated durable reconstruction and initialization failure for unsafe durable state
- Bounded Discord-facing Ticket lists and latest-message reads
- Providers, commands, and Shared remain persistence-blind
- Twelve total Discord commands preserved
- Final Database, Moderation, Economy, Ticket, Discord, startup, and shutdown verification

## v0.7.0 Boundaries

- SQLite supports the current single-process deployment boundary.
- `node:sqlite` is synchronous and remains an active-development API on Node 22.
- Startup validation reads complete durable Module state where required.
- Very large datasets may require optimized validation and additional bounded queries.
- Database transactions cannot roll back external Discord actions.
- Backup and restore tooling, remote hosting, replication, clustering, operational maintenance, and database administration remain future work.
- Cross-platform identity remains future work.
- Economy shops and Discord transfers remain future work.
- Discord Ticket channels, threads, transcripts, configurable staff roles, and related infrastructure remain future work.
- Game-server integration was outside v0.7.0; its initial Provider boundary was completed in v0.8.0.

## v0.7.0 Completion

The Database milestone is implementation-complete, tested, documented, and versioned in the repository files.

## Verified v0.8.0 Implementation

- Optional `SevenDaysToDieProvider`, disabled by default
- Conditional `ProviderLoader` integration after Discord
- Raw TCP connectivity through Node's built-in `node:net` API
- Telnet password submission and confirmed authentication and console readiness
- Whole-handshake connection timeout and secret-safe failure messages
- Unexpected post-readiness connection-loss propagation to Provider `ERROR`
- Intentional shutdown that remains `STOPPED`
- Awaited and idempotent client disconnection
- Handwritten client and socket fakes covering lifecycle, readiness, failure, loss, and cleanup
- Automated verification without a live game server

## v0.8.0 Boundaries

- Administrative command execution is not implemented.
- Player lookup, kick, ban, unban, whitelist, and other player administration are not implemented.
- Discord-to-game and game-to-Discord communication are not implemented.
- Economy rewards or purchases that produce in-game effects are not implemented.
- Reconnect behavior and multiple-server management are not implemented.
- Live web-based configuration is not implemented.
- Raw TCP management must use loopback, a LAN, a VPN, or another protected private path.
- Command response handling requires deployment-specific evidence for completion boundaries, unsolicited-log filtering, server-version and hosting compatibility, and safe timeouts.

## Verified v0.9.0 Implementation In Progress

- Optional `WebsiteProvider`, disabled by default
- Conditional `ProviderLoader` integration after Discord and the optional 7 Days to Die Provider
- Exact production binding to `127.0.0.1`
- HTTP lifecycle through Node's built-in `node:http` API
- Truthful listening readiness, startup failure propagation, and unexpected server-loss handling
- Awaited, bounded, and idempotent shutdown
- Unauthenticated `GET /health` transport-readiness route
- Provider-local `WebsiteAuthenticator` contract with disabled deny-only and enabled session-backed behavior
- Discord OAuth authorization-code login with PKCE S256
- Browser-bound one-time OAuth state with replay protection
- Rogue Soldiers guild-membership enforcement
- Bot, system, pending, guest, and non-member rejection
- OAuth token revocation before RSF session creation
- Opaque in-memory Website sessions with idle and absolute expiration
- Secure session and OAuth binding cookies
- Session-backed `GET /api/me` with allowlisted identity responses
- Exact-Origin `POST /auth/logout`
- Provider-local `WebsiteAuthenticationConfiguration` validation during initialization
- Disabled-by-default authentication configuration that requires no deployment values
- Conditional validation of canonical HTTPS origin, Discord guild and client IDs, environment-only client secret, and bounded OAuth and session lifetimes
- Exact callback derivation as `<publicOrigin>/auth/discord/callback`
- Frozen non-secret authentication configuration snapshots
- Invalid enabled configuration rejected before the HTTP listener starts
- Valid enabled authentication construction before listener startup

- Shutdown clearing of pending OAuth attempts and active sessions
- Provider-local `WebsiteTicketService` boundary
- Narrow Module Manager-backed resolution of the framework-loaded `Tickets` Module
- Authenticated creator-owned `GET /api/tickets`
- Authenticated identity bound as both Ticket creator and actor
- Fixed newest-first Ticket listing with a maximum of 20 results
- Allowlisted Ticket responses containing only `ticketId`, `status`, and `createdAt`
- Disabled authentication constructs no Ticket service and leaves the route hidden
- Missing and invalid sessions rejected with `401`
- Ticket availability and operation failures normalized to generic request-level `503`
- No direct Website store, SQL, database, or SQLite-row access
- 227 passing automated tests without a live Discord service or public listener

## v0.9.0 Current Boundaries

- Authentication remains disabled by default.
- No public deployment exists, and RSF does not implement reverse-proxy or TLS configuration.
- OAuth and session behavior require an HTTPS reverse proxy, registered Discord callback, and real deployment values before live use.
- Sessions and pending OAuth attempts are lost on Provider shutdown or process restart; persistent sessions are not implemented.
- Creator-owned Ticket listing is the only implemented Website-to-Module operation.
- Ticket creation, detail views, messages, closing, staff workflows, Moderation, Economy, configuration, and administration routes are not implemented.
- The Website Provider does not access Module stores, SQL, database connections, or SQLite rows.
- Staff permission translation and cross-platform identity are not implemented.
- Frontend behavior, public network exposure, trusted-proxy behavior, and settings interfaces are not implemented.
- `GET /health` reports Website transport readiness only and does not authenticate requests or resolve Modules.
- Repository version remains v0.8.0 while v0.9.0 is in progress.