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

Session cookies require HTTPS, so direct loopback browser login is intentionally unsupported. Reverse-proxy access logs should redact callback query strings. Sessions are intentionally lost on Provider shutdown or process restart. No Ticket access or staff permission mapping exists yet.

No reverse-proxy configuration is supplied by RSF in this checkpoint, and production deployment is not complete.

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
