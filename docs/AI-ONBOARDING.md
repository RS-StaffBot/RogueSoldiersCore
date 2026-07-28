# AI Onboarding

## Purpose

If you are reading this, you are assisting with the Rogue Soldiers Framework (RSF).

This document is the starting point for every implementation session.

The repository is the implementation source of truth.

Documentation must remain synchronized with the repository.

---

## Read These Documents First

Before making recommendations, read these documents in order:

1. `00-Vision.md`
2. `01-Architecture.md`
3. `02-Core.md`
4. `03-Providers.md`
5. `04-Modules.md`
6. `05-Events.md`
7. `06-Permissions.md`
8. `07-Coding-Standards.md`
9. `Decision-Log.md`
10. `Project-Status.md`
11. `Roadmap.md`
12. `Dependencies.md`
13. `Glossary.md`
14. `Administration-Configuration.md`

Use these documents to understand the approved project direction, terminology, architecture, active milestone, and completed work.

When documentation and repository implementation conflict, the repository is authoritative.

The documentation must then be corrected to match the tested repository.

---

## Repository First

Never assume that a file, folder, class, method, dependency, command, Module, Provider, or service exists.

When implementation depends on repository state, request and inspect the relevant files before generating code.

Useful verification commands include:

```powershell
tree .\src /F
tree .\docs /F
Get-Content <filename>
git status
git log --oneline -10
```

Always build on the existing implementation.

Prefer improving an existing file over introducing a duplicate responsibility.

Do not recreate previously removed or abandoned implementations unless the user explicitly approves a new design that requires them.

---

## Verification First

Before implementing a feature:

1. Read the relevant documentation.
2. Review the repository structure.
3. Read the files involved.
4. Confirm the current implementation.
5. Identify the smallest safe phase.
6. Implement the phase.
7. Test the phase.
8. Commit the phase.
9. Update documentation when required.

Never guess about repository state.

---

## Architecture

The verified high-level architecture is:

- Core coordinates framework infrastructure.
- Providers integrate external platforms and systems.
- Modules contain business logic.
- Shared contains reusable models, events, permissions, errors, and utilities when implemented reuse requires them.

Discord is a Provider.

Business logic such as moderation, economy, and tickets belongs in Modules.

Platform-specific clients, API calls, interactions, and events belong in Providers.

---

## Architecture Freeze

Treat the documented architecture as stable.

Do not redesign the framework merely to improve naming or personal preference.

Do not rename folders or restructure the project without satisfying the Architecture Change Rule.

---

## Architecture Change Rule

Only recommend a major architectural change when at least two of the following are true:

- The change provides long-term value.
- The change improves the architecture beyond naming.
- This is the last practical opportunity to make the change.

Otherwise, continue implementation within the approved architecture.

---

## Scope Control

Only work on the active milestone.

Do not begin implementing future milestones unless explicitly instructed.

Do not mix unrelated cleanup, dependency changes, architecture changes, or documentation rewrites into a feature phase unless they are required for that phase to work correctly.

One completed phase is better than several partially completed phases.

---

## Version Awareness

Always review:

- `Project-Status.md`
- `Roadmap.md`
- `config/core/app.json`
- `package.json`
- `package-lock.json`

Recommendations must align with the active milestone and current version.

All version locations must match before a milestone is tagged.

Do not close or tag a milestone while required documentation is incomplete or inconsistent with the repository.

---

## Implementation Phases

Every implementation phase must:

- Have one clear objective.
- Produce working code.
- Preserve existing verified behavior.
- Include testing instructions.
- Include exact Git staging and commit commands.
- Leave the repository in a working state.

Do not leave partially implemented infrastructure behind.

Do not provide a phase commit command until the phase has a complete test path.

---

## Code Delivery

Assume the developer is learning software development.

Provide complete copy-and-paste-ready instructions.

For every new file, provide the exact PowerShell creation command first.

Example:

```powershell
New-Item -ItemType File -Path .\src\path\NewFile.js -Force
```

For every modification, explicitly state one of the following:

- Replace the entire file with:
- Replace the entire class with:
- Replace the entire method with:
- Replace these exact lines with:
- Insert immediately before:
- Insert immediately after:

Prefer complete file replacements when practical.

Never provide ambiguous fragments without an exact insertion location.

---

## PowerShell Safety

All commands must be directly copy-and-paste-safe in Windows PowerShell.

For `node -e`, use outer double quotes and inner single quotes.

Example:

```powershell
node -e "const registry = require('./src/core/Registry'); console.log(registry.list());"
```

Avoid command syntax that depends on Bash behavior.

If a pasted command accidentally enters PowerShell continuation mode, press:

```text
Ctrl+C
```

Then verify repository state with:

```powershell
git status
```

---

## Documentation Source of Truth

Keep these files synchronized with repository changes whenever relevant:

- `AI-ONBOARDING.md`
- `07-Coding-Standards.md`
- `Decision-Log.md`
- `Project-Status.md`
- `Roadmap.md`
- `Dependencies.md`
- `Glossary.md`

Also update the relevant architecture documents when implementation changes their verified responsibilities:

- `00-Vision.md`
- `01-Architecture.md`
- `02-Core.md`
- `03-Providers.md`
- `04-Modules.md`
- `05-Events.md`
- `06-Permissions.md`

Documentation must not describe abandoned plans or unimplemented components as operational.

Exact implementation paths and flows should only be documented after they are proven by the repository and testing.

---

## Documentation Delivery Format

Documentation updates must always be delivered as complete file replacements.

Do not provide partial documentation edits unless the user explicitly requests a small targeted edit.

When one documentation file changes:

- Create a clean downloadable `.md` file.
- Provide a direct download link.
- Use UTF-8 encoding.
- Use standard Markdown.
- Prefer ASCII-only diagrams and arrows to avoid encoding corruption.

When multiple documentation files change:

- Create each `.md` file separately.
- Provide a direct download link for every file.
- Also provide one ZIP archive containing all changed documentation files.
- Clearly identify the repository path for each file.
- Do not combine multiple documents into one long response that requires the user to find file boundaries manually.

Documentation files must preserve:

- Markdown headings
- Bullet markers
- Numbered lists
- Inline code
- Fenced code blocks
- File paths
- Blank-line spacing

Avoid Unicode box-drawing characters, decorative arrows, emojis, and symbols that may be corrupted by PowerShell, VS Code, terminal encoding, or copy and paste.

Use ASCII diagrams such as:

```text
CommandLoader
    |
    v
CommandRegistry
    |
    v
CommandRegistrar
```

Before committing documentation, verify:

```powershell
Get-Item .\docs\<filename> | Select-Object Name, Length
Get-Content .\docs\<filename> -Raw
git diff -- .\docs\<filename>
```

Documentation must not be committed if Markdown formatting was stripped, characters were corrupted, or content contradicts the repository.

---

## Documentation Reconstruction

If a required documentation file is empty or missing, reconstruct it only from:

- The current tested repository
- Existing confirmed project decisions
- The intended Rogue Soldiers Framework goals
- Verified milestone results

Do not reconstruct abandoned plans.

Do not describe components that do not exist.

Clearly identify future boundaries as future or unimplemented.

---

## Coding Standards

Follow `07-Coding-Standards.md`.

General expectations include:

- One class per file
- Filename matches class name
- PascalCase class names
- camelCase variables and methods
- Focused class responsibilities
- Readability over cleverness
- Framework Logger instead of direct console use outside existing verified exceptions
- Async and await instead of deeply nested promise chains
- Logged errors
- No silent exception handling

Do not silently modernize unrelated files during a focused phase.

---

## Testing

Testing instructions must be specific and observable.

Include, when relevant:

- Direct Node checks
- Expected console output
- Framework startup
- Discord login
- Slash-command registration
- Command execution
- Error behavior
- Repository searches for duplicate paths
- `git status`

Do not declare a phase complete only because code appears correct.

The user must be able to verify the expected behavior.

---

## Git Workflow

Every completed implementation phase ends with:

- Testing
- Exact `git add` commands
- One focused commit
- `git status`
- `git log -1 --oneline`

Major milestones also receive Git tags.

Do not tag a milestone until:

- Code is tested.
- Required documentation is complete.
- Documentation matches the repository.
- Version files are synchronized.
- The working tree is clean.
- All milestone changes are committed.

---

## Milestone Closing State

Before closing a milestone, verify:

- Milestone code tested
- Existing behavior preserved
- No duplicate implementation paths
- Documentation complete
- Documentation matches repository
- Version values synchronized
- Working tree clean
- Milestone commits present
- Milestone tag created only after final verification
- Updated source-of-truth files uploaded to ChatGPT when requested

---

## Teaching Style

Assume the developer is a beginner.

Keep explanations concise unless more detail is requested.

Explain why a change is needed in plain language.

Introduce one new concept at a time.

Avoid unnecessary jargon.

Provide complete working instructions rather than expecting the developer to infer missing steps.

---

## Conversation Workflow

When the user sends a message containing only:

```text
.
```

treat it as approval to continue with the next planned step.

Preserve:

- The active milestone
- The current phase
- Previously agreed architecture
- The established testing and Git workflow

Do not restart planning or ask the user to repeat information already provided.

---

## New Chat Startup

When beginning a new implementation chat:

1. Read this document.
2. Read the source-of-truth documents it references.
3. Review `Project-Status.md` and `Roadmap.md`.
4. Verify the repository before suggesting code.
5. Confirm the active milestone.
6. Continue from the current repository state.
7. Do not recreate abandoned work.
8. Do not assume an earlier chat accurately reflects the current repository.

---

## Project Philosophy

Favor maintainability over shortcuts.

Framework code should rarely change.

New features should primarily require adding focused files rather than repeatedly modifying foundational infrastructure.

Avoid duplicate ownership.

Each responsibility should have one clear active implementation path.

The goal is a professional-quality framework suitable for long-term Rogue Soldiers Clan operations and future expansion.
