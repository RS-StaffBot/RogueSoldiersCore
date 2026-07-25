# Decision Log

## Purpose

This document records significant long-term architectural decisions for Rogue Soldiers Framework.

Routine implementation details do not belong here.

---

## Discord Is a Provider

### Decision

Discord integration belongs in the Provider layer.

### Reason

Discord is an external platform.

Discord-specific clients, interactions, events, and API operations belong in the Discord Provider.

Reusable business logic belongs inside Modules.

---

## Shared Layer Added

### Decision

Reusable models, events, permissions, errors, and utilities belong in Shared when actual cross-layer reuse requires them.

### Reason

These objects should not be owned exclusively by Core, Providers, or Modules.

The existence of a Shared directory does not mean that every planned Shared system is already implemented.

---

## Stable Documentation Structure

### Decision

Project documentation is maintained alongside the repository and serves as the documented source of truth.

### Reason

Architecture, milestone status, terminology, coding standards, and long-term decisions must remain available across development sessions.

When documentation and tested repository behavior conflict, the repository is authoritative and the documentation must be corrected.

---

## Architecture Change Rule

### Decision

Major architectural changes are made only when at least two of the following are true:

- The change provides long-term value.
- The change improves the architecture beyond naming.
- This is the last practical opportunity to make the change.

### Reason

The framework should avoid unnecessary restructuring, renaming, and implementation churn.

---

## Milestone Workflow

### Decision

Every milestone follows this sequence:

```text
Design
    |
    v
Implement
    |
    v
Test
    |
    v
Git Commit
    |
    v
Update Documentation
    |
    v
Final Verification
    |
    v
Tag Milestone
```

### Reason

Each milestone must leave the repository working, tested, documented, and recoverable through Git.

---

## Single Discord Command Architecture

### Decision

The Discord command framework uses:

- One active Command Registry
- One runtime interaction handler
- One slash-command registration service
- One command-loading path

The active registry is:

```text
src/providers/discord/services/CommandRegistry.js
```

### Responsibilities

`DiscordProvider` coordinates Discord client lifecycle and command-framework startup.

`CommandLoader` constructs command instances.

`CommandRegistry` stores and validates command instances.

`InteractionHandler` owns runtime `interactionCreate` dispatch.

`CommandRegistrar` owns Discord REST slash-command registration.

### Registration Flow

```text
CommandLoader
    |
    v
DiscordProvider
    |
    v
CommandRegistry
    |
    v
CommandRegistrar
    |
    v
Discord REST API
```

### Runtime Flow

```text
Discord interaction
    |
    v
InteractionHandler
    |
    v
CommandRegistry
    |
    v
command.execute()
```

### Reason

The v0.3.0 implementation contained overlapping command responsibilities and duplicate registry paths.

v0.3.1 consolidated these responsibilities so future Discord commands use one predictable architecture.
