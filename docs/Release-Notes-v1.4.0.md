# Rogue Soldiers Framework v1.4.0 Release Notes

## Hosted Player Administration

v1.4.0 adds narrow, permission-gated Discord administration for individual players on the hosted 7 Days to Die server.

## New Discord Commands

- `/game kick entity-id:<id> reason:<text>` kicks one currently online player by exact positive entity ID.
- `/game ban user-id:<Steam_...|EOS_...> duration:<number> unit:<choice> reason:<text> display-name:<text>` adds one durable temporary ban.
- `/game unban display-name:<exact text>` resolves exactly one active ban by display name, removes its stored UserID, and verifies removal with a second `ban list`.
- `/game whitelist add user-id:<Steam_...|EOS_...> display-name:<text>` adds one durable individual whitelist entry.
- `/game whitelist remove user-id:<Steam_...|EOS_...> display-name:<text>` removes one durable individual whitelist entry.

All commands remain inside the existing guild-only `/game` family and require Discord `ManageGuild`.

## Provider Contracts

The 7 Days to Die Provider now has deterministic completion for the verified hosted-player operations:

- `kick`
- `ban add`
- `ban remove`
- `whitelist add`
- `whitelist remove`

The unban workflow treats `ban remove` completion as insufficient by itself. Success requires a second `ban list` proving the exact stored UserID is absent.

Whitelist behavior was verified for first-entry activation, duplicate add without duplicate rows, final-entry deactivation, missing removal, and persistence across a normal server restart.

## Validation and Privacy

Discord validates all hosted-player inputs before Provider resolution.

Ordinary responses do not expose:

- Steam or EOS identifiers
- IP addresses
- configuration paths
- raw Telnet or server-console output
- credentials, socket details, positions, health, inventory, or internal errors

Authorized staff may receive Steam or EOS identifiers only through an explicit permission-gated private workflow designed for that purpose. Incidental leakage from administration results remains prohibited.

## Live Verification

Live Discord-to-game verification passed against 7 Days to Die V3.1.0 b13 with the optional Provider running.

Verified outcomes include:

- online kick success and invalid-target handling
- durable ban creation
- exact unban lookup and post-removal verification
- whitelist add through private Telnet
- duplicate whitelist add leaving one stored row
- whitelist remove disabling whitelist-only mode when the final entry is removed
- missing whitelist removal returning a safe private Discord response
- startup with Discord connected, 13 slash commands registered, and the 7 Days to Die Provider `RUNNING`

## Safety Boundaries

v1.4.0 does not add:

- arbitrary console execution
- free-form Telnet input
- fuzzy player matching
- cross-platform identity linking
- continuous Discord-to-game chat bridging
- Economy-backed game effects
- simultaneous command queues
- multiple game servers
- automatic process supervision
- public Telnet exposure

Raw Telnet is unencrypted administrative transport and must remain on loopback, LAN, VPN, or another protected private path.
