# Coding Standards

## Purpose

This document defines the coding standards for the Rogue Soldiers Framework.

The goal is to ensure every file in the project follows the same style, structure, and conventions.

---

# General Rules

- One class per file.
- Keep classes focused on a single responsibility.
- Prefer readability over clever code.
- Avoid duplicate code.
- Keep methods short and purposeful.
- Framework code should rarely require modification.

---

# File Organization

The filename should always match the class name.

Example:

DiscordProvider.js

contains

class DiscordProvider

---

# Naming

## Classes

PascalCase

Examples

DiscordProvider

EconomyModule

PermissionService

---

## Variables

camelCase

Examples

userId

guildMember

commandRegistry

---

## Constants

UPPER_CASE

Examples

DEFAULT_TIMEOUT

MAX_WARNINGS

---

# Methods

Method names should describe an action.

Examples

initialize()

start()

stop()

register()

execute()

Avoid abbreviations unless universally understood.

---

# Logging

Always use the framework Logger.

Good

Logger.info("Discord Connected");

Bad

console.log("Discord Connected");

---

# Error Handling

Never silently ignore exceptions.

Always:

- Handle them
- Log them
- Re-throw them

---

# Async

Prefer async/await over promise chains.

Avoid deeply nested callbacks.

---

# Documentation

Complex classes should explain:

- Purpose
- Responsibilities
- Important design decisions

---

# Git

Every completed implementation phase ends with:

- Testing
- Git Commit

Major milestones also receive Git tags.