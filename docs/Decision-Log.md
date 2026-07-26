# Decision Log

## Moderation Responsibility Split

### Decision

Moderation is divided between the Moderation Module, Shared permission identifiers, and the Discord Provider.

### Ownership

Moderation Module:

- Supported actions
- Action-to-permission mapping
- Audit records
- In-memory audit storage

Shared:

- Reusable moderation permission identifiers

Discord Provider:

- Interaction input
- Member and channel resolution
- Discord permission checks
- Hierarchy and manageability checks
- Discord API operations
- Discord responses

## Centralized Logging and Color

Terminal formatting and ANSI color behavior belong only in Core Logger. This provides consistent behavior across compatible terminals and plain-text fallback elsewhere.

## Economy Ownership and State Integrity

### Decision

Economy business logic is platform-neutral and owned by `EconomyModule`. Discord commands resolve the framework-loaded Economy Module through the Core Registry and Module Manager rather than constructing a separate instance.

Economy writes are atomic within the current in-memory implementation. Failed operations do not partially change balances, accounts, daily claim timestamps, transactions, ordering, or transaction ID sequencing.

Public Economy reads return defensive account, transaction, configuration, array, and `Date` snapshots so callers cannot mutate internal state through returned values.

Persistence and multi-process atomicity remain deferred to the v0.7.0 Database milestone.

## Ticket Ownership, Authorization, and State Integrity

### Decision

Ticket business logic is platform-neutral and owned by `TicketModule`. Discord Ticket commands resolve the one framework-loaded Module through the Core Registry and Module Manager rather than constructing another instance.

Ticket and message IDs are Module-generated. Ticket writes are atomic within the in-memory implementation, and public Ticket records and messages are frozen defensive snapshots.

Creator-owned operations and staff authorization remain Module-owned. The Discord Provider translates platform permissions into reusable Ticket permission identifiers. `ManageMessages` is the current fixed, non-configurable staff boundary, while `Administrator` supplies the administrative override and Discord's individual permission grants.

Ticket persistence belongs to v0.7.0 and will be required for multi-process atomicity. Discord channel and thread Ticket architecture, transcripts, permission overwrites, configurable roles, external portals, and web administration remain future work.

## Future Administration Boundary

Future administrative interfaces must invoke validated RSF settings and operations. They must not directly mutate Module properties, configuration files, or database rows. Such an interface will require permissions, audit logging, and persistence; its technology is not fixed and it is not currently implemented.

## Database Infrastructure Foundation

### Decision

SQLite is the selected local database engine. Database lifecycle and migration coordination are Core responsibilities, while Modules retain business validation and Providers remain independent of storage.

RSF uses the `node:sqlite` API included with Node 22.13 and newer. This avoids reintroducing a native npm SQLite add-on and its Windows compilation toolchain. No ORM or query builder is selected by this foundation checkpoint.

Bootstrap creates and registers one Database service. The service owns connection initialization, health checks, transactional migration application, migration history, and controlled shutdown. It does not expose its connection through the Registry.

Module schemas and persistence integrations remain separate checkpoints. Providers and commands must not access database tables directly.

## Moderation Persistence Authority

### Decision

Moderation is the first Module persistence integration because its single append-only audit stream provides useful restart recovery with the smallest schema and public-API risk.

SQLite is authoritative for production Moderation audit state. `ModerationModule` retains action validation, immutable public record construction, and logging order. A Module-specific store owns parameterized SQL and row mapping. Bootstrap injects that store through `ModuleLoader`; Providers and commands do not access it. Module migrations join one globally ordered `NNN_lowercase_name` sequence through the Core migration loader.

Audit storage must succeed before the Module logs or reports a successful action. Stored records are reconstructed through `ModerationAuditRecord`, so invalid durable data fails Module initialization instead of bypassing Module validation.

## Existing Decisions Retained

- Discord is a Provider.
- RSF uses one active Discord command architecture.
- Major architecture changes require at least two Architecture Change Rule conditions.
