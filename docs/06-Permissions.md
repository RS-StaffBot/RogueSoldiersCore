# Permissions

## Ownership

- Shared owns reusable business permission identifiers only when proven cross-platform reuse exists.
- Modules own business authorization decisions.
- Providers own platform permission translation and enforcement.
- Discord platform-operation commands may use fixed Discord permissions without introducing a Shared permission identifier when no reusable business permission has been proven.

## Moderation Permissions

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

Discord translates platform permissions and applies hierarchy and manageability checks. The Moderation Module remains responsible for final reusable action authorization and durable moderation records.

## Economy Permissions

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

The Economy Module uses these identifiers for Module-owned business authorization. The current Discord command surface does not provide complete Economy transfer or administration workflows.

## Ticket Permissions

Verified location:

```text
src/shared/permissions/TicketPermission.js
```

Implemented identifiers:

```text
VIEW_ALL     -> tickets.view-all
RESPOND      -> tickets.respond
ASSIGN       -> tickets.assign
CLOSE        -> tickets.close
ADMINISTRATE -> tickets.administrate
```

Ticket creators retain owner-scoped operations. Staff workflows require the corresponding reusable Ticket permission, with `ADMINISTRATE` acting as the broad override.

Discord translates `ManageMessages` into the fixed staff Ticket identifiers. Discord `Administrator` grants `ADMINISTRATE` and Discord's normal permission inheritance.

## Discord Game Command Authorization

Verified location:

```text
src/providers/discord/services/DiscordGameCommandAuthorizer.js
```

The guild-only `/game` command family requires:

```text
Discord Manage Guild permission
```

Authorization is enforced through one Discord Provider authorizer. This remains a platform-operation requirement rather than a Shared game-server business permission.

## Discord Lifecycle Administration Authorization

The guild-only `/lifecycle` command family uses the same fixed Discord `ManageGuild` authorizer.

Authorization is enforced twice:

1. registration-time default member permission
2. runtime permission validation before status or mutation access

Implemented operations are fixed to:

```text
/lifecycle status
/lifecycle restart
/lifecycle reload
```

Every response is ephemeral.

The command cannot accept arbitrary component names and cannot restart or replace the Discord Provider.

The authorization boundary grants access only to a frozen lifecycle service exposing approved status, restart, and reload operations for the `7 Days to Die` Provider. It does not grant access to ProviderManager, component instances, constructors, configuration, sockets, credentials, or raw errors.

## Restricted Discord Audit Lookup Authorization

The guild-only `/audit` command family uses a fixed Discord `ManageGuild` requirement.

Authorization is enforced in three distinct layers:

1. Discord registration metadata controls default command visibility.
2. Runtime `ManageGuild` authorization is checked again for every interaction.
3. Only after runtime authorization succeeds may the command call the frozen protected query capability.

Permission denial occurs before `getById()` or `list()`. Success, denial, and failure responses are ephemeral.

Authorization grants access only to the bounded Audit query boundary. It does not expose the Audit Module, stores, SQLite connections, SQL, database rows, or mutable internals. Command visibility alone is not sufficient authorization.

## Staff Platform Identifier Visibility

Steam and EOS identifiers remain private operational data by default.

An explicitly authorized and purpose-limited staff workflow may return a requested player's durable platform identifier when operationally necessary. Ordinary command results must not expose submitted or server-normalized platform identifiers.

IP addresses, credentials, positions, health, inventory, raw console output, and unrelated player identifiers remain private.

## Not Yet Implemented

- configurable role-to-RSF permission mapping
- permission persistence and administration commands
- configurable Ticket staff roles
- configurable game-server lifecycle staff roles
- Website lifecycle authorization
- cross-platform permission administration
