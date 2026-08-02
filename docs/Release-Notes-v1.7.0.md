# Rogue Soldiers Framework v1.7.0

## Audit and Activity Foundation

v1.7.0 introduces a durable, privacy-safe, actor-attributed Audit foundation for meaningful RSF staff, infrastructure, moderation, Ticket, lifecycle, and hosted-player administration actions.

This file describes the prepared v1.7.0 release candidate. The version remains unreleased until the release pull request is reviewed and merged and separate tag and GitHub release authorization is completed.

## Highlights

- platform-neutral Audit Module
- immutable defensive Audit records
- SQLite persistence and restart recovery
- deterministic sequential `audit-N` identifiers
- bounded newest-first queries
- narrow recording and query service boundaries
- lifecycle administration Audit integration
- Discord Moderation Audit integration
- Ticket staff-mutation Audit integration
- hosted-player administration Audit integration
- restricted private `/audit recent` and `/audit record`
- privacy and authorization guardrails
- controlled Phase 7 restart verification

## Audit Module Foundation

The Audit Module owns:

- record validation
- fixed action, actor, source, target, and outcome shapes
- RSF-generated identifiers and timestamps
- bounded allowlisted metadata
- recording and bounded query operations
- its Module-specific store contract

Core owns the SQLite connection, ordered migrations, Audit Module construction, lifecycle loading, and private store injection.

Providers and other Modules receive only narrow recording or query services required for approved workflows.

## Persistence and Restart Recovery

Production Audit records use SQLite migration:

```text
007_create_audit_records
```

Phase 7 verified reconstruction with a disposable non-production database:

```text
Initial IDs:
audit-1, audit-2

Recovered exact record:
audit-1

Recovered newest-first order:
audit-2, audit-1

Next generated ID:
audit-3
```

The verification confirmed that sequence numbering did not reset or collide after reconstruction.

All temporary verification data was removed.

## Recording Boundaries

Implemented integrations include:

- `/lifecycle restart`
- `/lifecycle reload`
- `/ban`
- `/kick`
- `/warn`
- `/timeout`
- `/untimeout`
- `/purge`
- `/ticket staff message`
- `/ticket staff assign`
- `/ticket staff unassign`
- `/ticket staff close`
- `/game kick`
- `/game ban`
- `/game unban`
- `/game whitelist add`
- `/game whitelist remove`

Audit recording is best effort and non-blocking after the authoritative owning workflow determines its result.

Successful Module-owned operations are recorded only after the authoritative Module mutation commits.

## Restricted Audit Lookup

Discord provides:

```text
/audit recent
/audit record
```

The command family is:

- guild-only
- declared with `ManageGuild`
- checked again at runtime
- private through ephemeral responses
- bounded and allowlisted
- omitted when the query boundary is unavailable

Identifiers are rendered as inert text, Discord mention parsing is disabled, failures are sanitized, and lookup does not record itself.

## Privacy Guardrails

Audit records and lookup output exclude:

- credentials
- passwords
- tokens
- addresses
- sockets
- configuration
- SQL
- database rows
- stack traces
- raw Discord payloads
- raw game-console output
- moderation reasons
- Ticket message content
- positions
- health
- inventory
- arbitrary request objects

Permanent Discord IDs remain durable identifiers. Mutable Discord names are not persisted. Mentions remain disabled, and inert ID-only fallback remains valid.

## Authoritative Business Histories

Audit records are bounded accountability summaries.

They do not replace:

- Moderation case history
- Economy transactions and balances
- Ticket records and messages
- Identity links
- hosted-game command results
- current lifecycle state

## Phase 7 Verification

Existing automated tests prove:

- SQLite persistence and ID continuation
- newest-first ordering
- exact lookup
- success outcomes
- denied outcomes
- failed and unavailable outcomes
- permission denial
- private Audit lookup
- Moderation compatibility
- Ticket creator and staff authorization preservation
- lifecycle compatibility
- hosted-player Audit behavior
- non-blocking Audit failure policies

Controlled restart verification independently confirmed durable recovery using synthetic records and temporary storage.

No production Discord, real support data, real moderation data, real player administration, production game mutation, or production SQLite database was required.

## Version Synchronization

The release-hardening branch synchronizes:

```text
package.json
package-lock.json
config/core/app.json
```

to:

```text
1.7.0
```

## Deferred and Excluded

The following are not included in v1.7.0:

- Discord identity-presentation enhancement
- Ticket command-family restructuring
- permission administration
- role management
- permission database
- staff hierarchy
- broad permission migration
- AuthorizationPolicy engine
- Website Audit administration
- configurable retention administration
- external telemetry or log aggregation
- general event sourcing
- arbitrary user surveillance
- raw Discord message retention
- raw game-console retention
- hosted-game live verification
- Linux or Docker deployment hardening
- Economy-backed game purchases
- continuous Discord and game chat bridging

The mixed `/ticket` family remains unchanged for v1.7.0, and runtime authorization remains mandatory.

## Dormant PR #100 Contracts

PR `#100` is:

```text
Merged, dormant forward foundation included on current main.
Not activated as the current milestone.
Not a completed permission system.
Not a released v1.8.0 capability.
```

It does not replace current Discord, Moderation, Ticket, game, lifecycle, or Audit authorization behavior.

## Release State

At preparation time:

```text
Release pull request:
Pending creation

v1.7.0 tag:
Not created

GitHub release:
Not created
```

Merge, tagging, and GitHub release creation require separate authorization.
