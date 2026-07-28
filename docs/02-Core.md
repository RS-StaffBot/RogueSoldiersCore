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

Core provides Registry, EventBus, component lifecycle, Bootstrap coordination, configuration loading, database infrastructure, migrations, settings services, settings persistence, administration audit history, and secret-configuration boundaries.

## Settings Infrastructure

The v1.1 settings foundation is Core-owned. Verified responsibilities include:

- immutable setting definitions and registry lookup
- permission-protected setting reads
- validated updates and resets
- owner-specific value validation
- durable SQLite overrides
- deterministic administration audit history
- atomic persistence and audit transactions
- immediate live application through owner applicators
- compensation that restores runtime state when a mutation fails
- startup resolution of persisted overrides

Administrative interfaces must call the validated settings services. They must not directly mutate Module properties, configuration files, SQLite rows, or audit records.

Secret values are excluded from normal setting definitions, persistence, reads, updates, resets, and audit history.

## Secret Configuration

Core provides a separate environment-backed secret configuration boundary. Secret paths must be declared before they can be read. Missing required secrets report only the safe configuration path and never the value.

Configuration redaction handles nested objects and arrays, common secret field names, and known raw secret strings before diagnostics are exposed.

The current boundary does not provide secret editing, encrypted storage, rotation, or external vault integration.

## Database Infrastructure

Core owns one framework Database service backed by SQLite through Node's built-in `node:sqlite` API.

Runtime requirements and boundaries:

- Node.js 22.13 or newer
- No third-party SQLite package, ORM, or query builder
- `node:sqlite` is synchronous
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
- Load globally ordered `NNN_lowercase_name` migrations
- Construct approved Module-specific and Core settings stores without exposing the raw connection
- Close the connection through controlled framework shutdown

The Database service does not contain Module business rules. Modules, Providers, and commands do not access its connection directly.

### DatabaseService

`src/core/database/DatabaseService.js` validates configuration, resolves database paths, opens the one Core-owned connection, enables foreign keys, enables WAL mode for file-backed databases, coordinates health reporting, constructs approved stores, and closes the connection during framework shutdown.

### DatabaseMigrationLoader

`src/core/database/DatabaseMigrationLoader.js` combines Module and Core migrations into one globally ordered sequence.

### DatabaseMigrationManager

`src/core/database/DatabaseMigrationManager.js` validates migration definitions, creates `rsf_schema_migrations`, applies each pending migration inside `BEGIN IMMEDIATE`, records successful application, skips previously applied migrations, and rolls back failures.

Bootstrap initializes and starts the Database before Modules reconstruct durable state or persisted settings are applied.

Backup, recovery, remote hosting, replication, clustering, and operational database tooling remain outside the v1.1 settings milestone.
