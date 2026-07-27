# Website Production Deployment

## Purpose

This runbook defines the supported production deployment contract for the Rogue Soldiers Framework Website Provider.

The Website Provider is disabled by default. Enabling it exposes the framework HTTP service on a loopback listener and, when authentication is enabled, activates real Discord OAuth behavior.

This guide does not provide a ready-made reverse-proxy configuration. The hosting operator is responsible for the HTTPS edge, certificates, request logging, service supervision, firewall rules, and public DNS.

## Current Production Boundary

The current Website Provider:

- binds to `127.0.0.1` by default
- serves `/health`
- can use Discord OAuth authorization code flow with PKCE S256
- validates Discord guild membership
- stores opaque sessions in memory
- uses secure browser cookies
- exposes authenticated `GET /api/me`
- exposes authenticated creator-owned `GET /api/tickets`
- supports exact-origin logout

The current Website Provider does not provide:

- a public TLS listener
- reverse-proxy configuration
- persistent sessions
- staff Ticket administration
- Website permission mapping
- a complete front-end application
- multi-instance session sharing

## Required Files and Secrets

Tracked Website settings are stored in:

```text
config/providers/website.json
```

Secrets remain outside tracked JSON:

```text
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
```

`DISCORD_CLIENT_ID` is also required by the Discord Provider during normal framework startup.

Never commit `.env`, OAuth client secrets, production cookies, authorization codes, session identifiers, or callback query strings.

## Baseline Configuration

The tracked configuration is safe because the Provider and authentication are disabled:

```json
{
  "enabled": false,
  "authentication": {
    "enabled": false,
    "publicOrigin": "",
    "discordGuildId": "",
    "discordRequestTimeoutMs": 10000,
    "oauthStateLifetimeMs": 600000,
    "sessionIdleLifetimeMs": 1800000,
    "sessionAbsoluteLifetimeMs": 28800000
  },
  "host": "127.0.0.1",
  "port": 8080,
  "requestTimeoutMs": 10000,
  "shutdownTimeoutMs": 5000
}
```

For production, keep `host` set to `127.0.0.1`. The reverse proxy should be the only public listener.

## Public Origin

When authentication is enabled, `publicOrigin` must be the exact canonical HTTPS origin used by browsers.

Valid example:

```text
https://community.example.com
```

Do not include a trailing slash, path, query string, HTTP origin, internal loopback address, or alternate hostname that browsers will not use.

The Website Provider derives the OAuth callback URI exactly as:

```text
<publicOrigin>/auth/discord/callback
```

Register that exact callback URI in the Discord Developer Portal.

## Discord Guild Configuration

Set `authentication.discordGuildId` to the Rogue Soldiers Discord guild ID.

Authenticated users must complete Discord OAuth and pass the configured guild membership check. A valid Discord account alone is not sufficient when guild membership enforcement is enabled.

Do not confuse the Discord application ID, Discord guild ID, and Discord user ID. They are separate identifiers.

## Reverse Proxy Requirements

The reverse proxy must:

- terminate HTTPS
- present a trusted certificate for the canonical hostname
- forward traffic only to the loopback Website listener
- preserve the original request method and path
- enforce reasonable request and connection timeouts
- limit request body sizes
- prevent direct public access to port `8080`
- capture access and error logs securely
- redact OAuth callback query strings

Do not expose `127.0.0.1:8080` through public firewall rules or bind the Provider directly to `0.0.0.0` merely to avoid configuring a reverse proxy.

The current Website implementation does not rely on invented or blindly trusted forwarded headers. Do not add proxy behavior that changes the effective public origin without also updating the tracked canonical `publicOrigin`.

## Cookie and Session Contract

Authenticated sessions use secure cookies and therefore require HTTPS browser access.

Current sessions are opaque, stored in memory, bound to the running process, subject to idle and absolute expiry, and lost when the Website Provider or process restarts.

A restart forcing users to sign in again is expected behavior, not data corruption.

Do not deploy multiple active RSF Website instances behind one load balancer unless session behavior has first been redesigned for shared persistence.

## Recommended Deployment Sequence

1. Keep both `enabled` settings false while preparing infrastructure.
2. Configure DNS for the canonical hostname.
3. Install a trusted HTTPS certificate at the reverse proxy.
4. Configure the reverse proxy to reach `127.0.0.1:8080` only.
5. Block direct public access to the Website Provider port.
6. Set `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` in the production secret store or `.env`.
7. Set `authentication.publicOrigin` to the exact canonical HTTPS origin.
8. Set `authentication.discordGuildId` to the Rogue Soldiers guild ID.
9. Register the exact callback URI in the Discord Developer Portal.
10. Set `enabled` to `true`.
11. Set `authentication.enabled` to `true` only after all OAuth values are real and verified.
12. Start RSF under the production process manager.
13. Complete the smoke tests below.

## Health Check

The reverse proxy or host monitor may check:

```text
GET /health
```

A successful health response proves that the Website server is accepting HTTP requests. It does not prove that Discord OAuth, guild membership validation, session behavior, or Ticket access is working.

## Production Smoke Test

After deployment, verify all of the following:

1. RSF starts without configuration errors.
2. The Website Provider reports successful startup in the captured logs.
3. The public HTTPS origin loads without certificate warnings.
4. Direct public access to the internal Website port is blocked.
5. `/health` succeeds through the public reverse proxy.
6. Discord login redirects to the expected Discord application.
7. The callback returns only to the registered canonical HTTPS origin.
8. A Rogue Soldiers guild member can sign in.
9. A non-member is denied.
10. `/api/me` returns the authenticated user only after login.
11. `/api/tickets` returns only creator-owned Ticket summaries.
12. Logout invalidates the active session.
13. A process restart requires the user to sign in again.
14. Reverse-proxy logs do not retain OAuth codes or state values.

## Ticket API Boundary

The current authenticated Ticket endpoint is:

```text
GET /api/tickets
```

Its current production boundary is intentionally narrow:

- the authenticated Discord user is the actor
- access is creator-owned
- staff-wide Ticket access is not implemented
- Website permission mapping is not implemented
- pagination behavior is fixed by the current service contract
- the response exposes only approved Ticket summary fields

Do not describe this endpoint as a staff administration portal.

## Secret Rotation

When rotating the Discord OAuth client secret:

1. Schedule a maintenance window.
2. Create or reset the client secret in the Discord Developer Portal.
3. Update `DISCORD_CLIENT_SECRET` in the production secret store.
4. Restart RSF gracefully.
5. Confirm `/health`.
6. Complete a new Discord login.
7. Inspect logs for OAuth failures without exposing the secret.
8. Revoke the old secret if Discord provides an overlap period.

## Rollback

If the Website deployment fails:

1. Set `authentication.enabled` to `false` to disable OAuth behavior while retaining an internal health endpoint, or set the Provider `enabled` value to `false` to disable the Website Provider completely.
2. Gracefully restart RSF.
3. Confirm Discord and other enabled Providers still start normally.
4. Revert the reverse-proxy route if it exposes an unhealthy upstream.
5. Preserve sanitized logs for diagnosis.
6. Restore the last known-good tracked configuration.

Do not solve a failed deployment by exposing the internal listener publicly or weakening cookie security.

## Common Failures

### Invalid Website authentication configuration

Check that `publicOrigin` is canonical HTTPS without a trailing slash, `discordGuildId` is present, both Discord OAuth values are present, and configured lifetime and timeout values remain positive.

### Discord reports an invalid redirect URI

The callback registered in Discord must exactly match:

```text
<publicOrigin>/auth/discord/callback
```

Compare scheme, hostname, port, path, and trailing slash exactly.

### Login succeeds but the user is denied

Confirm the configured value is the correct guild ID, the user is currently a member, the OAuth credentials belong to the intended production application, and Discord API requests are not timing out.

### Cookie is not stored

Confirm the browser is using the canonical HTTPS origin. Secure cookies are intentionally incompatible with direct plain-HTTP loopback browsing.

### Users are logged out after restart

This is expected. Sessions are in memory and are not persistent.

### `/api/tickets` returns unauthorized

Confirm the browser has a valid authenticated session. The endpoint is not anonymous and does not accept an arbitrary creator identity from the request.

### Reverse proxy returns a gateway error

Confirm RSF is running, the Website Provider is enabled, the Provider is listening on the configured loopback port, the proxy targets the correct host and port, and local security software is not blocking loopback communication.

## Logging and Incident Handling

Use `docs/Production-Logging-Troubleshooting.md` for durable log capture, retention, redaction, and incident evidence.

For Website incidents, redact OAuth authorization codes, OAuth state values, cookies, session identifiers, `DISCORD_CLIENT_SECRET`, `DISCORD_TOKEN`, and full callback query strings.

## Final Production Checklist

- Website Provider intentionally enabled
- authentication intentionally enabled or intentionally disabled
- listener remains loopback-only
- public DNS resolves correctly
- trusted HTTPS certificate installed
- direct public access to the internal port blocked
- canonical `publicOrigin` configured
- exact callback URI registered in Discord
- correct Discord guild ID configured
- Discord OAuth client secret stored outside Git
- reverse-proxy query-string redaction confirmed
- process supervision and log capture enabled
- health, login, guild membership, Ticket access, logout, and restart tests passed
- rollback procedure understood
