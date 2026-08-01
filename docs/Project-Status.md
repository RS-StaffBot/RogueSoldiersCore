# Project Status

## Current Version

v1.5.0

## Current Milestone

v1.5.0 - Player Identity Linking Foundation

Status: Release closeout in progress; implementation and required live verification are complete.

## Milestone Goal

Create a secure, platform-neutral foundation that can associate one Discord member with a durable hosted-game identity without exposing identifiers publicly or coupling identity ownership to Discord or 7 Days to Die.

The milestone establishes the trusted identity boundary required for future player-specific Economy rewards, game purchases, account history, staff administration, and other cross-platform workflows.

## Architecture Boundary

The Identity Module owns identity-link business rules, validation, authorization, conflict handling, lifecycle, private owner status, proof-gated verified-link mutation, and durable identity records.

Core remains responsible for database lifecycle and migrations. Module-specific stores own identity persistence without exposing SQL or the Core database connection to Providers.

The Discord Provider owns Discord command definitions, Discord authorization, interaction handling, private responses, challenge generation, and Discord identity translation.

The 7 Days to Die Provider owns game-server protocol behavior and sanitized evidence used to verify game identities. It does not own cross-platform identity records or Discord membership policy.

Shared contains reusable identity permissions required across Module and Provider boundaries.

## Completed v1.5.0 Work

### Phase 1 - Identity Domain Contract

Completed through pull request `#59`.

Implemented and verified:

- canonical fields `discordUserId` and `gameUserId`
- supported durable identifiers `Steam_...` and `EOS_...`
- one active link per Discord member
- one active owner per durable game identity
- pending, verified, and revoked states
- atomic revoke-and-pend replacement semantics
- private-by-default identifier visibility
- reusable identity permissions
- narrow persistence contract

### Phase 2 - Immutable Records and In-Memory Store

Completed through pull request `#60`.

Implemented and verified:

- frozen statuses and focused errors
- immutable validated records
- defensive in-memory storage
- active Discord and game identity uniqueness
- stale-state detection
- atomic replacement and rollback

### Phase 3 - SQLite Persistence

Completed through pull request `#61`.

Implemented and verified:

- migration `006_create_identity_links`
- SQLite identity-link persistence
- partial unique indexes for active identities
- defensive reads and ordered listing
- transactional replacement and rollback
- restart recovery
- synchronized migration-order coverage

### Phase 4 - Fail-Closed 7DTD Proof Contract

Completed through pull request `#63`.

Implemented and verified:

- short-lived in-game challenge requirement
- one exact durable Steam/EOS identifier and challenge match
- sanitized evidence fields limited to `gameUserId`, `challenge`, and `observedAt`
- five-minute evidence lifetime
- immediate disposal requirement after evaluation
- rejection of missing, malformed, stale, future, and ambiguous evidence
- explicit rejection of display names and online entity IDs as sufficient proof

### Phase 5A - Identity Module and Private Owner Status

Completed through pull request `#64`.

Implemented and verified:

- framework-loaded `Identity` Module
- in-memory store for direct construction
- SQLite store injection when a framework database is available
- durable-state validation during Module initialization
- frozen private owner-status results
- ordinary status output limited to approved status and timestamp fields
- no Steam, EOS, or Discord identifiers in owner-status results

### Phase 5B - 7DTD Provider Proof Collection

Completed through pull request `#66`.

Implemented and verified:

- parsing of the live global-chat event that contains durable Steam/EOS identity and the exact short-lived challenge
- temporary unsolicited-event collection without free-form Telnet
- exact case-sensitive durable-ID and challenge matching
- sanitized output limited to `gameUserId`, `challenge`, and `observedAt`
- rejection of unrelated chat, wrong identities, malformed lines, timeout, and disconnect
- command execution and proof collection serialized through one active Provider operation
- no use of `listplayers`, `listplayerids`, display names, or entity IDs as ownership proof

### Phase 5C - Proof-Gated Verified Link Mutation

Completed through pull request `#67`.

Implemented and verified:

- `IdentityModule.recordVerifiedSelfLink(...)`
- exact internal verified-proof requirement
- first identity link created directly as `VERIFIED`
- one verification timestamp used for creation and verification
- active Discord-user and game-identity uniqueness preserved
- malformed, unsuccessful, ambiguous, or expanded proof objects rejected
- replacement and relinking intentionally excluded from self-link creation

### Phase 5D - Private Discord Owner Status

Completed through pull request `#69`.

Implemented and verified:

- guild-only `/identity status`
- ephemeral responses only
- invoking Discord member identity derived from the interaction
- narrow Discord-to-Identity Module resolver
- safe unlinked, pending, and verified status formatting
- no Discord, Steam, or EOS identifiers in ordinary responses
- safe unavailable, stopped, and malformed boundary behavior

### Phase 5E - Private Discord Self-Link

Completed through pull request `#70`.

Implemented and verified:

- guild-only `/identity link user-id:<Steam_...|EOS_...>`
- cryptographically random short-lived challenge generation
- private instruction to send the exact challenge in 7 Days to Die global chat
- deferred ephemeral interaction handling while proof is collected
- narrow Discord-to-7DTD proof Provider resolver
- exact proof evaluation before persistence
- first verified link recorded only after exact `VERIFIED` proof
- submitted Steam/EOS identifier never repeated in Discord output
- fail-closed behavior for invalid input, existing active links, unavailable boundaries, timeout, disconnect, malformed or ambiguous proof, and persistence conflicts

### Resilient Startup Isolation

Completed through pull request `#72`.

Implemented and verified:

- every registered Provider and Module is initialized and started independently
- failed components remain registered in `ERROR`
- a component that fails initialization is not started
- healthy unrelated components remain `RUNNING`
- recoverable component failure produces `STARTED_DEGRADED` rather than total framework rollback
- Manager lifecycle summaries are frozen and exclude raw internal errors
- healthy Modules, Providers, and Database remain active after recoverable failures
- Core, Loader-wide, migration, health, and Database startup failures remain fatal
- shutdown preserves Providers -> Modules -> Database ordering with mixed `RUNNING` and `ERROR` states

Automatic retry and reconnect policy, independent component status, start, stop, restart, configuration-backed reload, safe replacement, restricted administration, and process supervision remain future work.

### Release-Hardening Corrections

Completed through pull requests `#74` and `#75`.

Implemented and verified:

- recoverable Provider and Module lifecycle errors no longer expose stack traces, local paths, socket details, credentials, or raw internal exceptions
- the exact active challenge received from a different durable Steam/EOS identifier ends collection immediately and fails closed
- mismatched proof no longer waits for the full five-minute timeout
- temporary proof listeners and timers are removed when collection ends

## Release Verification

Required v1.5.0 live verification is complete:

- `/identity status` registered and returned private owner-only status
- `/identity link` registered and returned private challenge instructions
- the exact challenge was observed through 7 Days to Die global chat
- an exact Steam identity was verified and persisted
- the verified link survived framework restart
- an already-linked member was rejected without generating another challenge
- normal `/game status` and `/game time` operations worked after proof collection
- optional 7 Days to Die Provider failure left Discord, the Database, and healthy Modules running in degraded mode
- recoverable lifecycle logs did not expose stack traces, local paths, socket details, credentials, or raw Provider errors

The current v1.5 implementation remains the narrow first-link compatibility foundation. Replacement, relinking, unlinking, revocation, staff lookup, broad account attachment, and identity merging remain future work.

## Required Privacy and Safety Boundaries

- Platform identifiers are private operational data by default.
- Ordinary public Discord responses must not reveal Steam IDs, EOS IDs, raw Telnet output, IP addresses, positions, health, inventory, credentials, paths, socket details, or internal errors.
- Identity commands must use private or ephemeral responses.
- The invoking Discord member identity must come from the Discord interaction, never from request-controlled input.
- A Discord member must not be able to claim another member's already-linked durable game identity.
- Display names and online entity IDs are not sufficient proof of durable identity.
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
- Website identity administration unless separately approved
- Generic identity support for unimplemented platforms
- automatic component retries or reconnect policy
- independent component status, start, stop, restart, configuration-backed reload, and safe replacement
- restricted lifecycle administration or process supervision

## Latest Completed Milestone

### v1.4.0 - Hosted Player Administration

Completed command family:

- `/game kick entity-id:<id> reason:<text>`
- `/game ban user-id:<Steam_...|EOS_...> duration:<number> unit:<choice> reason:<text> display-name:<text>`
- `/game unban display-name:<exact text>`
- `/game whitelist add user-id:<Steam_...|EOS_...> display-name:<text>`
- `/game whitelist remove user-id:<Steam_...|EOS_...> display-name:<text>`

## Current Production Boundaries

- RSF supports a single-process SQLite deployment.
- Node.js 22.13 or newer is required for `node:sqlite`.
- Recoverable Provider and independently recoverable Module startup failures are isolated; healthy components remain active and Bootstrap reports `STARTED_DEGRADED`.
- Core, Loader-wide, migration, health, and Database startup failures remain fatal.
- The optional 7 Days to Die Provider supports one active command or proof collection at a time through private raw Telnet.
- Hosted player administration is available through Discord.
- Identity contracts, records, persistence, proof evaluation, live proof collection, Module registration, private owner status, proof-gated verified-link mutation, and private Discord first-link commands are implemented and live verified.
- Staff identity workflows, replacement, relinking, unlinking, revocation, and broad Identity Hub behavior remain future work.

## v1.4.0 Release Record

- Release pull request: `#56`
- Release merge commit: `8d9b7c9b50bdff7cab612e3905da7606c13f27e9`
- Annotated tag: `v1.4.0`
- Release validation: 0 production vulnerabilities, 435 passing tests, ESLint passing, and `git diff --check` clean

## Next Step

Complete final automated validation, merge the v1.5.0 release pull request, and create the annotated `v1.5.0` tag.

## Release Notes

See `docs/Release-Notes-v1.5.0.md`.
