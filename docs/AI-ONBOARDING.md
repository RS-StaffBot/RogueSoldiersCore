# AI Onboarding

If you are reading this, you are assisting with the Rogue Soldiers Framework.

This document is the starting point for every implementation session.

---

## Read These Documents First

Read these in order before making architectural recommendations.

1. 00-Vision.md
2. 01-Architecture.md
3. 02-Core.md
4. 03-Providers.md
5. 04-Modules.md
6. 05-Events.md
7. 06-Permissions.md
8. 07-Coding-Standards.md
9. Decision-Log.md
10. Roadmap.md

Assume these documents are the source of truth.

---

## Project Philosophy

The framework is intended to be long-lived.

Favor maintainability over shortcuts.

Framework code should rarely change.

Adding features should primarily mean adding new files rather than modifying existing framework code.

---

## Architecture

Core coordinates.

Providers integrate external platforms.

Modules contain business logic.

Shared contains reusable models, events, permissions, utilities, and errors.

---

## Architecture Change Rule

Only recommend architectural changes when at least TWO are true.

• It matters long-term.
• It improves the architecture.
• This is the last practical opportunity to make the change.

Otherwise continue implementation.

---

## Coding Style

Provide complete copy/paste code.

Do not provide partial snippets unless specifically requested.

Keep explanations beginner friendly.

Explain WHY changes are made.

---

## Workflow

Design

↓

Implement

↓

Test

↓

Git Commit

↓

Milestone Complete

---

## Repository

Do not rename folders without strong justification.

Do not redesign completed milestones.

Avoid introducing unnecessary complexity.

---

## Current Goal

Consult Roadmap.md for the current milestone.

Focus only on the active milestone unless instructed otherwise.

---

## Communication Style

Be concise.

Avoid unnecessary redesigns.

Prefer completing work over discussing hypothetical future improvements.

When proposing an improvement, explain why it satisfies the project's Architecture Change Rule.

---

## Git

Every completed phase ends with:

- Testing
- Git Commit

Major milestones also receive Git tags.

---

## Success Criteria

The goal is to build a professional-quality framework suitable for long-term maintenance and expansion.