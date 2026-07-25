# Core Framework

## Purpose

Core provides the framework infrastructure used to coordinate Providers, Modules, configuration, events, logging, and lifecycle state.

Core must remain independent of Discord-specific behavior and community business logic.

---

## Current Core Files

The verified Core implementation contains:

```text
src/core/
|-- BaseComponent.js
|-- ComponentState.js
|-- EventBus.js
|-- FrameworkComponent.js
|-- Logger.js
`-- Registry.js
```

Framework startup coordination is handled by:

```text
src/bootstrap/Bootstrap.js
```

Configuration loading is handled by:

```text
src/configuration/ConfigurationManager.js
```

---

## BaseComponent

`BaseComponent` defines the shared lifecycle behavior used by Providers and Modules.

Each component has:

- A name
- A lifecycle state
- Initialization support
- Startup support
- Shutdown support
- Error-state support
- Status reporting

Verified methods:

- `initialize()`
- `start()`
- `stop()`
- `setError()`
- `getStatus()`

The current lifecycle methods update state but contain placeholders for future component-specific work.

---

## ComponentState

`ComponentState` defines the allowed lifecycle-state values.

Current states:

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

The object is frozen so the state definitions cannot be changed at runtime.

---

## FrameworkComponent

`FrameworkComponent` extends `BaseComponent` and identifies itself as `Framework`.

It currently forwards initialization and startup behavior to `BaseComponent`.

It is not currently instantiated by Bootstrap.

Its existence should not be treated as proof of additional framework behavior.

---

## Registry

The Core Registry stores framework-wide services by name.

Verified behavior:

- Rejects duplicate service names
- Retrieves registered services
- Throws when a service is missing
- Checks whether a service exists
- Lists registered service names

Bootstrap currently registers:

```text
logger
config
eventBus
providers
modules
```

The Core Registry is separate from the Discord Command Registry.

The Core Registry stores framework services.

The Discord Command Registry stores Discord command instances.

---

## EventBus

`EventBus` provides basic in-memory event subscription and emission.

Verified methods:

- `on(event, listener)`
- `emit(event, data)`
- `eventNames()`

The current implementation:

- Stores listeners by event name
- Allows multiple listeners per event
- Emits data to registered listeners
- Ignores events that have no listeners

No concrete framework event classes or event names are currently implemented.

The presence of `EventBus` does not mean moderation, economy, or Provider events already exist.

---

## Logger

`Logger` provides static logging methods:

- `info(message)`
- `warn(message)`
- `error(message)`

The current Logger writes formatted output through native console methods.

Current output prefixes are:

```text
[INFO]
[WARN]
[ERROR]
```

The declared `winston` package is not currently used by this Logger implementation.

---

## ConfigurationManager

`ConfigurationManager` loads configuration from:

```text
config/
```

It:

- Recursively reads JSON files
- Builds a nested configuration object from folder and file paths
- Retrieves values using dot-separated paths
- Loads environment variables through `dotenv`
- Provides direct environment-variable access

Verified methods:

- `load()`
- `loadDirectory(directory)`
- `get(pathString, defaultValue)`
- `getEnv(key, defaultValue)`

Example:

```text
config/core/app.json
```

is available through paths such as:

```text
core.app.name
core.app.version
```

---

## Bootstrap

`Bootstrap.start()` coordinates framework startup.

Verified responsibilities:

1. Load configuration.
2. Register framework services.
3. Log framework name and version.
4. Load Providers.
5. Register Providers.
6. Initialize Providers.
7. Start Providers.
8. Load Modules.
9. Register Modules.
10. Initialize Modules.
11. Start Modules.
12. Log Provider and Module status.
13. Log successful framework startup.

Bootstrap coordinates the framework.

It should not absorb Provider-specific or Module-specific behavior.

---

## Current Limitations

Core does not yet provide:

- Coordinated process shutdown
- Persistent service storage
- Dependency injection beyond the Registry
- Asynchronous lifecycle management
- Event listener removal
- Event error isolation
- Automated Core tests

These features must not be described as implemented until they are added and verified.
