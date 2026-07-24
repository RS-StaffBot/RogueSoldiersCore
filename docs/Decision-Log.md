# Decision Log

This document records significant architectural decisions.

Only long-term decisions belong here.

---

## Discord is a Provider

Reason

Discord is an external platform.

Business logic belongs inside Modules.

---

## Shared Layer Added

Reason

Shared models, events, permissions, errors, and utilities should not belong to Core, Providers, or Modules.

---

## Stable Documentation Structure

Reason

Documentation is maintained alongside the project and serves as the source of truth.

---

## Architecture Change Rule

Major architectural changes are only made when at least two of the following are true:

- Long-term benefit
- Architectural improvement
- Last practical opportunity

---

## Milestone Workflow

Every milestone follows:

Design

↓

Implement

↓

Test

↓

Git Commit

↓

Update Documentation

↓

Next Milestone