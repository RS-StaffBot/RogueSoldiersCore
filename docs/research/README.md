# RSF Research References

## Purpose

This directory stores research that may inform future Rogue Soldiers Framework planning and implementation.

Research documents are supporting references. They are not authoritative descriptions of the current RSF implementation, architecture, milestone state, configuration, or supported capability.

The repository implementation and permanent source-of-truth documents remain authoritative.

## Research and Implementation Distinction

Research may describe:

- external platform behavior
- game-server administration behavior
- third-party APIs and libraries
- hosting environments
- deployment options
- possible Provider or Module capabilities
- limitations discovered through external testing
- future design implications

Research must not describe a capability as implemented merely because an external platform supports it or a proposed design appears feasible.

Implemented behavior must be verified against the repository, tests, configuration boundaries, and permanent RSF documentation.

## Directory Organization

Create Provider-specific or Module-specific subdirectories only when actual research content is ready to be added.

Do not create empty category directories in anticipation of future work.

Example future paths may include:

```text
docs/research/providers/7-days-to-die/
docs/research/providers/discord/
docs/research/providers/website/
docs/research/modules/economy/
docs/research/modules/tickets/
```

These examples do not authorize creating the directories or beginning the work.

## Required Research Metadata

Every research report must clearly include:

- Research date
- Last verification date
- External sources used
- Relevant platform, library, game, or hosting versions
- Relevant RSF commit
- Confirmed capabilities
- Known limitations
- Unresolved questions
- RSF implications
- Freshness warning

## Source and Citation Requirements

Research must identify the external sources used.

Prefer authoritative sources such as:

- official documentation
- official release notes
- official configuration examples
- official API references
- verified server files
- direct controlled testing

Community sources may supplement official material when clearly identified, but they must not silently replace authoritative evidence.

Claims based on inference, observation, or incomplete documentation must be labeled accordingly.

Do not copy credentials, private server data, tokens, addresses, player information, raw private console output, or unrelated personal information into research reports.

## Freshness and Revalidation

External behavior may change after a report is written.

Every report must state its research date and last verification date. It must also identify relevant software, platform, library, game, or hosting versions when known.

Before research is used for implementation planning, verify that:

1. The external behavior is still current.
2. The cited sources remain available and applicable.
3. The relevant RSF implementation has not changed.
4. The report's limitations and unresolved questions remain accurate.
5. Any security, privacy, permission, or deployment assumptions are still valid.

Research that cannot be revalidated must be treated as historical context rather than current implementation guidance.

## Ownership

The person or planning workflow creating a research report owns:

- source collection
- citation accuracy
- freshness metadata
- separating confirmed facts from inference
- recording limitations and unresolved questions
- identifying the RSF commit used for comparison
- revalidation before implementation use

Implementation ownership remains with the approved Core, Provider, Module, or Shared boundary documented by RSF.

A research document does not change architectural ownership.

## Naming Standard

Use descriptive lowercase kebab-case filenames.

Examples:

```text
7dtd-console-command-behavior.md
discord-permission-limitations.md
linux-hosting-comparison.md
```

Avoid generic names such as:

```text
notes.md
research.md
ideas.md
misc.md
```

Include a version or date in the filename only when it materially distinguishes separate research snapshots.

## Required Report Template

Use this structure for future research reports:

```markdown
# Research Title

## Research Metadata

- Research date:
- Last verification date:
- External sources used:
- Relevant platform/library/game versions:
- Relevant RSF commit:

## Scope

Describe the exact question or external behavior being researched.

## Confirmed Capabilities

List only capabilities supported by evidence.

## Known Limitations

Document verified limitations, constraints, unsupported behavior, and uncertainty.

## Unresolved Questions

List questions that still require authoritative documentation, testing, or implementation review.

## RSF Implications

Explain how the findings may affect Core, Provider, Module, Shared, configuration, permission, privacy, testing, or deployment planning.

Do not present an implication as an approved architecture or implementation decision.

## Freshness Warning

State what may change and what must be revalidated before this report is used.
```

## Use in Planning and Implementation

Before using a research report:

1. Read the current `docs/AI-ONBOARDING.md`.
2. Read the permanent source-of-truth documents it requires.
3. Inspect the current repository implementation.
4. Confirm the relevant RSF commit.
5. Revalidate time-sensitive external facts.
6. Distinguish research findings from approved RSF decisions.
7. Obtain planning approval before implementation begins.

Research reports must not activate future milestones, authorize architecture changes, or bypass the normal implementation and validation workflow.
