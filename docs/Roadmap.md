# Rogue Soldiers Framework Roadmap

## Current Status

**Repository Version:** v1.0.0

**Current Milestone:** v1.0.0 - Production Release

**Status:** Release closure in progress

## Completed Milestones

- v0.1.0 - Project Foundation
- v0.2.0 - Framework Online
- v0.2.1 - Architecture Stabilization
- v0.3.0 - Discord Command Framework
- v0.3.1 - Command Framework Architecture Consolidation
- v0.4.0 - Moderation Module
- v0.5.0 - Economy Module
- v0.6.0 - Tickets
- v0.7.0 - Database
- v0.8.0 - 7 Days to Die Provider
- v0.9.0 - Website Provider

## v1.0.0 - Production Release

Status: Release closure in progress

Completed production work:

- GitHub Actions validation for pull requests and `main`
- Production process lifecycle and graceful shutdown handling
- Production configuration and secret-handling contract
- SQLite backup and restore procedures
- Production logging and troubleshooting documentation
- Discord production deployment documentation
- Website production deployment documentation
- Production smoke-test checklist
- Production regression and security review
- Blocking high/critical production dependency audit in CI
- v1.0.0 release notes
- Version synchronization initiated

Remaining closure work:

- Synchronize every version location to `1.0.0`
- Pass the release-closure pull request validation
- Merge the release-closure pull request
- Run the final local dependency audit, automated tests, and lint against merged `main`
- Confirm the working tree is clean
- Create and push the annotated `v1.0.0` tag

## v1.0.0 Release Boundary

The production release includes the existing verified framework, Discord command infrastructure, Moderation, Economy, Tickets, SQLite persistence, optional 7 Days to Die connectivity, optional Website transport and authentication, and the production operating procedures required for a controlled Rogue Soldiers deployment.

The following remain outside v1.0.0:

- 7 Days to Die administrative command execution
- Player lookup and game-server moderation actions
- Discord-to-game and game-to-Discord chat bridging
- Economy purchases that produce in-game effects
- Persistent Website sessions
- Website staff workflows and broader Module administration
- Cross-platform identity mapping
- Multi-process or clustered database operation
- Multi-community administration

## Post-v1 Direction

Future milestones should be selected from demonstrated Rogue Soldiers operational needs rather than implemented speculatively.

Likely future areas include:

- Proving and implementing the 7 Days to Die command-response boundary
- Hosted game-server player administration
- Discord and in-game chat integration
- Economy-backed in-game rewards and purchases
- Ticket channels, transcripts, and appeal workflows
- Website staff controls and broader administration
- Persistent Website sessions and improved deployment operations
- Cross-platform identity mapping

Every future milestone must preserve the established architecture:

- Core coordinates framework infrastructure and lifecycle.
- Providers integrate external platforms and systems.
- Modules own reusable business logic.
- Shared contains proven cross-layer contracts and utilities.
