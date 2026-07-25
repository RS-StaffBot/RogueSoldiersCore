# Glossary

## Purpose

This glossary defines the terminology used throughout Rogue Soldiers Framework.

Definitions must reflect the tested repository and approved architecture.

Terms describing future systems must be clearly identified as planned or unimplemented.

---

## Rogue Soldiers Framework

Rogue Soldiers Framework, abbreviated RSF, is the central software foundation for the Rogue Soldiers Clan ecosystem.

RSF is intended to coordinate Discord features, community Modules, game-server Providers, and future website integration without combining everything into one large bot implementation.

---

## Core

The framework infrastructure that coordinates lifecycle, configuration, logging, events, and framework-wide services.

Core must remain independent of Discord-specific behavior and reusable community business rules.

Verified location:

```text
src/core/
```

---

## Provider

A component that integrates RSF with an external platform or system.

Examples include:

- Discord
- A game server
- A website
- A future storage system

Providers may own:

- Platform clients
- Platform APIs
- Platform events
- Platform-specific validation
- Platform lifecycle behavior

Providers do not own reusable community business rules.

---

## Discord Provider

The active Provider that integrates RSF with Discord.

It owns the Discord client and coordinates Discord-specific command components.

Verified location:

```text
src/providers/discord/
```

The Discord Provider must not absorb moderation, economy, or ticket business rules that belong in Modules.

---

## Module

A component that contains community business logic.

Examples include:

- Economy
- Moderation
- Tickets

Modules should remain independent of Discord-specific implementation whenever practical.

Verified foundation location:

```text
src/modules/
```

---

## Business Logic

Rules and workflows that define how a community feature behaves.

Examples may include:

- Whether a moderation action is allowed
- How a warning is recorded
- How an economy reward is calculated
- How a ticket changes status

Reusable business logic belongs in Modules rather than Providers.

---

## Platform-Specific Behavior

Code that depends on an external platform or API.

Discord examples include:

- Reading an interaction
- Sending an interaction reply
- Checking Discord API requirements
- Registering slash commands
- Performing Discord API operations

Platform-specific behavior belongs in the relevant Provider.

---

## Shared

The architectural area reserved for reusable objects that do not belong exclusively to Core, Providers, or Modules.

Verified directory categories include:

- Errors
- Events
- Models
- Permissions
- Utilities

These directories must not be treated as implemented systems merely because they exist.

Verified location:

```text
src/shared/
```

---

## Component

A class that participates in the RSF lifecycle.

Components may support:

- `initialize()`
- `start()`
- `stop()`
- Error state
- Status reporting

Providers and Modules inherit shared lifecycle behavior from `BaseComponent`.

---

## Lifecycle

The ordered states and methods used to initialize, start, stop, and report the condition of framework components.

Current lifecycle states include:

```text
CREATED
INITIALIZING
READY
STARTING
RUNNING
STOPPING
STOPPED
ERROR
```

---

## Bootstrap

The startup coordinator for RSF.

Bootstrap loads configuration, registers Core services, loads Providers and Modules, starts them, and logs framework status.

Verified location:

```text
src/bootstrap/Bootstrap.js
```

Bootstrap coordinates the framework but must not absorb Provider-specific or Module-specific behavior.

---

## Configuration Manager

The component that loads JSON configuration and environment variables.

Verified location:

```text
src/configuration/ConfigurationManager.js
```

Configuration values may be retrieved through dot-separated paths.

---

## Core Registry

The framework-wide service registry.

It stores services such as:

- Logger
- Configuration
- EventBus
- Provider Manager
- Module Manager

Verified location:

```text
src/core/Registry.js
```

The Core Registry is separate from the Discord Command Registry.

---

## Discord Command Registry

The single active registry that stores Discord command instances.

Verified location:

```text
src/providers/discord/services/CommandRegistry.js
```

It validates commands, prevents duplicate command names, retrieves commands, lists commands, and provides command definitions for slash-command registration.

---

## Registry

A component that stores and retrieves named objects.

RSF currently has two distinct registry responsibilities:

- Core Registry: stores framework-wide services
- Discord Command Registry: stores Discord command instances

The term `Registry` should not be used without enough context to identify which registry is meant.

---

## Provider Manager

The component that stores and coordinates registered Providers.

Verified location:

```text
src/providers/core/ProviderManager.js
```

Its responsibilities include Provider registration, initialization, startup, shutdown, listing, and retrieval.

---

## Provider Loader

The component that constructs the Providers participating in framework startup.

Verified location:

```text
src/providers/core/ProviderLoader.js
```

Automatic Provider discovery is not currently implemented.

---

## Module Manager

The component that stores and coordinates registered Modules.

Verified location:

```text
src/modules/core/ModuleManager.js
```

Its responsibilities include Module registration, initialization, startup, shutdown, listing, and retrieval.

---

## Module Loader

The component that constructs the Modules participating in framework startup.

Verified location:

```text
src/modules/core/ModuleLoader.js
```

Automatic Module discovery is not currently implemented.

---

## BaseCommand

The shared contract for Discord slash-command classes.

Verified location:

```text
src/providers/discord/commands/BaseCommand.js
```

A command provides:

- Slash-command metadata through `data`
- Command behavior through `execute(interaction)`

---

## Command Class

A class that defines one Discord slash command.

Current verified command classes include:

- `PingCommand`
- `HelpCommand`

A command class owns command-specific metadata and execution behavior.

It must not coordinate Provider startup, command storage, or slash-command registration.

---

## CommandLoader

The component that constructs Discord command instances.

Verified location:

```text
src/providers/discord/commands/CommandLoader.js
```

Current flow:

```text
CommandLoader
    |
    v
Command instances
    |
    v
DiscordProvider
    |
    v
CommandRegistry
```

Automatic filesystem command discovery is not currently implemented.

---

## CommandRegistrar

The service that owns Discord REST slash-command registration.

Verified location:

```text
src/providers/discord/services/CommandRegistrar.js
```

It receives command definitions from the Discord Command Registry and registers them with Discord.

DiscordProvider coordinates when registration occurs.

CommandRegistrar owns how registration is performed.

---

## InteractionHandler

The component that owns runtime Discord command dispatch.

Verified location:

```text
src/providers/discord/handlers/InteractionHandler.js
```

It listens for Discord interactions, resolves commands through the Discord Command Registry, executes commands, and handles command failures.

There should be only one active `interactionCreate` dispatch path.

---

## Slash Command

A Discord application command invoked with a leading slash.

Current verified slash commands are:

- `/ping`
- `/help`

Future commands must use the consolidated Discord command architecture.

---

## Command Registration

The process of sending slash-command definitions to Discord.

Current verified flow:

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

---

## Command Dispatch

The process of receiving a Discord interaction and executing its matching command.

Current verified flow:

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

---

## EventBus

The basic in-memory event infrastructure provided by Core.

Verified location:

```text
src/core/EventBus.js
```

It currently supports:

- Registering listeners
- Emitting event values
- Listing stored event names

Concrete application events are not yet implemented.

---

## Event

A notification that something has happened.

RSF currently has EventBus infrastructure but no verified concrete business-event definitions.

A name such as `UserBanned` is only a conceptual future example unless a matching repository implementation exists.

---

## Permission

An authorization rule controlling whether a user, role, member, or system may perform a protected action.

RSF does not yet have a completed permission framework.

Discord platform permissions and a future RSF business-permission model are related but distinct concepts.

---

## Discord Permission

A permission supplied by Discord through roles, members, guild ownership, or permission flags.

Discord permissions are platform-specific data.

Their existence does not mean RSF already has a complete reusable permission system.

---

## Moderation Module

A planned Module responsible for reusable moderation business logic.

The Moderation Module is not part of the completed v0.3.1 implementation.

It must use the consolidated Discord command architecture when implemented.

---

## Economy Module

The currently loaded Module foundation for future economy behavior.

Verified location:

```text
src/modules/economy/EconomyModule.js
```

It currently participates in the framework lifecycle but does not yet implement balances, rewards, transactions, shops, or persistence.

---

## Ticket Module

A planned Module for support tickets, appeals, transcripts, and staff workflows.

It is not currently implemented.

---

## Game Provider

A future Provider that integrates RSF with a hosted game server.

The first planned game integration is 7 Days to Die.

Game-server clients, commands, and events belong in the game Provider.

Reusable economy or moderation rules belong in Modules.

---

## Website Provider

A future Provider that integrates RSF with a website or dashboard.

Website-specific transport, authentication integration, and request handling belong in the Website Provider.

Reusable community business rules remain in Modules.

---

## Dependency

A runtime or development package required by the project.

The authoritative dependency sources are:

```text
package.json
package-lock.json
```

Documentation must not claim a dependency is active merely because it was discussed previously.

---

## Milestone

A versioned development objective with defined scope, implementation, testing, documentation, Git commits, and final verification.

Major milestones receive Git tags only after all closeout requirements pass.

---

## Phase

A small working portion of a milestone.

Each phase must:

- Have one clear objective
- Produce working code
- Preserve existing behavior
- Include testing
- Include a focused Git commit
- Leave the repository in a working state

---

## Architecture Change Rule

The rule governing major architectural changes.

A major change should only be recommended when at least two of these are true:

- It provides long-term value.
- It improves the architecture beyond naming.
- It is the last practical opportunity to make the change.

Otherwise, development should continue within the existing architecture.

---

## Repository-First Rule

The repository is the implementation source of truth.

Before changing implementation:

1. Review relevant documentation.
2. Review the repository structure.
3. Read the involved files.
4. Confirm actual behavior.
5. Propose the smallest safe change.
6. Test before committing.

Documentation must be corrected when it conflicts with tested repository behavior.

---

## Source-of-Truth Document

A project document that must remain synchronized with the repository and approved project direction.

Current source-of-truth documents include:

- `AI-ONBOARDING.md`
- `00-Vision.md`
- `01-Architecture.md`
- `02-Core.md`
- `03-Providers.md`
- `04-Modules.md`
- `05-Events.md`
- `06-Permissions.md`
- `07-Coding-Standards.md`
- `Decision-Log.md`
- `Project-Status.md`
- `Roadmap.md`
- `Dependencies.md`
- `Glossary.md`

---

## Technical Debt

A known implementation or design issue that may increase future development cost.

Technical debt should be documented when it is intentionally deferred.

It should not be used as a label for every unfinished future feature.

---

## Duplicate Ownership

A condition where multiple components actively perform the same responsibility.

Examples include:

- Multiple command registries
- Multiple interaction listeners
- Multiple slash-command registration paths

RSF avoids duplicate ownership by assigning each responsibility one clear active implementation path.