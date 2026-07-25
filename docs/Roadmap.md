# Rogue Soldiers Framework Roadmap

## Current Status

**Repository Version:** v0.3.0

**Active Milestone:** v0.3.1 - Discord Command Framework Architecture Consolidation

The repository version remains v0.3.0 until version synchronization is completed during v0.3.1 closeout.

Moderation is paused until v0.3.1 is fully tested, documented, committed, and tagged.

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

Goal:

Build a reusable Discord slash-command framework.

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

Status: In Progress

Goal:

Consolidate the v0.3.0 command framework into one verified architecture before future commands depend on it.

Completed implementation:

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

Remaining closeout:

- Complete and verify documentation
- Synchronize version values to `0.3.1`
- Review `.env.example`
- Review dependency documentation
- Run final framework validation
- Commit final closeout changes
- Verify a clean working tree
- Create the `v0.3.1` tag

---

## v0.4.0 - Moderation Module

Status: Planned

Features:

- Ban
- Kick
- Warn
- Timeout
- Purge
- Audit logging
- Permission integration

Moderation must use the consolidated v0.3.1 command architecture.

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
