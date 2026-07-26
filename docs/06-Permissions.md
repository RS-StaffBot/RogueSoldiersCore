# Permissions

## Implemented Moderation Permissions

Verified location:

```text
src/shared/permissions/ModerationPermission.js
```

Action mapping:

```text
BAN       -> BAN_MEMBERS
KICK      -> KICK_MEMBERS
WARN      -> WARN_MEMBERS
TIMEOUT   -> TIMEOUT_MEMBERS
UNTIMEOUT -> TIMEOUT_MEMBERS
PURGE     -> PURGE_MESSAGES
```

## Ownership

- Shared owns reusable moderation permission identifiers.
- Moderation Module owns action-to-permission requirements.
- Discord Provider owns Discord permission translation and enforcement.

## Implemented Economy Permission Identifiers

Verified location:

```text
src/shared/permissions/EconomyPermission.js
```

Implemented identifiers:

```text
VIEW_OWN_BALANCE -> economy.view-own-balance
TRANSFER         -> economy.transfer
CREDIT           -> economy.credit
DEBIT            -> economy.debit
VIEW_HISTORY     -> economy.view-history
ADMINISTRATE     -> economy.administrate
```

The Economy Module currently uses `TRANSFER` and `ADMINISTRATE` to authorize transfers under the `STAFF_ONLY` policy. The `DISABLED` policy rejects every transfer, and `EVERYONE` permits transfers without either identifier.

These are Module-level permission identifiers. The current Discord command surface has no `/transfer` command, so Discord role translation and enforcement for Economy transfers are not implemented. The `/balance`, `/daily`, and `/leaderboard` commands use validated Economy Module operations but do not provide a complete cross-platform permission administration system.

## Implemented Ticket Permission Identifiers

Verified location:

```text
src/shared/permissions/TicketPermission.js
```

Implemented identifiers:

```text
VIEW_ALL      -> tickets.view-all
RESPOND       -> tickets.respond
ASSIGN        -> tickets.assign
CLOSE         -> tickets.close
ADMINISTRATE  -> tickets.administrate
```

Ticket creators may list and view their own Tickets, view their own message history, add messages to their own open Tickets, and close their own open Tickets. Staff operations require the corresponding reusable Ticket permission. `ADMINISTRATE` overrides the individual staff permission requirements. Being assigned to a Ticket does not itself grant access or authority.

The Discord Provider translates `ManageMessages` into `VIEW_ALL`, `RESPOND`, `ASSIGN`, and `CLOSE`. Discord `Administrator` grants `ADMINISTRATE` and, through Discord's permission behavior, the individual staff translations. This fixed mapping is not configurable.

Discord translation determines which reusable identifiers an interaction presents. `TicketModule` remains responsible for the final authorization decision; Provider commands do not duplicate Ticket authorization rules.

## Not Yet Implemented

- Role-to-RSF permission mapping
- Permission persistence
- Cross-platform identity
- Permission administration commands
- Database-backed authorization
- Discord Economy transfer authorization
- Configurable Ticket staff roles
- Broader Ticket permission administration
