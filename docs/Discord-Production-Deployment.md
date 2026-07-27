# Discord Production Deployment

## Purpose

This runbook defines the supported production deployment contract for the Rogue Soldiers Framework Discord Provider.

It covers Discord application setup, bot installation, required secrets, permissions, startup verification, command registration, token rotation, and rollback.

This guide describes the current repository behavior. It does not add deployment automation or change Discord Provider code.

---

## Current Discord Provider Contract

The Discord Provider:

- Uses the Discord bot token from `DISCORD_TOKEN`.
- Uses the Discord application ID from `DISCORD_CLIENT_ID`.
- Connects with the `Guilds` gateway intent.
- Loads the framework Discord commands during initialization.
- Registers slash commands globally during every successful startup.
- Stops by destroying the Discord client during graceful framework shutdown.

The Provider does not currently read the tracked `activity`, `activityType`, or `autoReconnect` values from `config/providers/discord.json`. Treat those values as reserved until runtime support is implemented.

---

## Required Discord Resources

Create one Discord application for the production RSF deployment.

The application must contain a bot user.

Record these values:

- Application ID
- Bot token

Store them only in the production secret environment:

```text
DISCORD_CLIENT_ID=<application-id>
DISCORD_TOKEN=<bot-token>
```

Do not place either value in tracked JSON, documentation, screenshots, tickets, chat messages, or Git history.

The Application ID is not normally treated as a password, but RSF keeps deployment values together in the environment contract. The bot token is a high-value secret and must never be shared.

---

## Discord Developer Portal Configuration

### Bot settings

Use the production application bot page to:

1. Confirm the bot user exists.
2. Keep the bot token private.
3. Disable public bot installation unless Rogue Soldiers intentionally wants other server owners to install it.
4. Do not enable privileged gateway intents unless a future tested feature requires them.

The current Discord Provider only requests the `Guilds` intent. Message Content, Guild Members, and Guild Presences are not required by the current implementation.

### Installation scopes

Generate an installation URL with these OAuth2 scopes:

```text
bot
applications.commands
```

The `applications.commands` scope allows slash commands to appear in the server.

### Bot permissions

Grant only the permissions required by the commands and workflows that Rogue Soldiers intends to operate.

The framework currently contains moderation commands that may perform actions such as bans, kicks, timeouts, and message purges. Those actions require the matching Discord permissions and correct role hierarchy.

Common permissions for the current moderation feature set include:

```text
View Channels
Send Messages
Read Message History
Manage Messages
Kick Members
Ban Members
Moderate Members
```

Do not grant `Administrator` merely to avoid configuring permissions. Add permissions deliberately and verify each command.

Discord role hierarchy also applies. The RSF bot role must be above the roles of members it needs to moderate. The bot cannot act on the server owner or on members whose highest role is equal to or above the bot's highest role.

---

## Install the Bot in Rogue Soldiers

1. Sign in to Discord with an account authorized to manage the Rogue Soldiers server.
2. Open the generated installation URL.
3. Select the Rogue Soldiers server.
4. Review the requested permissions.
5. Complete the authorization.
6. Confirm the bot appears in the server member list.
7. Move the bot role to the intended hierarchy position.
8. Restrict the bot from channels it does not need to access.

Do not install a production token into test communities unless the production access model explicitly permits it.

---

## Prepare the Production Host

Before starting RSF:

1. Install the supported Node.js version.
2. Clone or deploy the reviewed release commit.
3. Run:

```powershell
npm.cmd ci
```

4. Create `.env` from `.env.example`.
5. Set the production `DISCORD_TOKEN` and `DISCORD_CLIENT_ID`.
6. Confirm `.env` is excluded from Git.
7. Confirm the SQLite database and backup plan are ready.
8. Configure the process manager or service wrapper to capture standard output and standard error.
9. Configure graceful termination so RSF receives `SIGINT` or `SIGTERM`.

Read these runbooks before deployment:

```text
docs/Production-Configuration.md
docs/Database-Backup-Restore.md
docs/Production-Logging-Troubleshooting.md
```

---

## Pre-Deployment Validation

From the production release checkout, run:

```powershell
npm.cmd test
npm.cmd run lint
```

Both commands must pass before production startup.

Confirm the release checkout is clean:

```powershell
git status --short
git log -1 --oneline --decorate
```

Do not deploy an uncommitted working tree.

Confirm the environment file exists without printing secret values:

```powershell
Test-Path -LiteralPath .env
```

Expected result:

```text
True
```

Do not use commands that print the full `.env` file into logs or support conversations.

---

## First Production Startup

Start RSF through the selected production process manager or service wrapper.

For a direct controlled smoke test, run:

```powershell
npm.cmd start
```

A successful Discord startup should include evidence equivalent to:

```text
Loaded <number> Discord command(s).
Discord Connected
Logged in as <bot-tag>
Connected to <number> server(s).
Registering <number> Discord slash command(s)...
Discord slash commands registered.
Framework started successfully.
```

The exact command count may change as the repository evolves.

Startup is not considered successful when:

- The Discord token or application ID is missing.
- Discord rejects the bot login.
- The bot never becomes ready.
- Global command registration fails.
- The framework exits during Provider startup.

Use `docs/Production-Logging-Troubleshooting.md` when startup fails.

---

## Global Slash Command Registration

RSF currently registers commands through Discord's global application-command endpoint during startup.

Operational consequences:

- The production application ID must match the bot token's application.
- Every startup attempts to synchronize the current registered command definitions.
- Command changes may not appear instantly in every Discord client because global command propagation is controlled by Discord.
- Repeatedly restarting RSF is not a supported way to force propagation.
- A registration failure is startup-blocking and must be investigated.

Do not use a different application's ID with the production bot token.

---

## Discord Smoke Test

After successful startup:

1. Confirm the bot is online in Rogue Soldiers.
2. Confirm slash commands appear in an allowed test channel.
3. Run a harmless command such as `/ping`.
4. Confirm the bot responds.
5. Run one read-only or low-risk command such as `/balance` when available to the test account.
6. Confirm expected permission denials are handled without exposing secrets or stack traces to members.
7. Verify a controlled moderation command only against an approved test account when production staff authorize the test.
8. Confirm the action is reflected in Discord and in the framework logs.

Do not test bans, kicks, timeouts, purges, or warnings against real members without explicit approval.

---

## Role and Channel Verification

Verify the bot role has the intended server permissions and hierarchy.

For each command category:

- Confirm the bot can see the test channel.
- Confirm it can reply in the test channel.
- Confirm the invoking staff role has permission to use the command.
- Confirm the target test role is below the bot role.
- Confirm command failures do not leave partially completed moderation actions.

Use a dedicated staff-only testing channel for production verification.

---

## Token Rotation

Rotate the bot token immediately when:

- It is printed in a terminal recording or support log.
- It appears in Git history or an uploaded file.
- It is shared with an unauthorized person.
- A host or account with access is compromised.
- Discord reports suspicious use.

Supported rotation procedure:

1. Stop RSF gracefully.
2. Reset the bot token in the Discord Developer Portal.
3. Replace `DISCORD_TOKEN` in the production secret environment.
4. Confirm the old token is removed from password managers, deployment systems, and temporary files where practical.
5. Start RSF.
6. Confirm Discord connection and slash-command registration.
7. Run the Discord smoke test.
8. Record the incident and rotation time without recording either token.

Resetting the token invalidates the previous value. Do not restart RSF until the production environment contains the new token.

The Application ID normally remains unchanged during token rotation.

---

## Deployment Rollback

Rollback is appropriate when a new release fails validation or breaks Discord behavior.

1. Stop RSF gracefully.
2. Preserve current logs.
3. Follow the database rollback and restore rules when the failed release changed migrations or data.
4. Deploy the last known-good reviewed commit or release tag.
5. Run:

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run lint
```

6. Start RSF with the existing production secret environment.
7. Confirm Discord connection.
8. Confirm slash-command registration.
9. Run the Discord smoke test.

Do not rotate the bot token merely because application code is rolled back. Rotate it only when compromise or exposure is suspected.

---

## Common Deployment Failures

### Discord token and application ID are required

Cause:

- `DISCORD_TOKEN` or `DISCORD_CLIENT_ID` is missing or empty.

Action:

- Stop the restart loop.
- Correct the production secret environment.
- Restart once and inspect the full startup result.

### Invalid token or login rejection

Cause:

- Token copied incorrectly.
- Token was reset.
- Token belongs to another application.

Action:

- Verify the secret source without printing the value.
- Reset the token when its integrity cannot be trusted.

### Slash-command registration failure

Cause examples:

- Application ID does not match the token.
- Discord API connectivity failure.
- Token is invalid.
- Command definition is rejected.

Action:

- Preserve the complete error and stack trace.
- Verify the application ID and token belong together.
- Check Discord service availability and outbound network access.
- Do not repeatedly restart the process.

### Commands do not appear

Cause examples:

- Bot was installed without `applications.commands`.
- Global command propagation is still in progress.
- The wrong Discord application was installed.
- The Discord client cache has not refreshed.

Action:

- Confirm startup logged successful global registration.
- Confirm the installed application ID matches `DISCORD_CLIENT_ID`.
- Confirm the installation includes the required scope.
- Allow normal propagation time before changing code.

### Moderation command is denied

Cause examples:

- Bot lacks the required Discord permission.
- Bot role is below the target role.
- Target is the server owner.
- Invoking staff member lacks command permission.

Action:

- Correct the minimum required permission or role hierarchy.
- Do not solve permission errors by granting unrestricted Administrator access.

---

## Production Security Rules

- Never commit `.env`.
- Never log the Discord bot token or client secret.
- Never paste secrets into Discord, GitHub issues, tickets, or screenshots.
- Restrict Developer Portal access to authorized administrators.
- Require strong authentication and multi-factor authentication on privileged Discord and GitHub accounts.
- Grant the bot only the Discord permissions it needs.
- Keep the production bot role below trusted administrative roles unless a specific moderation workflow requires otherwise.
- Review unexpected bot installations, token resets, and permission changes as security events.
- Preserve logs according to `docs/Production-Logging-Troubleshooting.md`.

---

## Deployment Completion Checklist

A Discord production deployment is complete only when:

- Tests pass.
- Lint passes.
- The deployed commit is known and reviewed.
- The working tree is clean.
- Production secrets are stored outside Git.
- The bot is installed in Rogue Soldiers with `bot` and `applications.commands` scopes.
- Bot permissions follow least privilege.
- Role hierarchy supports approved moderation actions.
- RSF connects successfully.
- Slash commands register successfully.
- `/ping` succeeds in the production test channel.
- Approved command checks succeed.
- Graceful shutdown has been verified.
- Durable log capture is active.
- Database backup and restore procedures are available.
- Rollback instructions and the previous known-good release are available.
