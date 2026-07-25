# Permissions

## Purpose

Permissions will control which users, members, roles, or systems may perform protected Rogue Soldiers Framework actions.

The current repository does not yet contain an implemented framework permission system.

This document defines current boundaries without describing unimplemented behavior as operational.

---

## Current Repository State

The Shared permissions directory exists:

```text
src/shared/permissions/
```

It currently contains no permission classes, models, constants, or services.

No verified framework permission registry exists.

No verified role-mapping system exists.

No verified permission persistence exists.

No moderation permissions have been implemented.

---

## Discord Permissions

Discord provides platform-level permissions through Discord roles and permission flags.

The current verified commands are:

- `/ping`
- `/help`

They do not implement protected moderation behavior.

The presence of Discord permissions in the external platform must not be confused with a complete RSF permission system.

---

## Responsibility Boundary

Future permission behavior may involve both Providers and Modules.

### Discord Provider responsibilities may include:

- Reading Discord member permissions
- Reading Discord roles
- Translating Discord permission data
- Enforcing Discord API requirements
- Returning platform-specific permission failures

### Module responsibilities may include:

- Deciding whether a business action requires authorization
- Defining business-level permission requirements
- Applying reusable community rules
- Avoiding permanent dependence on one Discord role layout

### Shared responsibilities may include:

- Reusable permission identifiers
- Permission result models
- Common permission errors
- Cross-platform permission utilities

These are intended boundaries, not implemented classes.

---

## Moderation Requirement

The future Moderation Module will require permission integration.

Moderation must not resume until v0.3.1 is closed.

When moderation begins:

- Repository files must be reviewed first.
- Permission requirements must be designed explicitly.
- Discord-specific checks must remain in the Discord integration layer where appropriate.
- Moderation business authorization must not be hidden inside DiscordProvider.
- Implemented permissions must be tested before documentation marks them complete.

---

## No Assumed Permission Model

The framework has not yet selected a final model for:

- Permission names
- Role-to-permission mapping
- Discord administrator overrides
- Server-owner behavior
- Staff hierarchy
- Cross-platform identities
- Permission persistence
- Command-level middleware
- Module-level authorization services

Missing detail is not permission to invent a model.

The final design must be based on the repository and the needs of the milestone that introduces permissions.

---

## Current Status

Permission architecture boundaries are documented.

Permission implementation is not present.

`src/shared/permissions/` remains reserved until verified reusable permission components are created.
