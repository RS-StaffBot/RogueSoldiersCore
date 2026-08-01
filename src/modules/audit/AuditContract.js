const AuditActorType = Object.freeze({
    DISCORD_USER: "discord-user",
    SYSTEM: "system",
    WEBSITE_USER: "website-user"
});

const AuditSource = Object.freeze({
    DISCORD: "discord",
    FRAMEWORK: "framework",
    WEBSITE: "website"
});

const AuditOutcome = Object.freeze({
    DENIED: "denied",
    FAILED: "failed",
    SUCCESS: "success"
});

const AuditMetadataField = Object.freeze({
    CURRENT_STATE: "currentState",
    PREVIOUS_STATE: "previousState",
    REFERENCE_ID: "referenceId",
    STATUS: "status"
});

module.exports = Object.freeze({
    AuditActorType,
    AuditMetadataField,
    AuditOutcome,
    AuditSource
});
