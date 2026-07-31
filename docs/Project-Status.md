# Project Status

## Current Version

v1.4.0

## Current Milestone

v1.5.0 - Player Identity Linking Foundation

Status: Planning approved; Phase 1 is next.

## Milestone Goal

Create a secure, platform-neutral foundation that can associate one Discord member with durable hosted-game identities without exposing identifiers publicly or coupling identity ownership to Discord or 7 Days to Die.

The milestone establishes the trusted identity boundary required for future player-specific Economy rewards, game purchases, account history, staff administration, and other cross-platform workflows.

## Architecture Boundary

A new platform-neutral Identity Module is the intended owner of identity-link business rules, validation, authorization, conflict handling, lifecycle, and durable public records.

Core remains responsible for database lifecycle and migrations. A Module-specific store will own identity persistence without exposing SQL or the Core database connection to Providers.

The Discord Provider will own Discord command definitions, Discord authorization, interaction handling, private responses, and Discord identity translation.

The 7 Days to Die Provider will continue to own game-server protocol behavior and evidence used to verify game identities. It will not own cross-platform identity records or Discord membership policy.

Shared will receive reusable identity permissions or value contracts only when implementation proves actual cross-layer reuse.

## Phase 1 Objective

Inspect the current Module, SQLite store, migration, permission, and Provider-resolution patterns and define the smallest complete identity domain contract before implementing persistence or Discord commands.

Phase 1 must decide and test:

- the canonical Discord member identity input
- supported durable game identifier forms
- whether one Discord member may hold one or multiple game identities
- uniqueness and conflict rules across members
- verified, pending, revoked, and replaced state requirements
- who may create, confirm, view, replace, or revoke a link
- which identifier details ordinary members and authorized staff may see
- immutable public snapshots and defensive validation requirements
- the narrow store contract required for later SQLite persistence

Phase 1 is a design-and-contract phase only. It must not expose an incomplete linking command or persist partially defined records.

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
- Cross-platform identity linking is not yet implemented and is the active v1.5.0 milestone.
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

Complete the Phase 1 repository inspection and identity-domain contract. Only after that contract is reviewed and merged should persistence or Discord linking commands begin.

## Release Notes

See `docs/Release-Notes-v1.4.0.md`.
