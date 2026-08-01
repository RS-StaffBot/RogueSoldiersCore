# Rogue Soldiers Framework v1.6.0

## Component Resilience and Runtime Lifecycle

v1.6.0 adds safe runtime visibility, control, recovery, and replacement for independently recoverable RSF components without requiring a full framework restart.

## Highlights

- privacy-safe lifecycle status contracts for Providers and Modules
- controlled individual start and stop operations
- serialized lifecycle mutations through one shared lock
- safe Provider and Module restart coordination
- bounded opt-in 7 Days to Die reconnect behavior
- trusted configuration-backed 7 Days to Die reconstruction
- atomic Provider replacement from `RUNNING` or `ERROR`
- private permission-gated Discord lifecycle administration
- live degraded recovery from `ERROR` back to `RUNNING`
- BOM-free application configuration for reliable fresh-clone startup

## Lifecycle Status

ProviderManager and ModuleManager now expose frozen defensive status contracts containing only approved runtime facts:

- component type
- registered name
- current state
- whether initialization succeeded
- whether the component is operational

Status output excludes raw errors, stack traces, paths, addresses, credentials, sockets, clients, configuration, stores, database handles, and component instances.

## Controlled Lifecycle Operations

Providers and Modules support validated individual start and stop operations.

A shared non-reentrant lifecycle-operation lock prevents overlapping start, stop, restart, replacement, and reconnect work.

Restart performs a controlled stop followed by start while verifying expected terminal states. Failed operations return immutable sanitized outcomes and leave truthful observable component state.

## 7 Days to Die Reconnect Policy

The 7 Days to Die Provider now supports an optional bounded reconnect policy for unexpected runtime connection loss.

Reconnect is:

- disabled unless explicitly configured
- limited to a validated maximum attempt count
- delayed by a validated configured interval
- restricted to one active recovery sequence
- protected by the shared lifecycle lock
- cancelled during intentional stop
- not used for initial configuration, initialization, or authentication failure

Successful reconnect returns the Provider to `RUNNING`. Exhausted attempts leave it in `ERROR` while Discord and unrelated RSF components continue operating.

## Configuration-Backed Replacement

ProviderLoader owns a fixed reconstruction allowlist. v1.6.0 allows reconstruction only for the `7 Days to Die` Provider.

Replacement reloads trusted configuration and constructs a candidate through Loader-owned code. The candidate must initialize and reach `RUNNING` before the existing Provider is stopped and the registry entry is replaced.

Replacement is allowed from initialized `RUNNING` and `ERROR` states.

If candidate construction, initialization, startup, or old-Provider cleanup fails, RSF retains the existing registered Provider and cleans up the candidate where possible.

Arbitrary paths, class names, source modules, dynamic code loading, request-controlled constructors, and arbitrary Provider names remain prohibited.

## Discord Lifecycle Administration

The Discord Provider now registers:

```text
/lifecycle status
/lifecycle restart
/lifecycle reload
```

These commands are:

- guild-only
- restricted by Discord `ManageGuild`
- checked at registration time and runtime
- ephemeral for every response
- fixed to the `7 Days to Die` Provider

Discord receives only a frozen lifecycle service exposing approved status, restart, and reload methods. It does not receive ProviderManager, Provider instances, constructors, configuration, sockets, credentials, or raw errors.

Discord cannot restart or replace itself through this command path.

## Live Verification

Live testing confirmed:

1. `/lifecycle status` reported the healthy 7 Days to Die Provider as initialized, operational, and `RUNNING`.
2. `/lifecycle restart` completed successfully.
3. `/game time` continued working after restart.
4. `/lifecycle reload` completed successfully from `RUNNING`.
5. `/game time` continued working after replacement.
6. Stopping the game server caused the Provider to reach `ERROR` after bounded reconnect exhaustion.
7. Discord and the rest of RSF remained online during degraded operation.
8. After the game server and Telnet returned, `/lifecycle reload` recovered the Provider from `ERROR` to `RUNNING`.
9. `/game time` worked after degraded recovery.
10. Discord lifecycle responses remained private and did not expose raw Telnet, address, credential, path, socket, or stack-trace details.

## Startup Configuration Fix

`config/core/app.json` is now stored as BOM-free UTF-8 JSON.

This prevents the `JSON.parse` startup failure observed when the tracked file contained a UTF-8 byte-order mark.

## Preserved Boundaries

- Core, Database, health, migration, and Loader-wide failures remain fatal.
- Recoverable component failures do not trigger total framework rollback.
- Shutdown remains Providers -> Modules -> Database.
- Existing Moderation, Economy, Ticket, Identity, Website, and game-command behavior remains unchanged.
- Private `config/providers/sevendaystodie.json` remains untracked and excluded.
- Website lifecycle administration is not implemented.
- OS-level process supervision is not implemented.
- Multiple game-server support is not implemented.
- Durable actor-attributed framework-wide audit history is not implemented.

## Future Audit Direction

A future focused milestone should add durable RSF-owned audit and activity records for meaningful privileged and business actions.

Lifecycle restart and reload should eventually record:

- who initiated the action
- which interface initiated it
- the fixed target
- the sanitized outcome
- the RSF-generated timestamp

This work is intentionally not included in v1.6.0.

## Validation Requirements

The release pull request must pass:

```text
npm audit --omit=dev --audit-level=high
npm test
npm run lint
git diff --check
```

All version locations must report `1.6.0` before the release is merged and tagged.
