# Project Status

## Current Version

v1.3.0

## Current Milestone

v1.4.0 - Hosted Player Administration

Status: In progress; Phase 10 is in progress.

## Milestone Goal

Add a narrow, authorized Discord interface for administering individual players on the hosted 7 Days to Die server without exposing arbitrary console execution.

The milestone builds on the existing `/game` command family, `ManageGuild` authorization, focused game Provider resolver, immutable command-result boundary, and single-active-command enforcement.

## Planned Command Family

- `/game kick`
- `/game ban`
- `/game unban`
- `/game whitelist add`
- `/game whitelist remove`

Exact options, identifiers, server command shapes, completion evidence, and response parsing must be proven before each operation is exposed.

## Architecture Boundary

The Discord Provider owns slash-command definitions, Discord authorization, interaction handling, input validation, response deferral, safe result parsing, and user-facing formatting.

The 7 Days to Die Provider retains ownership of Telnet communication, fixed command construction, command execution, response completion, event separation, timeout behavior, connection failures, and single-active-command enforcement.

No arbitrary console entry is exposed. Commands receive only the frozen `executeCommand` service boundary. No Module is introduced for direct game-platform administration unless reusable cross-platform policy is proven later.

## Completed v1.4.0 Work

### Phases 1-5 - Hosted Player Kick

Completed live evidence, approved the fixed kick contract, added deterministic Provider completion, added shared Discord validation and privacy-safe formatting, and registered guild-only `/game kick entity-id:<id> reason:<text>` through `ManageGuild`.

The command executes only:

```text
kick <online entity id> "<validated reason>"
```

### Phase 6 - Hosted Player Ban

Live evidence against 7 Days to Die V3.1.0 b13 proved:

- durable combined identifiers use `Steam_<id>` or `EOS_<id>`
- the fixed command shape is `ban add <user id> <duration> <unit> "<reason>" "<display name>"`
- success completes on `<stored user id> banned until YYYY-MM-DD HH:MM:SS, reason: <reason>.`
- online Steam targets may normalize to EOS in server output
- duplicate active bans refresh the existing expiry instead of creating duplicate rows
- expired temporary bans disappear automatically
- disconnect, reload, EOS cleanup, and stack-trace output are unrelated noise

Added deterministic Provider completion for verified `ban add` success and invalid-target lines.

Added guild-only `/game ban` with required durable user ID, positive duration, verified duration-unit choice, bounded reason, and bounded display name. It validates before Provider resolution, executes only the approved fixed command, defers an ephemeral response, and never copies platform IDs or raw Telnet output into Discord.

### Phase 7 - Hosted Player Unban

Added guild-only `/game unban display-name:<exact text>` through the approved exact active-ban lookup contract.

The workflow validates an exact display name, reads `ban list`, requires exactly one matching active entry, removes the exact stored UserID, reads `ban list` again, and reports success only when that stored UserID is absent. The success-looking removal line is treated as command completion only and never as sufficient proof of unban.

Parser, registration, dispatch, ambiguity, malformed-output, failed-verification, and privacy coverage are implemented. PR #52 merged the verified workflow into `main`.

### Phase 8 - Whitelist Provider Completion

Live evidence against 7 Days to Die V3.1.0 b13 proved:

- durable individual targets use one combined `Steam_<id>` or `EOS_<id>` argument
- add uses `whitelist add <durable user id> <display name>`
- remove uses `whitelist remove <durable user id>`
- add completes on `<stored user id> added to whitelist.`
- remove completes on `<stored user id> removed from the whitelist.`
- missing remove completes on `<stored user id> was not on the whitelist.`
- first add activates whitelist-only mode
- final removal disables whitelist-only mode before printing the removal-success line
- duplicate add prints the same success line without creating a duplicate row
- entries persist across a normal server restart
- reload, path, login, authentication, performance, entity, inventory, and stack-trace lines are unrelated noise

PR #53 added deterministic Provider completion and focused command-service tests.

### Phase 9 - Whitelist Validation and Formatting

PR #54 added coverage for the existing durable Steam/EOS identifier validation and bounded display-name validation. It also added privacy-safe whitelist add, remove, missing-entry, malformed-result, timeout, and raw-output protection contracts.

Ordinary responses never copy platform identifiers, IP addresses, configuration paths, or raw server output. Explicitly authorized staff identifier workflows remain separately permission-gated and private or ephemeral.

## Current Phase

Phase 10 registers and dispatches the individual whitelist operations inside the existing guild-only `/game` command family:

```text
/game whitelist add user-id:<Steam_...|EOS_...> display-name:<text>
/game whitelist remove user-id:<Steam_...|EOS_...> display-name:<text>
```

The Discord Provider validates every option before Provider resolution, executes only the fixed evidence-backed command shapes, defers ephemeral replies, and uses the privacy-safe formatter boundary. The display name on remove is used only for the private staff-facing result and is not sent to the game server.

## Next Step

After Phase 10 CI passes and the pull request is merged:

1. Complete live Discord-to-game verification for whitelist add and remove.
2. Add any narrowly required regression fixes found by live verification.
3. Synchronize final milestone documentation and versions, add release notes, run final regression, and close v1.4.0.

## Remaining Planned Phases

1. Complete Discord whitelist registration, dispatch, validation, authorization, timeout, malformed-input, privacy, and regression coverage.
2. Complete live Discord-to-game verification.
3. Synchronize documentation and versions, add release notes, run final regression, and close v1.4.0.

## v1.4.0 Safety Boundaries

The milestone does not include arbitrary console execution, free-form Telnet input, cross-platform identity linking, fuzzy player matching, continuous chat bridging, Economy-backed game effects, command queues, multiple servers, process supervision, or public Telnet exposure.

Administrative actions must fail safely for missing, ambiguous, malformed, offline, rejected, already-banned, not-banned, already-whitelisted, or not-whitelisted targets. Ordinary Discord responses must not expose raw Telnet output, credentials, IP addresses, positions, health values, platform identifiers, socket details, or internal errors.

An explicitly authorized staff lookup or administration workflow may display requested Steam or EOS identifiers when operationally necessary. That visibility must remain permission-gated, purpose-limited, and private or ephemeral. It must not expose raw login or server-console output.

## Current Discord Game Capability

The guild-only `/game` family includes:

- `/game status`
- `/game time`
- `/game players`
- `/game say message:<text>`
- `/game kick entity-id:<id> reason:<text>`
- `/game ban user-id:<Steam_...|EOS_...> duration:<number> unit:<choice> reason:<text> display-name:<text>`
- `/game unban display-name:<exact text>`
- `/game whitelist add user-id:<Steam_...|EOS_...> display-name:<text>`
- `/game whitelist remove user-id:<Steam_...|EOS_...> display-name:<text>`

It requires Discord `ManageGuild`, uses ephemeral responses, and resolves only a frozen `executeCommand` service from the framework-loaded `7 Days to Die` Provider.

## Current Production Boundaries

- RSF supports a single-process SQLite deployment.
- Node.js 22.13 or newer is required for `node:sqlite`.
- The optional 7 Days to Die Provider supports one active command at a time through private raw Telnet.
- Verified durable ban and unban are available through Discord.
- Individual whitelist server contracts, Discord validation, privacy-safe formatting, registration, and dispatch are implemented pending live Discord-to-game verification.
- Continuous chat bridging, Economy-backed game effects, command queues, and multiple game servers remain future work.

## v1.3.0 Release Record

- Release pull request: `#43`
- Release merge commit: `71e476641bb5026dfa4d41dbd88131db2326800b`
- Annotated tag: `v1.3.0`

## Previous Release Record

- v1.2.0 release pull request: `#32`
- v1.2.0 release merge commit: `9faa79314d092ba3e8092af1e00405af6d6cc9b8`
- Annotated tag: `v1.2.0`

## Release Notes

See `docs/Release-Notes-v1.3.0.md`.
