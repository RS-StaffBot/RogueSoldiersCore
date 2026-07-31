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

The layer for small platform-neutral contracts and identifiers that are genuinely shared across architectural boundaries. It does not own platform integrations, Core lifecycle, or Module business state.

## Component

A named framework part with a focused responsibility and, where applicable, lifecycle behavior.

## Lifecycle

The ordered initialization, startup, running, stopping, stopped, and error behavior of framework components.

## Business Logic

Reusable rules, validation, authorization, state transitions, and domain behavior owned by Modules rather than platform Providers.

## Platform-Specific Behavior

Client APIs, protocol details, identity translation, permission translation, presentation, and other behavior tied to a Provider's platform.

## Discord Provider

The Provider that owns Discord login, slash-command registration, interaction dispatch, Discord permission and hierarchy checks, API operations, and Discord responses.

## Discord Game Command Authorizer

The Discord Provider service that applies the fixed `ManageGuild` requirement to the guild-only `/game` command family.

## Discord Game Server Provider Resolver

The Discord Provider service that resolves the framework-loaded `7 Days to Die` Provider and returns either a stable failure status or a frozen service exposing only `executeCommand`.

## `/game` Command Family

The guild-only Discord command family requiring `ManageGuild`:

- `/game status`
- `/game time`
- `/game players`
- `/game say message:<text>`
- `/game kick entity-id:<id> reason:<text>`
- `/game ban user-id:<Steam_...|EOS_...> duration:<number> unit:<choice> reason:<text> display-name:<text>`
- `/game unban display-name:<exact text>`
- `/game whitelist add user-id:<Steam_...|EOS_...> display-name:<text>`
- `/game whitelist remove user-id:<Steam_...|EOS_...> display-name:<text>`

## Hosted Player Administration

The v1.4.0 fixed Discord-to-game workflows for kicking an online player, adding a durable ban, verifying an unban, and adding or removing an individual whitelist entry.

These workflows remain Provider-owned platform administration and do not introduce a Module because no reusable cross-platform business policy has been proven.

## Online Entity ID

A positive 7 Days to Die entity ID used as an exact kick target while a player is online. It is not treated as a globally durable game-account identity.

## Durable User ID

A single combined game-account identifier using either `Steam_<id>` or `EOS_<id>`. Durable IDs are used for ban and individual whitelist administration.

## Verified Unban

The workflow that reads `ban list`, requires exactly one exact display-name match, removes the returned stored UserID, and reads `ban list` again to prove that UserID is absent.

A `removed from ban list` line confirms command completion only and is not sufficient verification.

## Individual Whitelist Entry

A durable Steam or EOS user identifier stored with a display name through the 7 Days to Die `whitelist` command.

The first entry activates whitelist-only mode. Removing the final entry disables whitelist-only mode. Duplicate add may return success without creating a duplicate row.

## Staff Platform Identifier Visibility

The decision that authorized staff may receive a requested player's Steam ID, EOS ID, or both through an explicit permission-gated private workflow when operationally necessary.

Ordinary command results do not expose those identifiers.

## Game Provider

A Provider for a hosted game server. It owns game clients, protocols, platform commands, and game events as those capabilities are implemented. The optional 7 Days to Die Provider is the first implemented game Provider.

## SevenDaysToDieProvider

The optional Provider that coordinates validated configuration, lifecycle, Telnet readiness, and Provider-level command execution for a 7 Days to Die server.

It exposes `executeCommand(command)` while retaining ownership of the command service and keeping Telnet, socket, credentials, and configuration private.

## SevenDaysToDieTelnetClient

The Provider-owned raw TCP client built on Node's `node:net` API.

It owns password-authenticated and direct-console readiness, Telnet protocol-byte stripping, UTF-8 line framing, CRLF writes, connection timeout, post-readiness connection-loss notification, and awaited idempotent disconnection.

## SevenDaysToDieCommandService

The Provider-owned service that executes one active command at a time, applies the response-start gate, separates command response lines from unsolicited event lines, applies evidence-backed completion rules, and returns immutable results or failures.

## Command-Response Boundary

The implemented evidence-backed rules that determine when a remote command response begins and completes and distinguish it from stale startup output and unsolicited console events.

Verified deterministic completion exists for `gettime`, `listplayers`, `lp`, `say`, `help`, `kick`, `ban add`, `ban remove`, `whitelist add`, `whitelist remove`, and invalid or unknown commands. Other meaningful multiline output uses bounded inactivity completion.

## Response-Start Gate

The command-service rule that prevents stale Telnet startup-banner lines from entering the first command result.

## Unsolicited Event

A game-server console line that is not part of the active command response. Events are classified and stored separately from response lines.

## Immutable Command Result

A defensive frozen result containing command status, completion reason, response lines, event lines, and truncation state without exposing mutable internal arrays.

## Deployment-Specific Configuration

Validated local configuration for the intended server deployment, including enabled state, private host, Telnet port, and connection timeout. Secrets remain environment-only.

## Raw Telnet

The unencrypted administrative TCP transport used by the 7 Days to Die Provider. It must remain on loopback, LAN, VPN, or another protected private path and must not be exposed directly to the public internet.

## Website Provider

The optional Provider that owns loopback HTTP transport, Discord OAuth integration, secure cookies, in-memory Website sessions, and the current creator-owned Ticket listing boundary.

## Website Authentication

The Discord OAuth authorization-code flow with PKCE S256, one-time state, browser binding, guild-membership checks, token revocation, and an opaque RSF Website session.

## Website Session

An opaque bounded in-memory session associated with a frozen Website identity. Website sessions are revoked on Provider shutdown or process restart and are not shared across processes.

## Registry

The Core-owned lookup boundary for registered framework services.

## Provider Manager

The Core Provider registry and lifecycle coordinator. Discord game commands do not receive it directly.

## Module Manager

The Core Module registry and lifecycle coordinator used by Providers to resolve framework-loaded Modules through narrow boundaries.

## SQLite Authority

The decision that production Moderation, Economy, Ticket, settings, and other implemented durable state use Core-managed SQLite while Modules retain business ownership.
