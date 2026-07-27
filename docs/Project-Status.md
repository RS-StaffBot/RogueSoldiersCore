# Project Status

## Current Version

v1.0.0

## Current Milestone

v1.0.0 - Production Release

Status: Release closure in progress

## Last Completed Milestone

v0.9.0 - Website Provider

Status: Completed

## Completed Foundation

- Project Foundation and framework lifecycle
- Stable Core, Provider, Module, and Shared architecture
- Reusable Discord command framework
- Moderation Module and Discord moderation commands
- Economy Module and Discord economy commands
- Ticket Module with creator and staff Discord workflows
- Core-owned SQLite persistence and migrations
- Optional 7 Days to Die Provider connectivity
- Optional Website Provider with Discord OAuth and creator-owned Ticket listing

## Verified v1.0.0 Production Work

- GitHub Actions validation on pull requests and `main`
- Production process lifecycle, signal handling, rollback, and graceful shutdown
- Production configuration and secret-handling contract
- SQLite backup, checksum verification, restore, rollback, and recovery procedures
- Production logging and troubleshooting runbook
- Discord production deployment guide
- Website production deployment guide
- Production smoke-test checklist
- Production regression and security review
- Blocking high/critical production dependency audit in CI
- v1.0.0 release notes and version synchronization

## Automated Verification

The release branch is required to pass:

```powershell
npm.cmd ci
npm.cmd audit --omit=dev --audit-level=high
npm.cmd test
npm.cmd run lint
```

The latest completed regression before release closure contained 227 passing automated tests. The release-closure pull request must preserve or increase that passing count.

## Current Production Boundaries

- RSF supports a single-process SQLite deployment.
- The Discord Provider requires valid production credentials and network access.
- The optional 7 Days to Die Provider requires a protected private path and does not yet execute administrative commands.
- The Website Provider and Website authentication remain disabled by default.
- Public Website deployment requires an external HTTPS reverse proxy and exact Discord callback registration.
- Website sessions and pending OAuth attempts are intentionally lost on restart.
- Website functionality remains limited to implemented health, authentication, identity, logout, and creator-owned Ticket-listing routes.
- Cross-platform identity, game-server command control, Discord/game chat bridging, in-game Economy purchases, persistent Website sessions, clustering, and multi-community administration remain future work.

## Release Closure Requirements

Before v1.0.0 is tagged:

- All version locations must report `1.0.0`.
- The release-closure pull request must pass CI.
- The dependency audit, full automated tests, and lint must pass locally after merge.
- Documentation must match the merged repository.
- The working tree must be clean.
- The annotated `v1.0.0` tag must be created from the verified `main` commit and pushed to GitHub.

## Release Notes

See `docs/Release-Notes-v1.0.0.md` for the release summary, included capabilities, accepted boundaries, and final release procedure.
