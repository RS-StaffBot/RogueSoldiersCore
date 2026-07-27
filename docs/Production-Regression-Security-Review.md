# Production Regression and Security Review

## Purpose

This document records the v1.0.0 production regression and security review for the Rogue Soldiers Framework (RSF).

The review is limited to the implemented repository and its documented production boundaries. It does not certify external hosting infrastructure, Discord account security, reverse-proxy configuration, operating-system hardening, network segmentation, or a live 7 Days to Die server.

## Review Baseline

The reviewed baseline is the repository state after completion of:

- v0.9.0 Website Provider
- production process lifecycle handling
- production configuration and secret-handling documentation
- SQLite backup and restore documentation
- production logging and troubleshooting documentation
- Discord production deployment documentation
- Website production deployment documentation
- production smoke-test checklist

The repository remains at version `0.9.0` until the final v1.0.0 documentation and version-closure phase.

## Automated Regression Gate

Every pull request and push to `main` must pass the `Validate` GitHub Actions workflow.

The workflow performs:

1. Clean dependency installation with `npm ci`.
2. Production dependency vulnerability review with:

   ```text
   npm audit --omit=dev --audit-level=high
   ```

3. The complete Node test suite with `npm test`.
4. The complete ESLint check with `npm run lint`.

A high- or critical-severity production dependency advisory blocks validation. Moderate and low advisories must still be reviewed, but they do not automatically block this gate.

The automated suite uses isolated fakes for external Discord, Website, and game-server behavior where live systems are not required. Passing automation does not replace the production smoke-test checklist.

## Regression Areas Reviewed

### Framework Lifecycle

Reviewed expectations:

- startup is single-run and failure sets a non-zero process exit code
- `SIGINT` and `SIGTERM` initiate one controlled shutdown
- shutdown is awaited and repeated shutdown requests share the same operation
- startup failure does not attempt to stop a framework that never became operational
- Provider and Module lifecycle rollback remains controlled

### Configuration and Secrets

Reviewed expectations:

- Discord bot token and OAuth client secret remain environment-only secrets
- the 7 Days to Die Telnet password remains environment-only
- tracked JSON contains non-secret configuration only
- `.env`, SQLite data, and operational backups remain excluded from Git
- enabled optional Providers fail closed when required settings are missing or invalid
- logs and troubleshooting guidance prohibit sharing raw secrets, cookies, OAuth codes, or authorization headers

### Discord Provider and Commands

Reviewed expectations:

- Discord startup requires both the bot token and application ID
- the Discord client requests only the implemented `Guilds` gateway intent
- slash commands are registered through Discord's application-command API
- moderation commands preserve Discord permission, hierarchy, self-target, ownership, and manageability checks
- Ticket staff access remains permission-gated
- command handlers use validated Module operations rather than direct persistence access

### Database and Durable State

Reviewed expectations:

- SQLite ownership remains inside Core
- Modules use controlled stores rather than raw connection exposure
- migrations are ordered and transactional
- foreign keys and write-ahead logging remain enabled for the file-backed database
- failed multi-row operations preserve atomicity and identifier sequencing
- restart reconstruction validates durable state before accepting it
- backup and restore require a stopped process and account for SQLite sidecar files

### Website Provider

Reviewed expectations:

- the Website listener remains bound to `127.0.0.1`
- public access requires an external HTTPS reverse proxy
- enabled authentication requires an exact canonical HTTPS origin
- Discord OAuth uses authorization code flow with PKCE S256
- OAuth state is browser-bound, one-time, and expires
- guild membership is checked before an RSF session is created
- bot, system, pending, guest, and non-member identities are rejected
- OAuth tokens are revoked before the RSF session is created
- Website sessions are opaque, secure-cookie-backed, idle-limited, absolute-limited, and in memory
- logout requires an exact allowed Origin
- public identity and Ticket responses are allowlisted
- Website Ticket access is creator-owned and does not accept caller-controlled actor identity, creator identity, permissions, filters, or pagination
- Website code does not access SQL, SQLite rows, database connections, or Module stores directly

### 7 Days to Die Provider

Reviewed expectations:

- the Provider remains optional and disabled by default
- authentication timeout covers the full connection handshake
- password and connection failures use secret-safe errors
- unexpected connection loss moves the Provider to an error state
- intentional shutdown is awaited and idempotent
- the raw management connection is explicitly restricted to a trusted private path
- administrative command execution remains unimplemented until a deterministic response boundary is proven

### Logging and Operational Safety

Reviewed expectations:

- RSF writes human-readable output to standard output and standard error
- production log persistence, rotation, retention, and access control remain host responsibilities
- operator documentation requires secret redaction before sharing logs
- restart loops, Provider failures, database failures, and shutdown failures have documented troubleshooting paths
- no claim is made that current console logs are a complete compliance-grade audit system

## Security Findings

### Blocking Findings

No known blocking design finding is accepted by this review.

The pull request containing this review must not merge unless dependency audit, complete tests, and lint all pass.

### Accepted Production Boundaries

The following are known limitations, not hidden defects:

- RSF currently targets one process with one SQLite database.
- Website sessions are lost on process restart.
- Website authentication is disabled by default.
- RSF does not supply TLS or reverse-proxy configuration.
- Creator-owned Ticket listing is the only Website-to-Module operation.
- Website staff permission translation is not implemented.
- 7 Days to Die administrative command execution is not implemented.
- Automatic reconnect and multiple game-server management are not implemented.
- Log persistence and rotation are external host responsibilities.
- The production smoke test must still be performed against the real deployment.

These boundaries must remain documented and must not be represented as implemented features during v1.0.0 closure.

## Release Acceptance Requirements

Before v1.0.0 may be tagged:

- the regression and security review pull request must pass GitHub Actions
- the production smoke-test checklist must be completed against the intended deployment
- high and critical production dependency advisories must be resolved or the release must be blocked
- any discovered security defect must be fixed and retested
- source-of-truth documentation must match the repository
- version values must be synchronized to `1.0.0`
- the final working tree must be clean
- the release commit and tag must be deliberate and verified

## Review Conclusion

The implemented architecture contains appropriate separation between Core, Providers, Modules, Shared contracts, and persistence. Existing defensive controls are suitable for the current single-process Rogue Soldiers production boundary, provided the documented deployment, secret-handling, logging, backup, and smoke-test requirements are followed.

This review is not a substitute for the final live production smoke test or future security review after material feature, dependency, hosting, identity, permission, or network changes.