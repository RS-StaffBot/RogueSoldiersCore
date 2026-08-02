# Rogue Soldiers Framework v1.0.0 Release Notes

## Release Summary

Rogue Soldiers Framework v1.0.0 is the first production release candidate for the Rogue Soldiers Clan ecosystem.

The release combines the verified Discord command framework, Moderation, Economy, Tickets, SQLite persistence, optional 7 Days to Die connectivity, and the optional Website Provider with the production operations documentation completed during the v1.0.0 milestone.

## Included Capabilities

### Framework and lifecycle

- Modular Core, Provider, Module, and Shared boundaries
- Controlled startup, rollback, signal handling, and graceful shutdown
- Configuration validation before external systems start
- GitHub Actions validation for pull requests and `main`

### Discord

- Reusable slash-command loading, registration, and interaction handling
- Moderation commands: `/ban`, `/kick`, `/warn`, `/timeout`, `/untimeout`, and `/purge`
- Economy commands: `/balance`, `/daily`, and `/leaderboard`
- Creator and staff Ticket command workflows
- Permission, hierarchy, self-target, owner, and manageability enforcement

### Persistent Modules

- SQLite-authoritative Moderation audit records
- Durable Economy accounts, transactions, transfers, daily claims, and leaderboards
- Durable Tickets, messages, assignment, status, and restart recovery
- Ordered transactional migrations and controlled database shutdown

### Optional Providers

- Optional 7 Days to Die Telnet connectivity with protected-network requirements
- Optional loopback-only Website Provider
- Discord OAuth with PKCE, one-time state, guild membership enforcement, secure cookies, and in-memory sessions
- Authenticated identity lookup, logout, and creator-owned Ticket listing

### Production operations

- Production configuration and secret-handling contract
- Database backup and restore procedure
- Logging and troubleshooting runbook
- Discord production deployment guide
- Website production deployment guide
- Production smoke-test checklist
- Regression and security review
- Blocking high/critical production dependency audit in CI

## Verified Release Gates

The release branch must pass all of the following before merge:

```powershell
npm.cmd ci
npm.cmd audit --omit=dev --audit-level=high
npm.cmd test
npm.cmd run lint
```

The production smoke-test checklist must also be completed against the actual deployment before the deployment is accepted as operational.

## Accepted v1.0.0 Boundaries

- The supported database model is one RSF process using one SQLite database.
- Website authentication and the Website Provider remain disabled by default.
- Website TLS termination and reverse-proxy configuration remain external deployment responsibilities.
- Website sessions and pending OAuth attempts are intentionally lost on restart.
- Website functionality is limited to implemented identity, logout, health, and creator-owned Ticket-listing routes.
- The 7 Days to Die Provider does not yet execute administrative commands or bridge Discord and in-game chat.
- Cross-platform identity, game-server Economy purchases, persistent Website sessions, clustering, and multi-community administration remain future work.

## Release Procedure

1. Merge the validated release-closure pull request into `main`.
2. Synchronize the local `main` branch.
3. Confirm all version files report `1.0.0`.
4. Run the final audit, test, and lint commands.
5. Confirm the working tree is clean.
6. Create and push the annotated `v1.0.0` Git tag.

Do not tag the release before every required gate has passed and the repository documentation matches the merged implementation.
