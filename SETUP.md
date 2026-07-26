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
