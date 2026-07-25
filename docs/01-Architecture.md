# Rogue Soldiers Framework Architecture

## Purpose

This document defines the verified high-level architecture of Rogue Soldiers Framework.

The repository remains the implementation source of truth.

Documentation describes the intended responsibilities and the implementation that has been proven to work.

---

## Architectural Layers

RSF is organized into four primary architectural areas:

- Core
- Providers
- Modules
- Shared

---

## Core

Core coordinates framework infrastructure.

Core currently provides:

- Component lifecycle behavior
- Component states
- Framework-wide service registration
- Event dispatch infrastructure
- Logging access

Core should not contain Discord-specific behavior or community business rules.

---

## Providers

Providers integrate external platforms or systems.

The active Provider is:

- Discord

Provider responsibilities may include:

- Connecting to an external platform
- Translating framework requests into platform API operations
- Receiving platform events
- Managing platform-specific services
- Managing platform client lifecycle

Providers do not own general community business rules.

---

## Modules

Modules contain business logic.

The currently loaded Module is:

- Economy

The current Economy Module is a lifecycle component only. It does not yet implement persistent economy behavior.

Future Modules may include:

- Moderation
- Tickets
- Expanded economy features

Modules should remain independent of Discord-specific implementation whenever practical.

---

## Shared

Shared is reserved for reusable framework objects that do not belong exclusively to Core, Providers, or Modules.

The current Shared structure contains directories for:

- Errors
- Events
- Models
- Permissions
- Utilities

These directories currently contain no implemented classes.

They must not be documented as operational systems until files are added and tested.

---

## Application Startup Flow

The verified startup flow is:

```text
src/index.js
    |
    v
Application.start()
    |
    v
Bootstrap.start()
    |
    v
ConfigurationManager.load()
    |
    v
Core services registered
    |
    v
Providers loaded, initialized, and started
    |
    v
Modules loaded, initialized, and started
    |
    v
Framework startup summary logged
```

---

## Framework Registry

Bootstrap registers the following framework-wide services:

- `logger`
- `config`
- `eventBus`
- `providers`
- `modules`

The Core Registry prevents duplicate service names.

It throws an error when an unknown service is requested.

---

## Component Lifecycle

Providers and Modules inherit lifecycle behavior from `BaseComponent`.

The lifecycle states are:

- `CREATED`
- `INITIALIZING`
- `READY`
- `STARTING`
- `RUNNING`
- `STOPPING`
- `STOPPED`
- `ERROR`

The current managers call lifecycle methods in this order:

```text
register
    |
    v
initialize
    |
    v
start
```

Shutdown support exists through component and manager `stop` methods, although coordinated application shutdown is not yet implemented.

---

## Dependency Direction

The intended dependency direction is:

```text
Application
    |
    v
Bootstrap
    |
    v
Core coordination
    |
    v
Providers and Modules
```

Platform-specific code remains in Providers.

Business logic remains in Modules.

Reusable cross-layer objects may be placed in Shared when an implemented feature requires them.

---

## Discord Command Architecture

The final verified Discord command architecture is documented in `03-Providers.md`.

At a high level:

```text
DiscordProvider coordinates
    |
    v
CommandLoader creates commands
    |
    v
CommandRegistry stores commands
    |
    v
CommandRegistrar registers definitions
    |
    v
InteractionHandler executes runtime interactions
```

There is one active Discord Command Registry and one runtime interaction path.

---

## Architecture Change Rule

Architectural changes should only be recommended when at least two of the following are true:

- The change provides long-term value.
- The change improves the architecture.
- This is the last practical opportunity to make the change.

Otherwise, implementation should continue within the existing architecture.

---

## Repository-First Rule

Do not assume that a documented or previously discussed class exists.

Before implementation:

1. Review the relevant documentation.
2. Review the repository structure.
3. Read the required existing files.
4. Confirm the current implementation.
5. Propose changes.
6. Wait for approval when required.
7. Implement one working phase at a time.
