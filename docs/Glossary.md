# Glossary

## Moderation Module

The Module that owns supported moderation actions, action-to-permission mapping, audit-record creation, and in-memory audit storage.

## Moderation Action

A supported operation: `BAN`, `KICK`, `WARN`, `TIMEOUT`, `UNTIMEOUT`, or `PURGE`.

## Moderation Permission

A reusable permission identifier required by a moderation action. The Discord Provider translates it into Discord permission checks.

## DiscordModerationGuard

A Discord Provider service that centralizes target safety, hierarchy, manageability checks, and action wording.

## Moderation Audit Record

An in-memory record containing action, guild, moderator, optional target, reason, and details.

## Moderation Audit

The formatted terminal output produced for a successfully recorded moderation action.

## Logger

The Core class responsible for log categories, ANSI terminal colors, and plain-text fallback.

## Audit Persistence

Future storage of audit records outside process memory. Not implemented in v0.4.0.
