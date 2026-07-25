# Rogue Soldiers Framework Vision

## Purpose

Rogue Soldiers Framework, abbreviated RSF, is the central software foundation for the Rogue Soldiers Clan ecosystem.

The project is intended to support multiple connected community systems while keeping their platform integrations and business rules organized, reusable, and maintainable.

RSF is not intended to become one large Discord bot file.

It is intended to act as the coordinating framework behind:

- Discord community features
- Moderation systems
- Community economy
- Support and appeal tickets
- Member management
- Game-server integration
- Website and dashboard features
- Logging and operational tools

Not all of these systems are implemented yet.

They represent the long-term direction of the framework.

---

## Primary Goal

The primary goal is to support Rogue Soldiers Clan operations.

The framework should make it possible to add new community features without repeatedly rewriting the foundation.

Future features should primarily require:

- Adding new command classes
- Adding or extending Modules
- Adding focused Provider capabilities
- Adding Shared objects when reuse is required

Framework infrastructure should remain stable whenever practical.

---

## Design Priorities

RSF favors:

- Maintainability over shortcuts
- Clear responsibilities
- Reusable components
- Stable framework infrastructure
- Explicit lifecycle management
- Beginner-friendly development workflows
- Repository-first verification
- Incremental implementation
- Testable milestone completion

---

## Platform Independence

Business rules should not be permanently tied to Discord.

Discord is currently the first active external platform, but it remains a Provider.

Business features such as moderation, economy, and tickets belong in Modules.

This separation allows the same business capabilities to eventually support other platforms without moving platform-specific code into the Core framework.

---

## Current Verified Capabilities

As of the v0.3.1 command-framework consolidation, the repository supports:

- Framework startup and bootstrap
- Configuration loading from JSON files
- Environment-variable loading
- Shared component lifecycle states
- Provider loading and lifecycle management
- Module loading and lifecycle management
- Discord client connection
- Discord slash-command loading
- A single Discord command registry
- Dedicated slash-command registration
- Dedicated runtime interaction routing
- Working `/ping`
- Working `/help`

---

## Current Boundaries

The following systems are not yet implemented as complete features:

- Moderation
- Persistent economy
- Tickets
- Database persistence
- Game-server control
- Website integration
- Permission framework
- Audit logging
- Concrete framework events

Documentation must not describe these systems as operational until the repository proves that they exist.

---

## Success Standard

RSF should become a professional-quality framework that is suitable for long-term maintenance and expansion.

A successful feature should:

- Respect existing architecture
- Have one clear owner
- Avoid duplicate infrastructure
- Leave the repository working
- Include testing
- Include a focused Git commit
- Keep documentation synchronized with implementation
