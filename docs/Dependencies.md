# Dependencies

## Purpose

This document records the runtime dependencies, development dependencies, and external tools used by Rogue Soldiers Framework.

The repository and `package.json` remain authoritative.

---

## Runtime

### Node.js

Purpose:

- Runs Rogue Soldiers Framework.

Requirement:

```text
Node.js 22 or newer
```

Declared in:

```text
package.json
```

---

## Runtime Dependencies

### discord.js

Purpose:

- Discord client integration
- Gateway connection
- Slash-command builders
- Discord REST command registration
- Discord route definitions

Owner:

- Discord Provider

Verified imports exist in:

```text
src/providers/discord/DiscordProvider.js
src/providers/discord/commands/HelpCommand.js
src/providers/discord/commands/PingCommand.js
src/providers/discord/services/CommandRegistrar.js
```

Status:

- Active
- Required

---

### dotenv

Purpose:

- Loads environment variables from `.env`

Owner:

- Configuration system

Verified import exists in:

```text
src/configuration/ConfigurationManager.js
```

Status:

- Active
- Required

---

## Development Dependencies

### eslint

Purpose:

- Static code-quality checks

Declared npm script:

```text
npm run lint
```

Status:

- Development dependency
- Retained

No standalone ESLint configuration file was found during the v0.3.1 dependency review.

The lint command must be tested before being treated as fully configured.

---

### nodemon

Purpose:

- Restarts the framework automatically during development

Declared npm script:

```text
npm run dev
```

Status:

- Development dependency
- Retained

No standalone nodemon configuration file is currently required because the npm script directly identifies the startup file.

---

## Removed Unused Direct Dependencies

The following packages were removed as unused direct dependencies during v0.3.1:

### @discordjs/builders

Reason:

- `SlashCommandBuilder` is imported from `discord.js`.
- No direct import from `@discordjs/builders` exists.

### uuid

Reason:

- No verified UUID generation exists in the current repository.
- No direct import exists.

### winston

Reason:

- The current framework Logger uses native console methods.
- No direct import exists.

These packages may still appear as transitive dependencies required by another package.

They should not be direct dependencies unless future implementation imports them directly.

---

## Security Audit

The final v0.3.1 dependency review reported:

```text
found 0 vulnerabilities
```

The transitive `brace-expansion` vulnerability was resolved through a compatible lockfile update.

---

## External Tools

### Git

Purpose:

- Version control
- Phase commits
- Milestone tags
- Repository recovery

Workflow:

- Every completed implementation phase receives a focused commit.
- Major completed milestones receive Git tags.

---

## Dependency Rules

Before adding a dependency:

1. Confirm the repository does not already provide the required capability.
2. Confirm the dependency has a clear owner.
3. Add it only when implementation requires it.
4. Use it in the same tested phase.
5. Update this document.
6. Commit `package.json` and `package-lock.json` together.

Do not keep unused direct dependencies for speculative future work.
