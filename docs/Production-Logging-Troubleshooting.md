# Production Logging and Troubleshooting

## Purpose

This runbook defines how Rogue Soldiers Framework (RSF) logs should be captured, retained, reviewed, and protected in production. It also provides a first-response troubleshooting path for common startup and runtime failures.

The current framework Logger writes human-readable messages to standard output and standard error. RSF does not currently create or rotate persistent log files itself.

## Current Logging Contract

`src/core/Logger.js` provides these log categories:

- `[INFO]` through standard output
- `[WARN]` through standard error
- `[ERROR]` through standard error
- `[MODERATION AUDIT]` through standard output

Color is used only when the destination stream is an interactive terminal and `NO_COLOR` is not set.

The tracked `config/core/logging.json` file is not an active runtime logging backend in the current implementation. Its `level`, `console`, and `file` values must not be treated as operational controls until code explicitly consumes them.

## Production Log Capture

Run RSF under a process manager or service wrapper that captures both standard output and standard error.

The hosting layer is responsible for:

- durable log storage
- timestamps, if the process manager adds them
- log rotation
- retention
- access control
- forwarding to a central logging system, when used
- alerting on repeated failures

Do not rely on an open PowerShell window as the only production log destination.

## Recommended Retention

A reasonable starting policy is:

- keep recent logs locally for 14 to 30 days
- rotate by size or daily, whichever occurs first
- keep enough history to investigate moderation disputes and restart loops
- move longer-term audit records to protected storage when policy requires it

Retention must match Rogue Soldiers operational and privacy requirements. Do not keep sensitive logs indefinitely without a defined reason.

## Secret and Sensitive Data Rules

Never intentionally log:

- `DISCORD_TOKEN`
- `DISCORD_CLIENT_SECRET`
- `SEVEN_DAYS_TO_DIE_TELNET_PASSWORD`
- OAuth authorization codes
- OAuth access tokens
- session identifiers
- cookie values
- full callback query strings
- database contents containing private member information

When sharing logs for troubleshooting:

1. Copy only the relevant time window.
2. Remove secrets, tokens, cookies, authorization codes, and private identifiers.
3. Preserve error text, timestamps, component names, and stack traces where safe.
4. Do not upload the `.env` file.
5. Do not upload the live SQLite database unless explicitly required and securely handled.

Treat moderation audit output as sensitive operational data. Limit access to authorized staff.

## Normal Startup Evidence

A healthy startup should show evidence that RSF:

1. loaded configuration
2. initialized the SQLite database
3. loaded Modules
4. loaded Providers
5. connected the Discord Provider
6. registered slash commands
7. reported successful framework startup

Optional Providers should only appear when enabled.

The exact number of loaded Modules, Providers, and commands may change as the project grows. Diagnose missing expected components rather than relying on one permanent count.

## Normal Shutdown Evidence

A graceful shutdown begins after `SIGINT` or `SIGTERM` and allows the application to stop its Providers, Modules, and database services.

A process manager should send a graceful signal first. Forced termination should only occur after the configured hosting timeout expires.

Repeated forced termination can interrupt cleanup and complicate SQLite backup or recovery operations.

## First-Response Checklist

When RSF fails or behaves unexpectedly:

1. Record the exact time of the failure.
2. Capture the first error and the messages immediately before it.
3. Check the process exit code.
4. Confirm the working directory is the repository root.
5. Confirm `node_modules` is installed with `npm.cmd install` or `npm.cmd ci`.
6. Confirm required environment values are present without printing their secret contents.
7. Review `docs/Production-Configuration.md`.
8. Check that optional Providers are only enabled with complete valid configuration.
9. Run `npm.cmd test` and `npm.cmd run lint` from a clean checkout.
10. Avoid repeated automatic restarts until the root cause is understood.

## Startup Failure: Discord Credentials

Typical message:

```text
Discord token and application ID are required.
```

Check:

- `.env` exists in the repository root
- `DISCORD_TOKEN` is present and non-empty
- `DISCORD_CLIENT_ID` is present and non-empty
- the process manager starts RSF with the expected working directory
- the service account can read the environment configuration

Do not print the token to verify it. Check only whether the variable exists and has a non-zero length.

If login is rejected despite both values being present, rotate or verify the Discord token in the Discord Developer Portal and update the production secret store.

## Startup Failure: Website Provider

When the Website Provider is disabled, Website configuration should not block startup.

When enabled, check:

- `host` is exactly `127.0.0.1`
- `port` is available
- request and shutdown timeouts are positive integers
- authentication settings are complete when authentication is enabled
- `publicOrigin` is canonical HTTPS with no trailing slash
- `discordGuildId` is a valid Discord snowflake
- `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` are available
- the registered Discord callback URI exactly matches `<publicOrigin>/auth/discord/callback`

If the port is already in use, identify and stop the conflicting process or assign a different valid port in tracked configuration.

## Runtime Failure: Website Health

When the Website Provider is enabled, query the loopback health endpoint from the host:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080/health
```

Adjust the port when production configuration differs.

A failed health request may indicate:

- RSF is not running
- the Website Provider is disabled
- startup failed before the server bound
- the configured port differs
- another process owns the port
- the process entered an error state after startup

Do not expose the loopback listener directly to the public internet.

## Startup Failure: 7 Days to Die Provider

When disabled, missing game-server values should not block startup.

When enabled, check:

- host is non-empty
- port is between 1 and 65535
- connection timeout is a positive integer
- `SEVEN_DAYS_TO_DIE_TELNET_PASSWORD` is present and non-empty
- the Telnet service is running
- firewalls and private-network routing allow the connection

The Telnet connection is unencrypted. Keep it on loopback, a trusted LAN, a VPN, or another protected private path.

Repeated connection failures should not be solved by exposing the Telnet port publicly.

## Startup Failure: SQLite

Check:

- `config/core/database.json` exists and is valid JSON
- provider is `sqlite`
- filename is non-empty and ends in `.db`, `.sqlite`, or `.sqlite3`
- relative paths remain inside the RSF working directory
- the service account can create and write to the database directory
- sufficient disk space is available
- another process is not improperly holding or copying the database

For suspected corruption or recovery, stop RSF and follow `docs/Database-Backup-Restore.md`.

Do not replace the live database while RSF is running.

## Restart Loops

A restart loop is repeated startup failure followed by automatic restart.

When detected:

1. Disable automatic restart temporarily or increase the restart delay.
2. Capture the first complete startup failure.
3. Check whether the exit code is non-zero.
4. Correct configuration, dependency, permission, port, or network problems.
5. Run one controlled foreground startup.
6. Re-enable automatic restart only after a successful controlled test.

Fast restart loops can overwrite useful logs, trigger external rate limits, and make the original error harder to find.

## Unexpected Shutdown

Check the final log entries for:

- a recorded `SIGINT` or `SIGTERM`
- Provider cleanup failures
- database shutdown failures
- process-manager timeout messages
- out-of-memory termination
- host restart or service-account changes

A graceful signal followed by successful cleanup is expected behavior. A non-zero exit or abrupt log ending requires investigation.

## Moderation Audit Troubleshooting

Moderation audit output should include enough context to understand the action without exposing secrets.

When an expected audit record is missing:

- confirm the moderation command completed successfully
- inspect the command error response
- check whether the process restarted before output was captured
- confirm the hosting layer captures standard output
- confirm log rotation did not remove the relevant time window

The current moderation audit output is console-based. Durable audit retention depends on the production hosting layer.

## Safe Diagnostic Commands

From the repository root:

```powershell
git status --short
git log -3 --oneline --decorate
node --version
npm.cmd --version
npm.cmd test
npm.cmd run lint
```

Check whether required variables exist without printing values:

```powershell
'DISCORD_TOKEN length: ' + ($env:DISCORD_TOKEN | ForEach-Object Length)
'DISCORD_CLIENT_ID length: ' + ($env:DISCORD_CLIENT_ID | ForEach-Object Length)
```

When `.env` is loaded by the application rather than the current PowerShell session, use a controlled local startup and rely on RSF validation errors instead of displaying the file contents in shared logs.

## Incident Record

For significant production incidents, record:

- start and end time
- affected Providers and Modules
- user-visible impact
- first error message
- exit code
- recent deployment or configuration changes
- recovery action
- whether data restore was required
- follow-up prevention work

Do not include secrets in the incident record.

## Operational Boundary

This runbook documents the current console logging behavior. It does not add:

- an in-framework file transport
- structured JSON logs
- remote log shipping
- persistent Website sessions
- a dedicated audit database
- automatic alert delivery

Those capabilities require separate reviewed implementation work.