# Project Status

## Current Version

v1.4.0

## Current Milestone

v1.5.0 - Player Identity Linking Foundation

Status: Phases 1-3 completed; Phase 4 is next.

## Milestone Goal

Create a secure, platform-neutral foundation that can associate one Discord member with durable hosted-game identities without exposing identifiers publicly or coupling identity ownership to Discord or 7 Days to Die.

The milestone establishes the trusted identity boundary required for future player-specific Economy rewards, game purchases, account history, staff administration, and other cross-platform workflows.

## Architecture Boundary

The platform-neutral Identity Module is the intended owner of identity-link business rules, validation, authorization, conflict handling, lifecycle, and durable public records.

Core remains responsible for database lifecycle and migrations. Module-specific stores own identity persistence without exposing SQL or the Core database connection to Providers.

The Discord Provider owns Discord command definitions, Discord authorization, interaction handling, private responses, and Discord identity translation.

The 7 Days to Die Provider owns game-server protocol behavior and evidence used to verify game identities. It does not own cross-platform identity records or Discord membership policy.

Shared contains the reusable identity permission contract required across Module and Provider boundaries.

## Completed v1.5.0 Work

### Phase 1 - Identity Domain Contract

Completed and merged through pull request `#59`.

Implemented and verified:

- canonical Discord member identity field: `discordUserId`
- durable game identity field: `gameUserId`
- supported durable forms: `Steam_...` and `EOS_...`
- one active link per Discord member
- one active owner per durable game identity
- pending, verified, and revoked states
- atomic revoke-and-pend replacement semantics
- private-by-default identifier visibility
- purpose-limited reusable identity permissions
- focused immutable contract tests

### Phase 2 - Immutable Records and In-Memory Store

Completed and merged through pull request `#60`.

Implemented and verified:

- frozen identity-link statuses
- focused identity-link error codes
- immutable validated identity-link records
- defensive in-memory storage and retrieval
- active Discord and game identity uniqueness enforcement
- stale-state detection
- atomic replacement with rollback

### Phase 3 - SQLite Persistence

Completed and merged through pull request `#61`.

Implemented and verified:

- migration `006_create_identity_links`
- SQLite identity-link persistence
- partial unique indexes for active Discord and game identities
- defensive reads and ordered listing
- transactional revoke-and-pend replacement
- rollback on failed replacement
- restart recovery
- synchronized global migration-order coverage

## Current Phase Objective

Phase 4 must define the verified 7 Days to Die identity-proof workflow using evidence-backed fixed operations only.

Phase 4 must determine and test:

- the exact fixed Provider operation used to obtain durable identity evidence
- which sanitized evidence fields cross the Provider boundary
- how one exact durable game identity is selected
- how ambiguous, missing, stale, or malformed evidence fails closed
- how proof is associated with the requesting Discord member without trusting display names alone
- what data is retained or discarded after verification
- how raw Telnet output, unrelated player data, and internal errors remain private

Phase 4 must not expose a self-link command until the proof contract is complete and tested.

## Required Privacy and Safety Boundaries

- Platform identifiers are private operational data by default.
- Ordinary public Discord responses must not reveal Steam IDs, EOS IDs, raw Telnet output, IP addresses, positions, health, inventory, credentials, paths, socket details, or internal errors.
- Authorized staff access must be explicit, permission-gated, purpose-limited, and private or ephemeral.
- A Discord member must not be able to claim another member's already-linked durable game identity.
- Display names alone are not sufficient proof of durable identity.
- Automatic fuzzy matching is prohibited.
- Raw game-server output must not become the Identity Module's public record format.
- Identity linking must fail closed when ownership or verification is ambiguous.

## Outside v1.5.0

- Economy purchases or automatic reward delivery
- Continuous Discord and in-game chat bridging
- General player statistics or telemetry
- Multiple game servers
- Arbitrary console execution or free-form Telnet
- Public identifier lookup
- Automatic account merging
- Fuzzy player matching
- Website identity administration unless separately approved during the milestone
- Generic identity support for unimplemented platforms

## Latest Completed Milestone

### v1.4.0 - Hosted Player Administration

The milestone added a narrow, authorized Discord interface for administering individual players on the hosted 7 Days to Die server without exposing arbitrary console execution.

Completed command family:

- `/game kick entity-id:<id> reason:<text>`
- `/game ban user-id:<Steam_...|EOS_...> duration:<number> unit:<choice> reason:<text> display-name:<text>`
- `/game unban display-name:<exact text>`
- `/game whitelist add user-id:<Steam_...|EOS_...> display-name:<text>`
- `/game whitelist remove user-id:<Steam_...|EOS_...> display-name:<text>`

The Discord Provider owns slash-command definitions, Discord authorization, interaction handling, input validation, response deferral, safe result parsing, and user-facing formatting.

The 7 Days to Die Provider owns Telnet communication, command execution, deterministic completion rules, event separation, timeout behavior, connection failures, and single-active-command enforcement.

Live verification passed against 7 Days to Die V3.1.0 b13 with Discord connected, 13 commands registered, the game Provider running, whitelist add and duplicate add succeeding, final removal disabling whitelist-only mode, missing removal returning safely, and the final whitelist state empty.

## Current Production Boundaries

- RSF supports a single-process SQLite deployment.
- Node.js 22.13 or newer is required for `node:sqlite`.
- The optional 7 Days to Die Provider supports one active command at a time through private raw Telnet.
- Kick, ban, verified unban, whitelist add, and whitelist remove are available through Discord.
- The v1.5 identity contract, immutable records, in-memory store, migration, and SQLite store are implemented.
- Operational Discord-to-game identity verification and linking commands are not yet implemented.
- Continuous chat bridging, Economy-backed game effects, command queues, and multiple game servers remain future work.

## v1.4.0 Release Record

- Release pull request: `#56`
- Release merge commit: `8d9b7c9b50bdff7cab612e3905da7606c13f27e9`
- Annotated tag: `v1.4.0`
- Release validation: 0 production vulnerabilities, 435 passing tests, ESLint passing, and `git diff --check` clean

## Previous Release Record

- v1.3.0 release pull request: `#43`
- v1.3.0 release merge commit: `71e476641bb5026dfa4d41dbd88131db2326800b`
- Annotated tag: `v1.3.0`

## Next Step

Define and test the Phase 4 evidence-backed 7 Days to Die identity-proof contract. Do not add Discord self-link commands until that Provider evidence boundary is reviewed and merged.

## Release Notes

See `docs/Release-Notes-v1.4.0.md`.
