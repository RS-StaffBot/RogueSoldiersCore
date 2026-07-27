# Rogue Soldiers Framework Setup

## Requirements

| Software | Required Version |
|----------|------------------|
| Node.js | 22.13.0 or newer |
| npm | Compatible with the installed Node.js release |
| Git | Current supported release |

## Install Dependencies

From the repository root:

```powershell
Set-Location D:\RogueSoldiersCore
npm.cmd install
```

## Configure the Environment

Copy the provided environment template:

```powershell
Copy-Item -LiteralPath .env.example -Destination .env
```

Set `DISCORD_TOKEN` and `DISCORD_CLIENT_ID` in `.env` before connecting the Discord Provider. Do not commit `.env`.

For the complete production configuration and secret-handling contract, read `docs/Production-Configuration.md`.

## Website Authentication Configuration

Website authentication is disabled by default in the tracked local configuration. While it remains disabled, no public domain, Discord guild ID, OAuth client secret, or other authentication deployment value is required.

Do not commit `.env`, and do not put secrets in tracked JSON. The tracked Website configuration is safe for local development in its disabled state. Do not invent placeholder domains, guild IDs, client IDs, secrets, or lifetime values merely to populate optional fields.

Enabling Website authentication activates real Discord OAuth behavior. Do not enable it with placeholder values.

An enabled deployment requires:

- A canonical public HTTPS origin without a trailing slash
- The Rogue Soldiers Discord guild ID
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`

The callback URI is derived exactly as:

```text
<publicOrigin>/auth/discord/callback
```

Register that callback URI exactly in the Discord Developer Portal. The browser must access RSF through an HTTPS reverse proxy; `WebsiteServer` itself remains bound to `127.0.0.1`. Do not expose the loopback listener directly, trust or invent forwarded headers, or place the client secret in tracked JSON.

Session cookies require HTTPS, so direct loopback browser login is intentionally unsupported. Reverse-proxy access logs should redact callback query strings. Sessions are intentionally lost on Provider shutdown or process restart. Authenticated creator-owned Ticket listing is available through `GET /api/tickets`; staff Ticket access and Website permission mapping are not implemented.

No reverse-proxy configuration is supplied by RSF in this checkpoint, and production deployment is not complete.

## Optional 7 Days to Die Provider

The 7 Days to Die Provider is disabled by default. Its non-secret settings are in `config/providers/sevendaystodie.json`, and its Telnet password is supplied through `SEVEN_DAYS_TO_DIE_TELNET_PASSWORD` in `.env`.

Missing game-server settings do not affect framework startup while the Provider is disabled. Enabling it requires a valid host, port, positive connection timeout, and non-empty password.

The raw TCP management connection is unencrypted. Use loopback, a LAN, a VPN, or another protected private path; do not expose the Telnet service or password to the public internet.

Automated tests use fake clients and sockets and do not require a live game server.

## Database Operations

The default SQLite database is stored at `data/rogue-soldiers.sqlite3` and is excluded from Git.

Before production use, read `docs/Database-Backup-Restore.md`. It defines the supported offline backup, checksum verification, restore, rollback, and smoke-test procedure.

## Logging and Troubleshooting

RSF currently writes human-readable logs to standard output and standard error. The production process manager or service wrapper must provide durable capture, rotation, retention, and access control.

Before production use, read `docs/Production-Logging-Troubleshooting.md`. It defines the current logging contract, secret-redaction rules, normal startup and shutdown evidence, restart-loop handling, and Provider-specific troubleshooting steps.

## Discord Production Deployment

Before deploying the Discord Provider into Rogue Soldiers production, read `docs/Discord-Production-Deployment.md`.

It defines the Discord application and bot setup, required OAuth2 scopes, least-privilege permissions, role hierarchy, production secret handling, command registration behavior, smoke testing, token rotation, and rollback procedure.

## Website Production Deployment

Before enabling the Website Provider in production, read `docs/Website-Production-Deployment.md`.

It defines the loopback-only listener contract, HTTPS reverse-proxy requirements, Discord OAuth callback setup, guild membership checks, secure cookie and in-memory session behavior, health and authentication smoke tests, secret rotation, and rollback procedure.

## Verify and Start

Run the automated tests:

```powershell
npm.cmd test
```

Run the configured lint check:

```powershell
npm.cmd run lint
```

Start the framework:

```powershell
npm.cmd start
```

Startup loads configuration, initializes the SQLite database and migrations, loads Modules and Providers, and connects the Discord Provider. A valid Discord configuration and network connection are required for that connection.
