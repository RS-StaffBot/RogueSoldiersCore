# Events

## Purpose

Events allow framework components to notify other components that something has happened without requiring every component to directly depend on every listener.

The current repository provides a basic in-memory EventBus.

No concrete framework event classes or production event workflows are implemented yet.

---

## EventBus Location

```text
src/core/EventBus.js
```

Bootstrap registers the EventBus in the Core Registry as:

```text
eventBus
```

---

## Current EventBus Behavior

The EventBus stores listeners by event name.

Verified methods:

### `on(event, listener)`

Registers a listener for an event name.

Multiple listeners may be registered for the same event.

### `emit(event, data = {})`

Calls every listener registered for an event.

If no listeners exist, the method returns without error.

### `eventNames()`

Returns the names of events currently stored in the EventBus.

---

## Current Data Model

Event names are currently plain values used as Map keys.

Event payloads are plain objects or other values supplied to `emit`.

There are no implemented:

- Event base classes
- Typed event payloads
- Event constants
- Event validation rules
- Event namespaces
- Event history
- Persistent event queues

The empty directory:

```text
src/shared/events/
```

is reserved for future reusable event definitions.

It does not currently contain an implemented event system.

---

## Intended Responsibility Boundary

Modules may eventually publish business events.

Providers or other Modules may react to those events.

Example conceptual direction:

```text
Module completes business action
    |
    v
Module emits event
    |
    v
Interested listener reacts
```

This is an architectural direction, not a currently implemented feature flow.

No specific event such as `UserBanned` should be treated as implemented until its repository file and usage exist.

---

## Current Error Behavior

The current EventBus calls listeners synchronously.

It does not:

- Catch listener exceptions
- Await asynchronous listeners
- Remove listeners
- Support one-time listeners
- Track event execution
- Log listener failures

A listener error may interrupt the remaining event emission process.

Any future improvement must be implemented and tested before this document describes different behavior.

---

## Event Naming

No official event-naming convention has been implemented.

When concrete events are introduced, their names and payloads should be documented alongside the feature that owns them.

Reusable event definitions may be placed under:

```text
src/shared/events/
```

when actual cross-layer reuse is required.

---

## Current Status

Event infrastructure exists.

Concrete application events do not yet exist.

Future milestones must not assume that event-driven communication has already been selected for every Provider and Module interaction.
