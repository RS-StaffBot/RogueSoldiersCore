# Project Status

## Current Version

v1.4.0

## Current Milestone

v1.5.0 - Player Identity Linking Foundation

Status: Phases 1-4 and Phases 5A-5C completed; private Discord self-link and owner-status commands are next.

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

## Current Phase Objective

Add the smallest private Discord identity command family through the merged Provider and Module boundaries.

The next phase must implement and test:

- a guild-only `/identity status` workflow using only the invoking Discord member's identity
- a guild-only `/identity link` workflow requiring a supported durable Steam/EOS identifier
- cryptographically strong short-lived challenge generation inside the Discord Provider
- a private or ephemeral instruction telling the member to send the challenge in normal in-game global chat
- deferred private interaction handling while the Provider collects proof
- Provider evidence evaluation through the merged exact proof evaluator
- durable verified-link creation only after exact verification
- safe conflict, timeout, unavailable-Provider, malformed-input, and already-linked responses
- no platform identifiers in ordinary success, status, or failure responses
- complete command-definition, registration, dispatch, privacy, and regression coverage

Replacement, unlinking, revocation, and staff lookup remain separate explicit workflows.

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
- The optional 7 Days to Die Provider supports one active command or proof collection at a time through private raw Telnet.
- Hosted player administration is available through Discord.
- Identity contracts, records, persistence, proof evaluation, live proof collection, Module registration, private owner status, and proof-gated verified-link mutation are implemented.
- Discord identity commands, staff identity workflows, replacement, and revocation are not yet implemented.

## v1.4.0 Release Record

- Release pull request: `#56`
- Release merge commit: `8d9b7c9b50bdff7cab612e3905da7606c13f27e9`
- Annotated tag: `v1.4.0`
- Release validation: 0 production vulnerabilities, 435 passing tests, ESLint passing, and `git diff --check` clean

## Next Step

Implement and test private Discord `/identity status` and first-link workflows through the merged proof collector, evaluator, and Identity Module mutation boundary.

## Release Notes

See `docs/Release-Notes-v1.4.0.md`.
