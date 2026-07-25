# Rogue Soldiers Framework Roadmap

## Current Status

**Repository Version:** v0.3.1

**Last Completed Milestone:** v0.3.1 - Discord Command Framework Architecture Consolidation

**Active Milestone:** v0.4.0 - Moderation Module

---

## v0.1.0 - Project Foundation

Status: Completed

Completed:

- Initial project structure
- Git repository
- Bootstrap
- Configuration
- Registry
- Core framework

---

## v0.2.0 - Framework Online

Status: Completed

Completed:

- Provider system
- Module system
- Discord Provider
- Discord bot connection
- Framework lifecycle

---

## v0.2.1 - Architecture Stabilization

Status: Completed

Completed:

- Shared layer structure
- Documentation structure
- Coding standards
- Stable architecture boundaries
- Git workflow

---

## v0.3.0 - Discord Command Framework

Status: Completed

Completed:

- BaseCommand
- CommandLoader
- Command Registry foundation
- Interaction Handler foundation
- Slash-command registration foundation
- Automatic command registration
- `/ping`
- `/help`

---

## v0.3.1 - Discord Command Framework Architecture Consolidation

Status: Completed

Completed:

- Strengthened the active Command Registry
- Added dedicated CommandRegistrar
- Activated InteractionHandler as the runtime dispatch owner
- Updated DiscordProvider to coordinate command components
- Removed the duplicate command registry
- Preserved Discord login
- Preserved automatic registration
- Preserved `/ping`
- Preserved `/help`
- Verified duplicate-command rejection
- Verified invalid-command rejection
- Verified one runtime interaction path
- Verified one slash-command registration path
- Synchronized version values to `0.3.1`
- Updated `.env.example`
- Removed unused direct dependencies
- Resolved the npm audit vulnerability
- Reconstructed architecture documentation
- Removed known character-encoding corruption

---

## v0.4.0 - Moderation Module

Status: Active

Goal:

Build the first complete business Module against the consolidated Discord command architecture.

Planned features:

- Ban
- Kick
- Warn
- Timeout
- Purge
- Audit logging
- Permission integration

Requirements:

- Moderation business logic belongs in the Moderation Module.
- Discord-specific interactions and API operations remain in the Discord Provider area.
- Permission requirements must be designed before protected actions are implemented.
- Each phase must include testing and a focused Git commit.
- Existing `/ping` and `/help` behavior must remain working.

---

## v0.5.0 - Economy Module

Status: Planned

Features:

- Balance
- Daily rewards
- Transfers
- Shop
- Transactions
- Leaderboards

The current Economy Module is only a lifecycle foundation.

---

## v0.6.0 - Ticket Module

Status: Planned

Features:

- Support tickets
- Appeals
- Transcripts
- Staff controls

---

## v0.7.0 - Database Layer

Status: Planned

Features:

- Persistence
- Repository pattern
- Automatic migrations
- Storage-provider decision based on current project requirements

SQLite is configured as a future provider value but is not currently implemented.

---

## v0.8.0 - 7 Days to Die Provider

Status: Planned

Features:

- Server connection
- Player management
- Economy integration
- Game events
- Discord-to-game messaging

---

## v0.9.0 - Website Provider

Status: Planned

Features:

- Dashboard
- Authentication
- Live status
- Economy access
- Ticket access

---

## v1.0.0 - Production Release

Status: Planned

Release requirements:

- Stable framework
- Documentation complete
- Testing complete
- Deployment ready
- Community ready

---

## Development Workflow

Every milestone follows:

```text
Design
    |
    v
Implement
    |
    v
Test
    |
    v
Git Commit
    |
    v
Update Documentation
    |
    v
Final Verification
    |
    v
Tag Milestone
    |
    v
Begin Next Milestone
```
