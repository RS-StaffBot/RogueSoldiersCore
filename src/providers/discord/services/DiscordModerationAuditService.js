const {
    AuditActorType,
    AuditOutcome,
    AuditSource
} = require("../../../modules/audit/AuditContract");

const SUPPORTED_ACTIONS = Object.freeze([
    "ban",
    "kick",
    "purge",
    "timeout",
    "untimeout",
    "warn"
]);

class DiscordModerationAuditService {

    constructor({ recordingService } = {}) {
        if (
            !recordingService ||
            typeof recordingService.record !== "function"
        ) {
            throw new Error(
                "Discord moderation audit recording boundary is invalid."
            );
        }

        this.recordingService = recordingService;
    }

    recordAttempt({
        actorId,
        action,
        targetId,
        outcome,
        status = null
    }) {
        try {
            this.recordingService.record({
                actorType: AuditActorType.DISCORD_USER,
                actorId,
                source: AuditSource.DISCORD,
                action: this.resolveAction(action),
                targetType: this.resolveTargetType(action),
                targetId,
                outcome: this.resolveOutcome(outcome),
                metadata: this.createMetadata(status)
            });

            return true;
        } catch {
            return false;
        }
    }

    resolveAction(action) {
        if (!SUPPORTED_ACTIONS.includes(action)) {
            throw new Error(
                "Discord moderation audit action is invalid."
            );
        }

        return `moderation.${action}`;
    }

    resolveTargetType(action) {
        if (action === "purge") {
            return "discord-channel";
        }

        return "discord-member";
    }

    resolveOutcome(outcome) {
        if (outcome === "SUCCESS") {
            return AuditOutcome.SUCCESS;
        }

        if (outcome === "DENIED") {
            return AuditOutcome.DENIED;
        }

        return AuditOutcome.FAILED;
    }

    createMetadata(status) {
        if (
            typeof status !== "string" ||
            status.length === 0
        ) {
            return {};
        }

        return {
            status
        };
    }

    asBoundary() {
        return Object.freeze({
            recordAttempt: details => this.recordAttempt(details)
        });
    }

}

module.exports = DiscordModerationAuditService;
