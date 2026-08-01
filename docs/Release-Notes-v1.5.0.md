# Rogue Soldiers Framework v1.5.0

## Player Identity Linking Foundation

v1.5.0 introduces the first secure Discord-to-hosted-game identity-link foundation.

## Added

- Platform-neutral Identity Module
- Immutable identity-link records and focused errors
- In-memory and SQLite identity stores
- Migration `006_create_identity_links`
- One active link per Discord member
- One active Discord owner per durable Steam or EOS identity
- Private `/identity status`
- Private `/identity link user-id:<Steam_...|EOS_...>`
- Cryptographically random short-lived challenges
- Exact 7 Days to Die global-chat proof collection
- Proof-gated verified-link persistence
- Restart recovery of verified links

## Privacy and Safety

- Ordinary Discord responses do not expose Steam, EOS, or Discord identifiers.
- Identity commands use ephemeral replies.
- Display names and online entity IDs are not accepted as ownership proof.
- Raw Telnet, socket details, credentials, IP addresses, paths, and internal errors are not exposed.
- Ambiguous, malformed, stale, mismatched, or conflicting evidence fails closed.
- An exact challenge received from a different Steam or EOS identifier ends proof collection immediately without creating a link.

## Resilient Startup Hardening

- Provider and Module lifecycle failures are isolated per component.
- Failed components remain registered in `ERROR`.
- Healthy unrelated components remain running.
- Bootstrap reports degraded startup when optional components fail.
- Core, Database, health, migration, and Loader-wide failures remain fatal.
- Recoverable lifecycle logs are sanitized.

## Live Verification

Verified against the Rogue Soldiers Discord and hosted 7 Days to Die server:

- Successful private challenge creation
- Exact Steam identity and challenge correlation
- Verified SQLite persistence
- Persistence after RSF restart
- Already-linked rejection
- Normal `/game status` and `/game time` after proof collection
- Degraded startup with 7 Days to Die unavailable
- Privacy-safe lifecycle logging

## Current Limits

v1.5.0 does not include:

- Replacement or relinking
- Unlinking or revocation
- Staff identity lookup
- Identifier-free linking
- Broad RSF-owned identities or platform attachments
- Automatic account matching or merge execution
- Multiple hosted game servers
- Economy purchases or automatic in-game rewards
- Provider retry, restart, reload, or replacement administration

The approved future RSF Identity Hub direction remains separate from this release.
