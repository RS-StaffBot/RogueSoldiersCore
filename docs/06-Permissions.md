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

## Not Yet Implemented

- Role-to-RSF permission mapping
- Permission persistence
- Cross-platform identity
- Permission administration commands
- Database-backed authorization
