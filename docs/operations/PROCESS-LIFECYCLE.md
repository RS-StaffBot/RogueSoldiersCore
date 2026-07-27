# Process Lifecycle

## Purpose

This document defines the production process contract for Rogue Soldiers Framework (RSF).

## Startup

RSF starts through `src/index.js`, which creates one `ApplicationProcess` and runs one `Application` instance.

A successful process startup requires the complete framework startup path to finish successfully. This includes Core services, database initialization and migrations, Modules, and enabled Providers.

When startup fails:

- RSF logs `Framework startup failed.`
- The original error stack or message is logged.
- The process exit code is set to `1`.
- Framework shutdown is not started through the process signal path because startup did not complete successfully.

A production process manager should treat a nonzero exit code as a failed start.

## Signals

RSF listens once for each of these operating-system signals:

- `SIGINT`
- `SIGTERM`

Either signal starts the same graceful shutdown operation.

When more than one supported signal is received, RSF reuses the first shutdown promise and does not start duplicate framework shutdown work.

## Signal During Startup

A supported signal received while startup is still running waits for the startup result.

- If startup succeeds, RSF performs normal graceful shutdown.
- If startup fails, RSF preserves the startup failure and does not call `Application.stop()` through the process signal path.

## Shutdown

After successful startup, graceful shutdown:

1. Logs the received signal.
2. Calls `Application.stop()` once.
3. Waits for the existing framework reverse-order shutdown path.

The framework remains responsible for stopping Providers before Modules and Modules before Core-owned database infrastructure.

When shutdown fails:

- RSF logs `Framework shutdown failed.`
- The original error stack or message is logged.
- The process exit code is set to `1`.

## Restart Responsibility

RSF does not implement an internal automatic restart loop.

Production restart policy belongs to the selected process manager or hosting platform. That process manager should:

- start RSF from the repository or deployment root
- use `npm start`
- preserve the required environment variables
- send `SIGTERM` for planned shutdown when supported
- wait for graceful shutdown before forcing termination
- restart after unexpected nonzero exits according to the deployment policy
- avoid running more than one RSF process against the same production SQLite database

## Filesystem Requirements

The production account running RSF requires:

- read access to the deployed application files and tracked configuration
- read access to required environment values
- read and write access to the configured SQLite database location
- write access to any process-manager log destination

The working directory should be the RSF deployment root so relative configuration and data paths resolve consistently.

## Current Boundaries

- RSF does not daemonize itself.
- RSF does not select or configure a process manager.
- RSF does not force-kill itself after a fixed shutdown timeout.
- Provider-specific bounded shutdown behavior remains owned by each Provider.
- Website sessions and pending OAuth attempts remain in memory and are lost on process restart.
- Restarting RSF does not erase SQLite-backed Moderation, Economy, or Ticket state when the same valid database is retained.
