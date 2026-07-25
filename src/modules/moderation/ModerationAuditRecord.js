class ModerationAuditRecord {

    constructor({
        action,
        guildId,
        moderatorId,
        targetId = null,
        reason,
        details = {}
    }) {

        if (
            typeof action !== "string" ||
            action.trim().length === 0
        ) {
            throw new Error(
                "A moderation action is required."
            );
        }

        if (
            typeof guildId !== "string" ||
            guildId.trim().length === 0
        ) {
            throw new Error(
                "A guild ID is required."
            );
        }

        if (
            typeof moderatorId !== "string" ||
            moderatorId.trim().length === 0
        ) {
            throw new Error(
                "A moderator ID is required."
            );
        }

        if (
            typeof reason !== "string" ||
            reason.trim().length === 0
        ) {
            throw new Error(
                "A moderation reason is required."
            );
        }

        if (
            targetId !== null &&
            (
                typeof targetId !== "string" ||
                targetId.trim().length === 0
            )
        ) {
            throw new Error(
                "The target ID must be a non-empty string or null."
            );
        }

        if (
            !details ||
            typeof details !== "object" ||
            Array.isArray(details)
        ) {
            throw new Error(
                "Moderation details must be an object."
            );
        }

        this.action = action;
        this.guildId = guildId;
        this.moderatorId = moderatorId;
        this.targetId = targetId;
        this.reason = reason.trim();
        this.details = Object.freeze({
            ...details
        });
        this.createdAt = new Date().toISOString();

        Object.freeze(this);

    }

}

module.exports = ModerationAuditRecord;