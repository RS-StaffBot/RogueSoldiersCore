# Core Framework

## Purpose

Core provides framework infrastructure and remains independent of Discord-specific behavior and reusable community business rules.

## Logger

Verified Logger methods:

- `info(message)`
- `warn(message)`
- `error(message)`
- `moderationAudit(message)`

Terminal behavior:

- `[INFO]` is cyan when supported.
- `[WARN]` is yellow.
- `[ERROR]` is red.
- `[MODERATION AUDIT]` is magenta.
- Non-TTY output falls back to plain text.
- `NO_COLOR` disables color.

ANSI formatting belongs only in `src/core/Logger.js`.

## Other Core Services

Core continues to provide Registry, EventBus, component lifecycle, Bootstrap coordination, and configuration loading.

## Database Infrastructure

Core owns one framework Database service backed by SQLite through Node's built-in `node:sqlite` API.

Verified responsibilities:

- Validate Database configuration
- Normalize local database paths
- Initialize one connection through Bootstrap
- Report connection health
- Enable SQLite foreign-key enforcement
- Use write-ahead logging for file-backed databases
- Create and query migration history
- Apply ordered migrations transactionally
- Roll back a failed migration
- Load globally ordered `NNN_lowercase_name` migrations from current Module integrations
- Construct approved Module-specific stores without exposing the raw connection
- Close the connection through controlled framework shutdown

The Database service does not contain Module business rules. Modules, Providers, and commands do not access its connection directly.
