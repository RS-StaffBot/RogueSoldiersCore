# Production Smoke-Test Checklist

## Purpose

This checklist is the final operator-facing verification for a Rogue Soldiers Framework production deployment.

Run it after installation, configuration, restoration, secret rotation, host migration, reverse-proxy changes, or a production release. Record the date, deployed commit, operator, and result for every section.

A failed required check blocks production acceptance. Stop, preserve the logs, correct the problem, and repeat the affected section plus the final restart checks.

## Test Record

Complete this information before testing:

```text
Date and time:
Operator:
Host:
Deployed commit SHA:
Expected RSF version:
Discord application ID:
Discord guild:
Website enabled: yes / no
Website authentication enabled: yes / no
7 Days to Die Provider enabled: yes / no
Database path:
Backup identifier created before deployment:
```

Never place tokens, client secrets, Telnet passwords, OAuth codes, session cookies, or full callback query strings in the test record.

## 1. Release and Host Preconditions

- [ ] The deployed commit is the reviewed commit intended for production.
- [ ] `git status --short` is empty.
- [ ] The checked-out branch or detached release commit is documented.
- [ ] Node.js is version 22.13.0 or newer.
- [ ] Dependencies were installed with `npm.cmd ci` for a clean production deployment, or the approved equivalent for the host.
- [ ] `npm.cmd test` passes.
- [ ] `npm.cmd run lint` passes.
- [ ] The process manager is configured to start RSF from the correct repository directory.
- [ ] Standard output and standard error are captured durably by the host.
- [ ] Log rotation, retention, and access control are configured outside RSF.
- [ ] The process manager does not expose secrets in command-line arguments or status pages.

Record:

```text
Node version:
Test result:
Lint result:
Process manager or service:
Log destination:
```

## 2. Configuration and Secret Preconditions

- [ ] `.env` exists on the production host and is excluded from Git.
- [ ] `DISCORD_TOKEN` is present and belongs to the intended Discord application.
- [ ] `DISCORD_CLIENT_ID` is present and matches the intended Discord application ID.
- [ ] No token or secret is stored in tracked JSON, committed files, shell history, screenshots, or the test record.
- [ ] Tracked configuration files contain only intended production-safe non-secret values.
- [ ] Optional Providers are enabled only when their complete production prerequisites are satisfied.
- [ ] The operator has reviewed `docs/Production-Configuration.md`.

When Website authentication is enabled:

- [ ] `DISCORD_CLIENT_SECRET` is present only in the production environment.
- [ ] `publicOrigin` is the exact canonical public HTTPS origin with no trailing slash.
- [ ] `discordGuildId` is the intended Rogue Soldiers guild ID.
- [ ] The registered Discord callback is exactly `<publicOrigin>/auth/discord/callback`.

When the 7 Days to Die Provider is enabled:

- [ ] `SEVEN_DAYS_TO_DIE_TELNET_PASSWORD` is present only in the production environment.
- [ ] The configured host and port target the intended game server.
- [ ] The management path is loopback, LAN, VPN, or another protected private route.
- [ ] The Telnet service is not exposed directly to the public internet.

## 3. Database Safety Preconditions

- [ ] The configured database path is confirmed.
- [ ] The data directory is writable by the production service account.
- [ ] A current offline backup exists before deployment or migration.
- [ ] The backup includes the main database and any applicable SQLite sidecar files copied after a graceful stop.
- [ ] Backup checksums were created and verified.
- [ ] The backup is stored outside the repository and, where practical, outside the production host.
- [ ] The operator has reviewed `docs/Database-Backup-Restore.md`.

Record:

```text
Database path:
Backup location or identifier:
Checksum verification result:
```

## 4. Controlled Startup

Start RSF through the production process manager or approved service wrapper.

- [ ] The process remains running and does not enter a restart loop.
- [ ] The framework startup banner and expected version appear.
- [ ] Configuration loads without exposing secret values.
- [ ] Database initialization and migrations complete without error.
- [ ] Modules load successfully.
- [ ] Required Providers load successfully.
- [ ] No unexpected stack trace, unhandled rejection, or uncaught exception appears.
- [ ] The final framework startup success message appears.

If startup fails:

1. Stop automatic restart attempts.
2. Preserve standard output and standard error.
3. Review `docs/Production-Logging-Troubleshooting.md`.
4. Correct the underlying configuration, permission, network, database, or dependency problem.
5. Repeat this section from a stopped state.

Record:

```text
Startup time:
Process ID or service instance:
Framework version shown:
Unexpected warnings or errors:
```

## 5. Discord Provider

The Discord Provider is required for the current RSF production deployment.

### Connection and Registration

- [ ] Logs show `Discord Connected`.
- [ ] The logged-in bot tag is the intended production bot.
- [ ] The connected server count is expected.
- [ ] Logs show the expected number of loaded Discord commands.
- [ ] Logs show global slash-command registration started.
- [ ] Logs show global slash commands registered successfully.
- [ ] No invalid-token, invalid-application-ID, gateway, or REST registration error appears.

Global Discord commands can take time to become visible after registration. Delayed visibility alone is not proof of failure when registration completed successfully.

### Discord Application and Guild State

- [ ] The bot is present in the intended Rogue Soldiers guild.
- [ ] The application was invited with the `bot` and `applications.commands` scopes.
- [ ] The bot role has only the permissions required for implemented operations.
- [ ] The bot role is above roles and members it must moderate.
- [ ] The bot is not granted unnecessary `Administrator` permission.
- [ ] Staff-only command access is tested with an authorized staff account.
- [ ] Unauthorized access is tested with a non-staff account where safe.

### Command Checks

Run checks in a designated production test channel using test accounts and reversible operations.

- [ ] `/ping` responds successfully.
- [ ] `/balance` returns the caller's Economy balance.
- [ ] `/daily` returns either a reward or the expected cooldown response.
- [ ] `/leaderboard` returns a bounded leaderboard response.
- [ ] `/ticket create` creates a test Ticket.
- [ ] `/ticket list` shows the creator's Ticket.
- [ ] `/ticket view` returns the test Ticket.
- [ ] `/ticket message` appends a test message.
- [ ] `/ticket close` closes the test Ticket.
- [ ] At least one authorized staff Ticket read operation succeeds.
- [ ] A safe moderation command is tested against a designated test account.
- [ ] The moderation action is reflected in Discord and recorded in RSF audit output.
- [ ] Self-target, owner, hierarchy, manageability, and permission denials behave as expected where safely testable.

Do not ban, kick, timeout, purge, alter Economy state, or close real member Tickets merely to satisfy this checklist. Use designated test users, test messages, and reversible actions.

Review `docs/Discord-Production-Deployment.md` for detailed Discord setup, permissions, token rotation, and rollback instructions.

## 6. Durable State and Restart Recovery

Use only designated test records.

Before restart:

- [ ] Identify a durable Moderation audit record or create a safe designated test record.
- [ ] Record a test Economy balance or transaction state without exposing private member information.
- [ ] Create or identify a test Ticket and record its ID and status.

Perform a graceful restart through the production process manager.

After restart:

- [ ] RSF starts successfully once and does not restart repeatedly.
- [ ] Discord reconnects and slash-command registration completes.
- [ ] The selected Moderation audit state remains available through the supported RSF path.
- [ ] The selected Economy state remains unchanged except for intentional test actions.
- [ ] The selected Ticket remains available with the expected status and messages.
- [ ] No unsafe migration replay, duplicate record creation, or ID reset is observed.
- [ ] Database health remains normal.

Record only non-secret test identifiers:

```text
Moderation test reference:
Economy test reference:
Ticket ID:
Restart result:
```

## 7. Optional 7 Days to Die Provider

Skip this section when the Provider is disabled.

- [ ] The Provider loads only after its configuration and password are present.
- [ ] The raw TCP connection reaches the intended protected game-server endpoint.
- [ ] Authentication and console readiness complete within the configured timeout.
- [ ] No password is printed in logs.
- [ ] An intentional RSF shutdown disconnects cleanly.
- [ ] A subsequent restart reconnects successfully.
- [ ] Unexpected connection loss is observable as a Provider error and does not expose secrets.

Current boundary checks:

- [ ] Operators understand that administrative command execution is not implemented.
- [ ] Player lookup, kick, ban, whitelist, Discord-to-game chat, and Economy-to-game effects are not represented as available features.
- [ ] No public Telnet exposure was introduced for testing.

## 8. Optional Website Provider

Skip this section when the Website Provider is disabled.

### Listener and Reverse Proxy

- [ ] RSF listens on the configured loopback address only, normally `127.0.0.1`.
- [ ] The RSF listener is not directly exposed to the public network.
- [ ] The external reverse proxy terminates HTTPS.
- [ ] The public certificate is valid for the canonical hostname.
- [ ] The reverse proxy forwards requests to the configured loopback port.
- [ ] Proxy logs redact OAuth callback query strings and sensitive cookie values.
- [ ] `GET /health` through the public HTTPS origin returns the expected healthy response.
- [ ] `GET /health` is understood to report Website transport readiness only.

### Authentication

Skip authentication checks when Website authentication is disabled.

- [ ] Login redirects to the intended Discord OAuth application.
- [ ] The callback URI exactly matches the registered callback.
- [ ] PKCE and one-time OAuth state complete without an error.
- [ ] A valid non-bot Rogue Soldiers guild member can authenticate.
- [ ] A non-member is rejected.
- [ ] A pending, bot, system, or guest identity is rejected where a controlled test identity is available.
- [ ] The RSF session cookie is opaque and has the expected secure attributes.
- [ ] `GET /api/me` returns only the allowlisted authenticated identity fields.
- [ ] `POST /auth/logout` succeeds only with the expected Origin and clears the session.
- [ ] A missing or invalid session receives `401`.

### Ticket Access

- [ ] An authenticated member can call `GET /api/tickets`.
- [ ] The response contains only the member's creator-owned Tickets.
- [ ] The response is newest first and bounded to at most 20 records.
- [ ] Each record contains only `ticketId`, `status`, and `createdAt`.
- [ ] A missing Ticket Module or operation failure returns a generic request-level `503` without internal details.
- [ ] No staff Ticket, Moderation, Economy, configuration, or administration endpoint is represented as implemented.

### Restart Behavior

- [ ] Operators understand that Website sessions and pending OAuth attempts are in memory.
- [ ] A graceful RSF restart invalidates existing Website sessions as currently designed.
- [ ] A user can authenticate again successfully after restart.

Review `docs/Website-Production-Deployment.md` for the complete listener, reverse-proxy, OAuth, cookie, secret rotation, and rollback contract.

## 9. Logging and Security Review

- [ ] Normal startup, Provider readiness, and shutdown events are captured.
- [ ] Errors include enough context to troubleshoot without exposing secrets.
- [ ] No Discord token, OAuth client secret, Telnet password, OAuth authorization code, session token, or cookie value appears in logs.
- [ ] Full Website callback query strings are not retained.
- [ ] Moderation audit output contains the expected operational evidence.
- [ ] Log files are readable only by authorized operators.
- [ ] Rotation prevents unbounded disk growth.
- [ ] Retention matches Rogue Soldiers operational requirements.
- [ ] Shared diagnostic extracts are redacted before distribution.

## 10. Graceful Shutdown

Stop RSF through the production process manager using its normal termination mechanism.

- [ ] The framework begins controlled shutdown.
- [ ] Website connections stop within the configured shutdown boundary when enabled.
- [ ] Website sessions and pending OAuth attempts are cleared when enabled.
- [ ] The 7 Days to Die client disconnects when enabled.
- [ ] The Discord client is destroyed cleanly.
- [ ] The database closes cleanly.
- [ ] The process exits without an uncaught exception.
- [ ] The process manager does not misclassify the intentional stop as a crash.

Start RSF once more and confirm:

- [ ] Startup succeeds.
- [ ] Discord reconnects.
- [ ] Optional enabled Providers recover.
- [ ] Durable Module state remains available.
- [ ] No restart loop occurs.

## 11. Rollback Readiness

Before accepting production:

- [ ] The previously known-good commit or release is recorded.
- [ ] The pre-deployment database backup is available and checksum-verified.
- [ ] The operator knows how to stop RSF before database replacement.
- [ ] The operator knows which configuration and environment changes must be reversed.
- [ ] Discord token, OAuth client secret, or Telnet password rotation procedures are available if exposure is suspected.
- [ ] The rollback procedure does not require editing SQLite directly.
- [ ] The rollback procedure preserves logs from the failed deployment.

## 12. Acceptance

Production acceptance requires all applicable required checks to pass.

```text
Required sections passed:
Skipped optional sections and reason:
Known accepted limitations:
Outstanding follow-up items:
Final restart completed at:
Operator approval:
Reviewer approval:
```

Current accepted product boundaries include:

- 7 Days to Die administrative command execution and player administration are not implemented.
- Discord-to-game communication is not implemented.
- Economy-to-game purchases are not implemented.
- Website staff administration, persistent sessions, broader Module routes, and frontend management are not implemented.
- Discord Ticket channels, threads, transcripts, and broader appeal infrastructure are not implemented.
- The current deployment model is single-process with SQLite.

Do not mark the deployment accepted by claiming future or unimplemented behavior passed testing.