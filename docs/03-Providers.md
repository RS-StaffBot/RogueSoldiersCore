# Providers

## Purpose

Providers integrate Rogue Soldiers Framework with external platforms and systems.

A Provider owns platform-specific clients, APIs, events, and lifecycle behavior.

Providers do not own general community business rules.

The active Provider is Discord.

---

## Provider Foundation

Provider infrastructure is located under:

```text
src/providers/
```

Core Provider files:

```text
src/providers/core/
|-- BaseProvider.js
|-- ProviderLoader.js
`-- ProviderManager.js
```

---

## BaseProvider

`BaseProvider` extends `BaseComponent`.

It inherits the framework lifecycle:

- `initialize()`
- `start()`
- `stop()`

Provider implementations may extend these methods with platform-specific behavior.

---

## ProviderLoader

`ProviderLoader` constructs the Provider instances that participate in framework startup.

The current implementation loads:

- `DiscordProvider`

Adding another Provider requires an explicit repository change to the loader or a future verified discovery mechanism.

No automatic Provider discovery currently exists.

---

## ProviderManager

`ProviderManager` stores Providers by name.

Verified methods:

- `register(provider)`
- `initializeAll()`
- `startAll()`
- `stopAll()`
- `list()`
- `get(name)`

The current implementation does not reject duplicate Provider names. A later improvement may add validation, but it is not part of the verified implementation.

---

# Discord Provider

## Purpose

`DiscordProvider` owns the Discord client and coordinates Discord-specific services.

Verified location:

```text
src/providers/discord/DiscordProvider.js
```

Discord remains a Provider because Discord is an external platform.

Community business logic must not be permanently placed inside DiscordProvider.

---

## Discord Provider Responsibilities

The final tested v0.3.1 implementation gives DiscordProvider these responsibilities:

- Construct the Discord client
- Configure required Gateway intents
- Load command instances
- Populate the single Discord Command Registry
- Register the InteractionHandler with the client
- Log in using the Discord bot token
- Wait for the Discord client-ready event
- Coordinate slash-command registration through CommandRegistrar
- Destroy the Discord client during Provider shutdown

DiscordProvider coordinates these components.

It does not own detailed runtime command dispatch or REST registration logic.

---

## Verified Discord Command Structure

```text
src/providers/discord/
|-- DiscordProvider.js
|-- commands/
|   |-- BaseCommand.js
|   |-- CommandLoader.js
|   |-- HelpCommand.js
|   `-- PingCommand.js
|-- handlers/
|   `-- InteractionHandler.js
`-- services/
    |-- CommandRegistrar.js
    `-- CommandRegistry.js
```

---

# Single Active Command Registry

The only active Discord Command Registry is:

```text
src/providers/discord/services/CommandRegistry.js
```

There must not be another active registry under `commands` or inside DiscordProvider.

The previous duplicate registry was removed during v0.3.1 after replacement behavior was tested.

---

## CommandRegistry Responsibilities

The Discord Command Registry:

- Stores command instances by command name
- Validates command structure
- Rejects duplicate command names
- Retrieves a command by name
- Lists all registered commands
- Converts registered command metadata into Discord-compatible definitions
- Supports clearing the registry during controlled command loading

Verified command requirements:

- The command must be an object.
- The command must provide `data`.
- `command.data.name` must be a non-empty string.
- `command.data.toJSON()` must exist.
- `command.execute()` must exist.

---

# BaseCommand

Verified location:

```text
src/providers/discord/commands/BaseCommand.js
```

`BaseCommand` defines the shared Discord command contract.

A command:

- Receives Discord slash-command metadata in its constructor
- Stores that metadata as `data`
- Must implement `execute(interaction)`

The default `execute()` method throws an error to prevent incomplete command implementations from silently succeeding.

---

# Command Classes

Current verified command classes:

- `PingCommand`
- `HelpCommand`

Each command:

- Extends `BaseCommand`
- Defines its slash-command metadata
- Implements its own Discord interaction behavior

`PingCommand` replies with:

```text
Pong!
```

`HelpCommand` reads the active Command Registry and displays registered commands.

Command classes should not coordinate Provider startup or slash-command registration.

---

# CommandLoader

Verified location:

```text
src/providers/discord/commands/CommandLoader.js
```

`CommandLoader` constructs the command instances used by the Discord Provider.

Current relationship:

```text
CommandLoader.load()
    |
    v
returns command instances
    |
    v
DiscordProvider receives them
    |
    v
DiscordProvider registers them with CommandRegistry
```

CommandLoader does not:

- Store commands
- Execute commands
- Listen for Discord interactions
- Register definitions with Discord

Automatic filesystem command discovery is not currently implemented.

New commands currently require an explicit import and instance entry in CommandLoader.

---

# InteractionHandler

Verified location:

```text
src/providers/discord/handlers/InteractionHandler.js
```

## Lifecycle

During DiscordProvider startup:

```text
DiscordProvider creates Discord client
    |
    v
DiscordProvider loads commands
    |
    v
DiscordProvider registers commands with CommandRegistry
    |
    v
DiscordProvider calls InteractionHandler.register(client)
```

`InteractionHandler.register(client)` attaches the single active `interactionCreate` listener.

---

## Responsibilities

InteractionHandler:

- Requires a valid Discord client
- Listens for `interactionCreate`
- Ignores interactions that are not chat-input commands
- Resolves commands through the single Command Registry
- Logs unknown command names
- Executes the resolved command
- Logs command errors
- Sends a safe error response when execution fails

It handles:

- Unreplied interactions
- Deferred interactions
- Interactions that already received a response

DiscordProvider does not contain another `interactionCreate` listener.

---

# CommandRegistrar

Verified location:

```text
src/providers/discord/services/CommandRegistrar.js
```

CommandRegistrar is the single owner of Discord slash-command REST registration.

It:

- Validates the Discord application ID
- Validates the Discord bot token
- Gets command definitions from CommandRegistry
- Creates the Discord REST client
- Registers global application commands
- Logs registration success
- Logs and rethrows registration errors

DiscordProvider coordinates when registration occurs.

CommandRegistrar owns how registration is performed.

---

# Slash-Command Registration Flow

The final tested registration flow is:

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
    |
    v
Command definitions
    |
    v
CommandRegistrar
    |
    v
Discord REST API
```

Registration occurs after the Discord client emits `clientReady`.

The current implementation registers global application commands through:

```text
Routes.applicationCommands(applicationId)
```

Guild-specific development registration is not implemented.

---

# Runtime Interaction Execution Flow

The final tested runtime flow is:

```text
Discord interaction
    |
    v
InteractionHandler
    |
    v
CommandRegistry.get(commandName)
    |
    v
Command.execute(interaction)
```

There is:

- One active Command Registry
- One `interactionCreate` listener
- One slash-command registration service
- One command-loading path

---

# Discord Configuration

DiscordProvider currently reads:

```text
DISCORD_TOKEN
DISCORD_CLIENT_ID
```

from environment variables.

`DISCORD_TOKEN` is used for client login and REST authentication.

`DISCORD_CLIENT_ID` is used as the application ID during slash-command registration.

Both variables are documented in `.env.example` as part of the v0.3.1 closeout.

---

# Current Gateway Intents

The Discord client currently uses:

```text
GatewayIntentBits.Guilds
```

Additional intents must only be added when an implemented feature requires them.

---

# Provider Boundaries

Discord-specific behavior belongs inside the Discord Provider area.

Examples:

- Discord client management
- Discord interactions
- Discord slash-command metadata
- Discord REST registration
- Discord API operations

Business rules belong in Modules.

For example, a future moderation command may receive Discord input, but moderation decisions and reusable moderation workflows should belong in a Moderation Module.

---

# Current Limitations

The Discord Provider does not yet implement:

- Moderation operations
- Ticket operations
- Economy commands
- Game-server integration
- Guild-specific command registration
- Automatic command discovery
- Advanced permissions
- Audit logging
- Presence configuration usage
- Automatic reconnect configuration usage beyond discord.js defaults
