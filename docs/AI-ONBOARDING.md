# AI Onboarding

If you are reading this, you are assisting with the Rogue Soldiers Framework (RSF).

This document is the starting point for every implementation session.

---

# Read These Documents First

Before making recommendations, read these documents in order.

1. 00-Vision.md
2. 01-Architecture.md
3. 02-Core.md
4. 03-Providers.md
5. 04-Modules.md
6. 05-Events.md
7. 06-Permissions.md
8. 07-Coding-Standards.md
9. Decision-Log.md
10. Project-Status.md
11. Roadmap.md

Assume these documents are the project's source of truth.

---

# Repository First

The repository is always the source of truth.

Never assume a file, folder, class, method, or project structure exists.

When implementation depends on the current repository, request the relevant files before generating code.

Examples:

tree .\src /F

Get-Content <filename>

Always build upon the existing project rather than recreating it.

Prefer improving existing files over introducing duplicates.

---

# Verification First

Before implementing a feature:

- Read the relevant documentation.
- Review the existing repository.
- Confirm understanding.
- Then begin implementation.

Never guess.

---

# Repository Review

When beginning a new milestone:

1. Review the project documentation.
2. Review the current repository structure.
3. Confirm understanding.
4. Begin implementation.

---

# Architecture

Core coordinates.

Providers integrate external systems.

Modules contain business logic.

Shared contains reusable models, events, permissions, errors, and utilities.

---

# Architecture Freeze

Treat the documented architecture as stable.

Do not redesign the framework unless a proposed change satisfies the project's Architecture Change Rule.

Focus on implementing features within the approved architecture.

---

# Architecture Change Rule

Only recommend architectural changes when at least TWO of these are true:

- The change provides long-term value.
- The change improves the architecture.
- This is the last practical opportunity to make the change.

Otherwise continue implementation.

---

# Scope Control

Only work on the requested milestone.

Do not begin planning or implementing future milestones unless explicitly instructed.

Stay focused on the current objective.

---

# Version Awareness

Always consult:

- Project-Status.md
- Roadmap.md

Recommendations must align with the active milestone and current project version.

---

# Implementation Phases

Every phase must:

- Have one clear objective.
- Produce working code.
- Include testing instructions.
- Include a Git commit command.
- Leave the repository in a working state.

Do not leave partially implemented features.

---

# Code Delivery

Provide complete copy/paste code.

For every modification, explicitly state ONE of the following:

- Replace the entire file with:
- Replace the following class:
- Replace the following method:
- Replace lines X–Y with:
- Insert immediately before:
- Insert immediately after:

Never provide ambiguous instructions.

---

# Documentation

Documentation updates should always be delivered as complete file replacements.

Never provide partial documentation edits.

---

# Teaching Style

Assume the developer is learning software development.

Keep explanations beginner-friendly.

Explain WHY changes are being made.

Avoid unnecessary jargon.

Introduce one new concept at a time.

Provide enough detail to understand the decision without overwhelming the developer.

---

# Workflow

Every implementation phase follows:

Design

↓

Implement

↓

Test

↓

Git Commit

↓

Update Documentation (if required)

↓

Next Phase

---

# Git

Every completed implementation phase ends with:

- Testing
- Git Commit

Major milestones also receive Git tags.

---

# Project Philosophy

Favor maintainability over shortcuts.

Framework code should rarely change.

New features should primarily require adding new files rather than modifying framework code.

Do not rename folders or restructure the project without satisfying the Architecture Change Rule.

---

# New Chat Startup

When beginning a new implementation chat:

- Read this document first.
- Read the documentation it references.
- Use the repository as the source of truth.
- Ask for relevant files if needed.
- Do not assume implementation details.
- Begin with the active milestone shown in Project-Status.md.

---

# Success Criteria

The objective is to build a professional-quality framework suitable for long-term maintenance and expansion.

Always favor:

- Consistency
- Maintainability
- Clear architecture
- Reusable design
- Stable implementation