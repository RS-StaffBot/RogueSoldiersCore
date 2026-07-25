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
