# Glossary

## Rogue Soldiers Framework

The Core, Provider, Module, and Shared ecosystem that powers Rogue Soldiers Clan operations.

## Core

Framework infrastructure that coordinates configuration, lifecycle, logging, events, registration, database access, and dependency startup and shutdown.

## Provider

A platform integration boundary. Providers own external clients, protocols, API calls, platform-specific validation, interactions, events, lifecycle, and presentation.

## Module

A platform-neutral owner of cohesive business rules, validation, authorization, domain records, and Module-specific persistence contracts.

## Shared

The layer for small platform-neutral contracts and identifiers that are genuinely shared across architectural boundaries.

## Component

A named framework part with a focused responsibility and, where applicable, lifecycle behavior.

## Lifecycle

The ordered initialization, startup, running, stopping, stopped, and error behavior of framework components.

## Lifecycle Status

A frozen privacy-safe snapshot of one registered component containing only approved runtime facts such as component type, trusted name, state, initialization status, and operational status.

## Lifecycle Operation Result

A frozen privacy-safe result describing a controlled component operation, its trusted target, sanitized outcome, resulting state, and success status.

## Lifecycle Operation Lock

The shared non-reentrant Core lock that serializes individual start, stop, restart, Provider replacement, and eligible reconnect work. Conflicting operations return `BUSY`.

## Controlled Restart

A serialized stop-then-start operation for one initialized running component with expected state verification and sanitized failure handling.

## Reconnect Policy

A Provider-owned bounded recovery policy for unexpected runtime connection loss. The 7 Days to Die implementation is opt-in, attempt-limited, delayed, cancellable, and protected by the lifecycle lock.

## Provider Reconstruction

Trusted Loader-owned construction of a new Provider instance from approved configuration. It does not accept arbitrary paths, class names, constructors, modules, or request-controlled Provider types.

## Atomic Provider Replacement

The ProviderManager transaction that proves a reconstructed candidate is initialized and running before stopping the existing Provider and replacing the registry entry.

The v1.6.0 implementation supports only the trusted `7 Days to Die` reconstruction path and accepts an initialized existing Provider in `RUNNING` or `ERROR`.

## Degraded Operation

The framework state in which Core, Database, and healthy unrelated components continue operating while one recoverable Provider or Module remains failed.

## Business Logic

Reusable rules, validation, authorization, state transitions, and domain behavior owned by Modules rather than platform Providers.

## Platform-Specific Behavior

Client APIs, protocol details, identity translation, permission translation, presentation, and other behavior tied to a Provider's platform.

## Discord Provider

The Provider that owns Discord login, slash-command registration, interaction dispatch, Discord permission and hierarchy checks, API operations, and Discord responses.

## Discord Game Command Authorizer

The Discord Provider service that applies the fixed `ManageGuild` requirement to the guild-only `/game` and `/lifecycle` command families.

## Discord Game Server Provider Resolver

The Discord Provider service that resolves the framework-loaded `7 Days to Die` Provider and returns either a stable failure status or a frozen service exposing only approved game-command execution.

## Discord Lifecycle Service

The frozen Discord boundary exposing only `getStatus()`, `restart()`, and `reload()` for the fixed `7 Days to Die` Provider target.

## `/game` Command Family

The guild-only Discord command family requiring `ManageGuild` for status, time, players, chat, kick, ban, unban, and individual whitelist administration.

## `/lifecycle` Command Family

The guild-only private Discord command family requiring `ManageGuild`:

- `/lifecycle status`
- `/lifecycle restart`
- `/lifecycle reload`

The family is fixed to the `7 Days to Die` Provider and cannot select arbitrary components or restart Discord itself.

## Hosted Player Administration

The fixed Discord-to-game workflows for kicking an online player, adding a durable ban, verifying an unban, and adding or removing an individual whitelist entry.

## Online Entity ID

A positive 7 Days to Die entity ID used as an exact kick target while a player is online. It is not a globally durable game-account identity.

## Durable User ID

A single combined game-account identifier using either `Steam_<id>` or `EOS_<id>`.

## Verified Unban

The workflow that reads `ban list`, requires exactly one exact display-name match, removes the returned stored UserID, and reads `ban list` again to prove that UserID is absent.

## Individual Whitelist Entry

A durable Steam or EOS user identifier stored with a display name through the 7 Days to Die `whitelist` command.

## Staff Platform Identifier Visibility

The decision that authorized staff may receive a requested player's Steam ID, EOS ID, or both through an explicit permission-gated private workflow when operationally necessary.

## Game Provider

A Provider for a hosted game server. It owns game clients, protocols, platform commands, and game events as implemented.

## SevenDaysToDieProvider

The optional Provider that coordinates validated configuration, lifecycle, Telnet readiness, command execution, identity proof collection, and bounded reconnect recovery for a 7 Days to Die server.

## SevenDaysToDieTelnetClient

The Provider-owned raw TCP client built on Node's `node:net` API.

## SevenDaysToDieCommandService

The Provider-owned service that executes one active command at a time, separates command responses from unsolicited events, applies evidence-backed completion rules, and returns immutable results or failures.

## Command-Response Boundary

The evidence-backed rules that determine when a remote command response begins and completes and distinguish it from stale startup output and unsolicited console events.

## Response-Start Gate

The command-service rule that prevents stale Telnet startup-banner lines from entering the first command result.

## Unsolicited Event

A game-server console line that is not part of the active command response.

## Immutable Command Result

A defensive frozen result containing command status, completion reason, response lines, event lines, and truncation state without exposing mutable internal arrays.

## Deployment-Specific Configuration

Validated local configuration for the intended server deployment. Secrets remain environment-only.

## Raw Telnet

The unencrypted administrative TCP transport used by the 7 Days to Die Provider. It must remain on loopback, LAN, VPN, or another protected private path.

## Website Provider

The optional Provider that owns loopback HTTP transport, Discord OAuth integration, secure cookies, in-memory Website sessions, and the current creator-owned Ticket listing boundary.

## Website Authentication

The Discord OAuth authorization-code flow with PKCE S256, one-time state, browser binding, guild-membership checks, token revocation, and an opaque RSF Website session.

## Website Session

An opaque bounded in-memory session associated with a frozen Website identity.

## Registry

The Core-owned lookup boundary for registered framework services.

## Provider Manager

The Provider registry and lifecycle coordinator. Provider-facing interfaces do not receive it directly.

## Module Manager

The Module registry and lifecycle coordinator used by Providers to resolve framework-loaded Modules through narrow boundaries.

## Audit and Activity Foundation

The active unreleased `v1.7.0` milestone for durable privacy-safe actor-attributed accountability records.

`v1.6.0` remains the latest released version. Current `main` contains unreleased `v1.7.0` Audit and Activity Foundation development. Phase 6 is merged development and is not part of the `v1.6.0` release.

## Audit Module

The platform-neutral Module that owns Audit record validation, action and actor/source/target/outcome rules, bounded allowlisted metadata, recording, bounded query policy, and its store contract.

## Audit Record

An immutable defensive RSF-generated accountability summary containing approved actor, source, action, target, outcome, timestamp, optional reference, and bounded allowlisted metadata.

## Audit Recording Boundary

A narrow workflow-specific capability used to submit validated accountability summaries without exposing the Audit Module or persistence internals.

## Audit Query Boundary

The frozen capability constructed privately by Core and supplied to Discord for restricted lookup. It exposes only `getById()` and `list()`.

## `/audit` Command Family

The guild-only private Discord command family requiring `ManageGuild` at registration and runtime:

- `/audit recent`
- `/audit record`

Responses are ephemeral, bounded, inertly rendered, mention-safe, and sanitized.

## Restricted Discord Audit Lookup

The Phase 6 capability that allows authorized staff to review bounded Audit summaries without exposing the Audit Module, stores, SQLite, SQL, database rows, raw failures, or mutable internals. Lookup does not self-record.

## Authoritative Business History

The detailed record owned by the responsible Module or Provider, such as Moderation history, Economy transactions, Ticket records and messages, Identity links, hosted-game results, or lifecycle state. Audit summaries do not replace it.

## Bounded Accountability Summary

A privacy-safe Audit record or query result containing only approved fields and allowlisted metadata within enforced limits.

## SQLite Authority

The decision that production Moderation, Economy, Ticket, settings, and other implemented durable state use Core-managed SQLite while Modules retain business ownership.
