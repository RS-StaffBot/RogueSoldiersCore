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

## Existing Decisions Retained

- Discord is a Provider.
- RSF uses one active Discord command architecture.
- Major architecture changes require at least two Architecture Change Rule conditions.
