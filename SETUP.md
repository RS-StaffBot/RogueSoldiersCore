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

## Website Authentication Configuration

Website authentication is disabled by default in the tracked local configuration. While it remains disabled, no public domain, Discord guild ID, OAuth client secret, or other authentication deployment value is required. Leave `DISCORD_CLIENT_SECRET` empty until later authentication deployment instructions apply.

Do not commit `.env`, and do not put secrets in tracked JSON. The tracked Website configuration is safe for local development in its disabled state. Do not invent placeholder domains, guild IDs, client IDs, secrets, or lifetime values merely to populate optional fields.

Enabling Website authentication currently prevents framework startup by design. Enabled values are validated, but real Discord OAuth, callback handling, sessions, cookies, logout, and end-user login are not implemented.

For a future enabled deployment, `publicOrigin` must be the exact canonical HTTPS origin visible to users, without a trailing slash. The future callback URI is derived as:

```text
<publicOrigin>/auth/discord/callback
```

That callback will need to be registered exactly in the Discord developer portal after the authentication implementation and deployment instructions are complete. Its documented format does not imply that the login or callback route works today.

## Optional 7 Days to Die Provider

The 7 Days to Die Provider is disabled by default. Its non-secret settings are in `config/providers/sevendaystodie.json`, and its Telnet password is supplied through `SEVEN_DAYS_TO_DIE_TELNET_PASSWORD` in `.env`.

Missing game-server settings do not affect framework startup while the Provider is disabled. Enabling it requires a valid host, port, positive connection timeout, and non-empty password.

The raw TCP management connection is unencrypted. Use loopback, a LAN, a VPN, or another protected private path; do not expose the Telnet service or password to the public internet.

Automated tests use fake clients and sockets and do not require a live game server.

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
