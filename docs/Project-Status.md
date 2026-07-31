# Project Status

## Current Version

v1.4.0

## Current Milestone

No new milestone has been selected.

v1.4.0 - Hosted Player Administration is completed and tagged.

## Latest Completed Milestone

### v1.4.0 - Hosted Player Administration

The milestone added a narrow, authorized Discord interface for administering individual players on the hosted 7 Days to Die server without exposing arbitrary console execution.

Completed command family:

- `/game kick entity-id:<id> reason:<text>`
- `/game ban user-id:<Steam_...|EOS_...> duration:<number> unit:<choice> reason:<text> display-name:<text>`
- `/game unban display-name:<exact text>`
- `/game whitelist add user-id:<Steam_...|EOS_...> display-name:<text>`
- `/game whitelist remove user-id:<Steam_...|EOS_...> display-name:<text>`

## Architecture Boundary

The Discord Provider owns slash-command definitions, Discord authorization, interaction handling, input validation, response deferral, safe result parsing, and user-facing formatting.

The 7 Days to Die Provider owns Telnet communication, command execution, deterministic completion rules, event separation, timeout behavior, connection failures, and single-active-command enforcement.

No arbitrary console entry is exposed. Discord commands receive only the frozen `executeCommand` service boundary. Direct game-platform administration does not introduce a Module because no reusable cross-platform business policy has been proven.

## Verified v1.4.0 Behavior

### Hosted Player Kick

Live evidence approved exact positive online entity IDs and the fixed command:

```text
kick <online entity id> "<validated reason>"
```

The Provider completes on verified kick success or invalid-target output. Discord validates before Provider resolution and returns privacy-safe ephemeral results.

### Hosted Player Ban

Live evidence approved durable combined identifiers using `Steam_<id>` or `EOS_<id>` and the fixed command:

```text
ban add <durable user id> <duration> <unit> "<reason>" "<display name>"
```

A submitted Steam identifier may normalize to EOS in server output. Ordinary Discord responses never expose the submitted or normalized identifier.

### Hosted Player Unban

The workflow validates an exact display name, reads `ban list`, requires exactly one matching active entry, removes the exact stored UserID, reads `ban list` again, and reports success only when that stored UserID is absent.

The success-looking `removed from ban list` line is command completion only and is not sufficient proof of unban.

### Individual Whitelist Administration

Live evidence approved:

```text
whitelist add <durable user id> <display name>
whitelist remove <durable user id>
```

Verified behavior includes:

- first add activates whitelist-only mode
- duplicate add returns success without creating a duplicate row
- final removal disables whitelist-only mode before the removal-success line
- missing removal returns a deterministic not-whitelisted line
- entries persist across a normal server restart
- reload, path, login, authentication, performance, entity, inventory, and stack-trace lines are unrelated noise

Discord registration, dispatch, validation, timeout handling, malformed-result handling, privacy-safe formatting, and regression coverage are implemented.

## Live Verification

Live Discord-to-game verification passed against 7 Days to Die V3.1.0 b13.

Verified startup state:

- Discord connected
- 13 Discord commands loaded and registered
- 7 Days to Die Provider `RUNNING`
- framework startup successful

Verified whitelist outcomes:

- add succeeded through private Telnet
- duplicate add left exactly one stored row
- remove succeeded and disabled whitelist-only mode when removing the final entry
- repeated remove returned a safe private not-whitelisted response
- final whitelist state was empty

## Safety and Privacy Boundaries

The completed milestone does not include arbitrary console execution, free-form Telnet input, cross-platform identity linking, fuzzy player matching, continuous chat bridging, Economy-backed game effects, command queues, multiple servers, process supervision, or public Telnet exposure.

Ordinary Discord responses must not expose raw Telnet output, credentials, IP addresses, positions, health values, platform identifiers, socket details, configuration paths, or internal errors.

An explicitly authorized staff lookup or administration workflow may display requested Steam or EOS identifiers when operationally necessary. That visibility must remain permission-gated, purpose-limited, and private or ephemeral. It must not expose raw login or server-console output.

## Current Production Boundaries

- RSF supports a single-process SQLite deployment.
- Node.js 22.13 or newer is required for `node:sqlite`.
- The optional 7 Days to Die Provider supports one active command at a time through private raw Telnet.
- Kick, ban, verified unban, whitelist add, and whitelist remove are available through Discord.
- Continuous chat bridging, Economy-backed game effects, command queues, and multiple game servers remain future work.

## v1.4.0 Release Record

- Release pull request: `#56`
- Release merge commit: `8d9b7c9b50bdff7cab612e3905da7606c13f27e9`
- Annotated tag: `v1.4.0`
- Release validation: 0 production vulnerabilities, 435 passing tests, ESLint passing, and `git diff --check` clean

## Previous Release Record

- v1.3.0 release pull request: `#43`
- v1.3.0 release merge commit: `71e476641bb5026dfa4d41dbd88131db2326800b`
- Annotated tag: `v1.3.0`

## Next Step

Select and approve the next milestone before implementation begins. Candidate directions remain planning topics until a milestone is explicitly chosen.

## Release Notes

See `docs/Release-Notes-v1.4.0.md`.
