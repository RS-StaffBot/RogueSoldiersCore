# Glossary

## Core

The framework's infrastructure.

Coordinates the application lifecycle.

---

## Provider

Integrates an external platform.

Examples

- Discord
- Website
- 7 Days to Die
- Database

Providers do not contain business logic.

---

## Module

Contains business logic.

Examples

- Economy
- Moderation
- Tickets

Modules are platform independent.

---

## Shared

Reusable framework objects.

Examples

- Models
- Events
- Permissions
- Errors
- Utilities

---

## Event

A notification that something has happened.

Example

UserBanned

Modules publish events.

Providers react to events.

---

## Registry

Stores framework services for application-wide access.

---

## Bootstrap

Starts the application and initializes the framework.

---

## Component

A class participating in the application lifecycle.

Supports:

- initialize()
- start()
- stop()