# Rogue Soldiers Framework Architecture

## Architectural Layers

RSF is organized into Core, Providers, Modules, and Shared.

## Core

Core coordinates lifecycle, configuration, events, logging, and framework-wide services. ANSI-aware terminal formatting is centralized in `src/core/Logger.js`.

## Providers

Providers integrate external platforms. Discord-specific clients, interactions, validation, hierarchy checks, API operations, and responses belong in the Discord Provider.

## Modules

Modules contain reusable business logic. Active Modules are Economy and Moderation.

## Shared

Shared contains reusable cross-layer objects. v0.4.0 implements moderation permission identifiers under `src/shared/permissions/`.

## Moderation Flow

```text
Discord slash command
    |
    v
Discord-specific validation
    |
    v
DiscordModerationGuard
    |
    v
Discord API action
    |
    v
ModerationModule.recordAction()
    |
    v
ModerationAuditRecord
    |
    v
Logger.moderationAudit()
```

## Architecture Change Rule

Recommend a major architectural change only when at least two are true:

- Long-term value
- Architectural improvement beyond naming
- Last practical opportunity
