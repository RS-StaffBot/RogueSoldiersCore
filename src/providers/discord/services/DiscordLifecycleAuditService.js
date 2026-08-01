const {
    AuditActorType,
    AuditOutcome,
    AuditSource
} = require("../../../modules/audit/AuditContract");

class DiscordLifecycleAuditService {

    constructor({ recordingService }) {
        if (
            !recordingService ||
            typeof recordingService.record !== "function"
        ) {
            throw new Error(
                "Discord lifecycle audit recording boundary is invalid."
            );
        }

        this.recordingService = recordingService;
    }

    recordAttempt({
        actorId,
        operation,
        outcome,
        previousState = null,
        currentState = null,
        status = null
    }) {
        try {
            this.recordingService.record({
                actorType: AuditActorType.DISCORD_USER,
                actorId,
                source: AuditSource.DISCORD,
                action: this.resolveAction(operation),
                targetType: "provider",
                targetId: "7-days-to-die",
                outcome: this.resolveOutcome(outcome),
                metadata: this.createMetadata({
                    previousState,
                    currentState,
                    status
                })
            });

            return true;
        } catch {
            return false;
        }
    }

    resolveAction(operation) {
        if (operation !== "restart" && operation !== "reload") {
            throw new Error("Lifecycle audit operation is invalid.");
        }

        return `lifecycle.${operation}`;
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

    createMetadata({ previousState, currentState, status }) {
        const metadata = {};

        if (typeof previousState === "string" && previousState.length > 0) {
            metadata.previousState = previousState;
        }

        if (typeof currentState === "string" && currentState.length > 0) {
            metadata.currentState = currentState;
        }

        if (typeof status === "string" && status.length > 0) {
            metadata.status = status;
        }

        return metadata;
    }

    asBoundary() {
        return Object.freeze({
            recordAttempt: details => this.recordAttempt(details)
        });
    }

}

module.exports = DiscordLifecycleAuditService;
