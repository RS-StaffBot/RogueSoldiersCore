# Project Status

## Current Version

v1.3.0

## Current Milestone

v1.4.0 - Hosted Player Administration

Status: In progress; Phase 7 is in progress.

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

## Current Phase

Phase 7 implements `/game unban` through the approved exact stored-UserID lookup and post-removal verification contract.

The Provider now has deterministic completion for the verified `ban remove <stored UserID>` response line. This confirms command completion only; the Discord workflow must still execute a second `ban list` and prove that the matching entry disappeared before reporting success.

## Next Step

Add the Discord `/game unban` workflow:

1. Validate an exact display name.
2. Read `ban list`.
3. Resolve exactly one matching active entry and its stored UserID.
4. Execute `ban remove <exact stored UserID>`.
5. Read `ban list` again.
6. Report success only when the entry is absent.

## Remaining Planned Phases

1. Complete `/game unban` registration, dispatch, validation, privacy, and failure coverage.
2. Add whitelist operations only after independent evidence.
3. Add final registration, dispatch, authorization, privacy, and regression coverage.
4. Complete live Discord-to-game verification.
5. Synchronize documentation and versions, add release notes, run final regression, and close v1.4.0.

## v1.4.0 Safety Boundaries

The milestone does not include arbitrary console execution, free-form Telnet input, cross-platform identity linking, fuzzy player matching, continuous chat bridging, Economy-backed game effects, command queues, multiple servers, process supervision, or public Telnet exposure.

Administrative actions must fail safely for missing, ambiguous, malformed, offline, rejected, already-banned, or not-banned targets. Ordinary Discord responses must not expose raw Telnet output, credentials, IP addresses, positions, health values, platform identifiers, socket details, or internal errors.

## Current Discord Game Capability

The guild-only `/game` family includes:

- `/game status`
- `/game time`
- `/game players`
- `/game say message:<text>`
- `/game kick entity-id:<id> reason:<text>`
- `/game ban user-id:<Steam_...|EOS_...> duration:<number> unit:<choice> reason:<text> display-name:<text>`

It requires Discord `ManageGuild`, uses ephemeral responses, and resolves only a frozen `executeCommand` service from the framework-loaded `7 Days to Die` Provider.

## Current Production Boundaries

- RSF supports a single-process SQLite deployment.
- Node.js 22.13 or newer is required for `node:sqlite`.
- The optional 7 Days to Die Provider supports one active command at a time through private raw Telnet.
- Verified durable ban is available through Discord; unban, whitelist, and cross-platform identity linking remain incomplete.
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
