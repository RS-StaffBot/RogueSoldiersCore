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

Runtime requirements and boundaries:

- Node.js 22.13 or newer
- No third-party SQLite package, ORM, or query builder
- `node:sqlite` is synchronous
- The API remains active development on Node 22
- SQLite targets the current single-process deployment model

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

### DatabaseService

`src/core/database/DatabaseService.js` validates configuration, resolves database paths, opens the one Core-owned connection, enables foreign keys, enables WAL mode for file-backed databases, coordinates health reporting, constructs approved stores, and closes the connection during framework shutdown.

### DatabaseMigrationLoader

`src/core/database/DatabaseMigrationLoader.js` combines Module migrations into one globally ordered sequence:

```text
001_create_moderation_audit_records
002_create_economy_ledger
003_create_ticket_aggregate
```

### DatabaseMigrationManager

`src/core/database/DatabaseMigrationManager.js` validates migration definitions, creates `rsf_schema_migrations`, applies each pending migration inside `BEGIN IMMEDIATE`, records successful application, skips previously applied migrations, and rolls back failures.

Bootstrap initializes and starts the Database before `ModuleLoader` creates stores or Modules reconstruct durable state.

Startup validation may read complete durable Module state. Very large datasets may require future optimized validation. Backup, recovery, remote hosting, replication, clustering, and operational database tooling are not implemented.
