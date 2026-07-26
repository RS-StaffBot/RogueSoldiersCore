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

## Verify and Start

Run the configured lint check:

```powershell
npm.cmd run lint
```

Start the framework:

```powershell
npm.cmd start
```

Startup loads configuration, initializes the SQLite database and migrations, loads Modules and Providers, and connects the Discord Provider. A valid Discord configuration and network connection are required for that connection.
