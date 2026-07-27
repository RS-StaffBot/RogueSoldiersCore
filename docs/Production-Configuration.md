# Production Configuration

## Purpose

This document defines the production configuration and secret-handling contract for Rogue Soldiers Framework (RSF).

Tracked JSON configuration belongs under `config/`. Secrets belong in environment variables or an untracked local `.env` file. Real credentials must never be committed.

RSF loads JSON relative to the process working directory, so production must start the framework from the repository root unless an equivalent deployment layout is deliberately maintained.

## Startup-Blocking Matrix

| Area | Enabled condition | Required values | Startup behavior |
| --- | --- | --- | --- |
| Discord | Always loaded | `DISCORD_TOKEN`, `DISCORD_CLIENT_ID` | Missing or empty values fail framework startup. |
| 7 Days to Die | `providers.sevendaystodie.enabled` is `true` | Valid tracked host, port, timeout, plus `SEVEN_DAYS_TO_DIE_TELNET_PASSWORD` | Invalid configuration, missing password, or connection failure fails framework startup. |
| Website server | `providers.website.enabled` is `true` | Valid loopback host, port, request timeout, and shutdown timeout | Invalid configuration or server startup failure fails framework startup. |
| Website authentication | Website enabled and `providers.website.authentication.enabled` is `true` | Valid public origin, guild ID, timeout/lifetime settings, `DISCORD_CLIENT_ID`, and `DISCORD_CLIENT_SECRET` | Invalid configuration or missing credentials fails framework startup. |
| Database | Always required | Valid `core.database` object | Invalid configuration, migration failure, open failure, or health-check failure fails framework startup. |

A Provider with `enabled: false` is intentionally omitted and must not require its conditional secret.

## Environment Variables

### Required Discord values

```dotenv
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
```

`DISCORD_TOKEN` is secret. `DISCORD_CLIENT_ID` is not normally sensitive, but it remains deployment configuration and must be accurate.

### Conditional Website authentication secret

```dotenv
DISCORD_CLIENT_SECRET=
```

This is required only when Website authentication is enabled. The Website Provider reuses `DISCORD_CLIENT_ID` from the Discord configuration.

### Conditional 7 Days to Die secret

```dotenv
SEVEN_DAYS_TO_DIE_TELNET_PASSWORD=
```

This is required only when the 7 Days to Die Provider is enabled.

### Optional process values

```dotenv
NODE_ENV=development
# NO_COLOR=1
```

`NO_COLOR` disables ANSI terminal colors when present.

`NODE_ENV` is currently reserved for deployment tooling and future behavior. The current RSF runtime does not branch on its value, so changing it does not currently enable a separate production mode.

## Secret Handling Rules

- Never commit a populated `.env` file.
- Never place bot tokens, OAuth client secrets, Telnet passwords, session material, or other credentials in tracked JSON.
- Give the production service account read access only to the secret source it needs.
- Rotate a credential immediately if it appears in Git history, logs, screenshots, tickets, or chat.
- Restart RSF after changing environment variables because configuration is read during process startup.
- Do not print real credentials during troubleshooting.

## Discord Configuration

Discord is always loaded.

Required environment values:

- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`

The current Discord client uses the `Guilds` gateway intent. Slash commands are registered during startup after the client becomes ready.

`config/providers/discord.json` currently contains `activity`, `activityType`, and `autoReconnect`. These values are reserved configuration and are not active controls in the current `DiscordProvider`. Operators must not assume that changing them changes runtime behavior.

## 7 Days to Die Configuration

Default tracked configuration:

```json
{
    "enabled": false,
    "host": "",
    "port": 8081,
    "connectionTimeoutMs": 10000
}
```

When enabled:

- `host` must be a non-empty string.
- `port` must be an integer from `1` through `65535`.
- `connectionTimeoutMs` must be a positive integer.
- `SEVEN_DAYS_TO_DIE_TELNET_PASSWORD` must be present and non-empty.

An enabled Provider attempts the connection during framework startup. Failure is startup-blocking.

## Website Configuration

Default tracked configuration keeps the Provider and authentication disabled.

When the Website Provider is enabled:

- `host` must equal `127.0.0.1`.
- `port` must be an integer from `1` through `65535`.
- `requestTimeoutMs` must be a positive safe integer.
- `shutdownTimeoutMs` must be a positive safe integer.

RSF intentionally binds the Website Provider to loopback. Public access requires an external HTTPS reverse proxy.

### Website authentication

When authentication is enabled:

- `publicOrigin` must be a canonical HTTPS origin such as `https://community.example.com`.
- It must not contain credentials, a path, query, fragment, trailing slash, or surrounding whitespace.
- `discordGuildId` must be a valid positive Discord snowflake string.
- `DISCORD_CLIENT_ID` must be a valid positive Discord snowflake string.
- `DISCORD_CLIENT_SECRET` must be present and non-empty.
- `discordRequestTimeoutMs` must be between `1` and `60000`.
- `oauthStateLifetimeMs` must be between `60000` and `900000`.
- `sessionIdleLifetimeMs` must be between `60000` and `86400000`.
- `sessionAbsoluteLifetimeMs` must be between `60000` and `604800000` and must not be less than the idle lifetime.

The Discord OAuth callback is derived as:

```text
<publicOrigin>/auth/discord/callback
```

That exact callback must be registered in the Discord application.

## Database Configuration

Default tracked configuration:

```json
{
    "provider": "sqlite",
    "filename": "data/rogue-soldiers.sqlite3",
    "autoMigrate": true
}
```

Rules:

- `provider` must equal `sqlite`.
- `filename` must be non-empty.
- File-backed databases must use `.db`, `.sqlite`, or `.sqlite3`.
- Relative paths must remain inside the process working directory.
- `autoMigrate` must be boolean.
- Only one production RSF process may own the SQLite deployment boundary.

RSF creates the parent directory when necessary, enables foreign keys, uses WAL mode for file-backed databases, applies enabled migrations, and performs a health check before startup succeeds.

`autoMigrate: false` is supported by configuration validation, but production operators must ensure the database schema is already compatible before startup.

## Core Application and Logging JSON

`config/core/app.json` supplies the framework name and displayed version. Version updates must remain synchronized with the release process.

`config/core/logging.json` currently describes intended logging settings, but the current Logger writes to the terminal only. The `file` field does not currently create or manage log files, and operators must use their process manager or hosting platform for persistent log capture and retention.

## Safe Production Preparation

1. Copy `.env.example` to an untracked `.env` or configure equivalent service-level environment variables.
2. Populate only the secrets and identifiers required by enabled Providers.
3. Review every tracked file under `config/`.
4. Keep optional Providers disabled until their full tracked configuration and conditional secrets are ready.
5. Confirm the production account can read the repository and secrets and can write the configured database directory.
6. Start RSF from the repository root.
7. Treat any configuration validation error as authoritative; correct the value instead of bypassing validation.
8. Verify Discord readiness and any enabled Provider readiness before considering deployment successful.

## Current Boundaries

The current configuration system does not provide:

- runtime configuration reloads
- environment-specific JSON overlays
- automatic secret rotation
- a remote secret manager integration
- active Discord presence configuration from `providers/discord.json`
- Logger-managed file output from `core/logging.json`

These are future capabilities and are not implied by the presence of reserved tracked settings.
