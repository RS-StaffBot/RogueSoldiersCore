# Modules

## Active Modules

- Economy
- Moderation

## Economy Module

The Economy Module remains a lifecycle foundation without balances, transactions, rewards, shops, or persistence.

## Moderation Module

Verified responsibilities:

- Define supported actions
- Map actions to required permission identifiers
- Validate supported actions
- Create moderation audit records
- Store audit records in memory
- Return audit-record copies and counts
- Send formatted audit output through Core Logger

Supported actions:

```text
BAN
KICK
WARN
TIMEOUT
UNTIMEOUT
PURGE
```

Audit records are in-memory and are lost when the process stops.
