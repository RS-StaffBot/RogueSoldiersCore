# Modules

## Purpose

Modules contain Rogue Soldiers Framework business logic.

Modules should remain independent of Discord-specific implementation whenever practical.

Providers integrate platforms.

Modules define community behavior.

---

## Module Foundation

Module infrastructure is located under:

```text
src/modules/
```

Core Module files:

```text
src/modules/core/
|-- BaseModule.js
|-- ModuleLoader.js
`-- ModuleManager.js
```

---

## BaseModule

`BaseModule` extends `BaseComponent`.

It inherits:

- Component name
- Lifecycle state
- Initialization
- Startup
- Shutdown
- Error state
- Status reporting

Module implementations may extend lifecycle behavior when required.

---

## ModuleLoader

`ModuleLoader` constructs the Module instances that participate in framework startup.

The current implementation loads:

- `EconomyModule`

No automatic Module discovery currently exists.

Adding a Module requires an explicit repository change to `ModuleLoader` or a future verified loading mechanism.

---

## ModuleManager

`ModuleManager` stores Modules by name.

Verified methods:

- `register(module)`
- `initializeAll()`
- `startAll()`
- `stopAll()`
- `list()`
- `get(name)`

The manager initializes and starts all registered Modules.

The current implementation does not reject duplicate Module names.

---

# Current Economy Module

Verified location:

```text
src/modules/economy/EconomyModule.js
```

`EconomyModule`:

- Extends `BaseModule`
- Uses the name `Economy`
- Participates in the framework lifecycle

It does not currently implement:

- Balances
- Daily rewards
- Transfers
- Shops
- Transactions
- Leaderboards
- Persistence
- Discord commands

Its presence should be treated as a Module foundation, not a complete economy system.

---

# Provider and Module Boundary

Modules must not directly become external-platform clients.

Providers must not absorb reusable business rules.

Example future flow:

```text
Discord command
    |
    v
Discord Provider command layer
    |
    v
Business Module
    |
    v
Business result
    |
    v
Discord response
```

The exact wiring for each feature should be based on the repository when that feature is implemented.

---

# Moderation Status

Moderation implementation is not present in the verified v0.3.1 repository.

Any previous uncommitted moderation drafts were removed before command-framework consolidation.

A future Moderation Module must be implemented against the final v0.3.1 command architecture.

Moderation business logic should belong inside the Module.

Discord-specific interaction handling and Discord API operations should remain in the Discord Provider area.

---

# Module Communication

The Core Registry currently exposes the Module Manager as:

```text
modules
```

The EventBus also exists for event-based communication.

No concrete Module communication pattern has yet been proven for moderation, economy, or tickets.

Future implementation must not assume whether direct manager lookup, events, services, or another pattern is final until the relevant feature is designed and tested.

---

# Current Limitations

The Module system does not yet provide:

- Automatic discovery
- Dependency ordering
- Dependency declarations
- Duplicate-name validation
- Asynchronous lifecycle coordination
- Persistent Module state
- Module enable or disable configuration
- Complete business-feature implementations
