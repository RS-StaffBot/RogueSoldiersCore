const assert = require("node:assert/strict");
const test = require("node:test");

const DiscordModerationAuditService = require(
    "../../../../src/providers/discord/services/DiscordModerationAuditService"
);

test("maps all moderation attempts to fixed privacy-safe records", () => {
    const records = [];
    const service = new DiscordModerationAuditService({
        recordingService: {
            record(record) {
                records.push(record);
                return record;
            }
        }
    }).asBoundary();

    assert.equal(Object.isFrozen(service), true);
    assert.deepEqual(Object.keys(service), ["recordAttempt"]);

    const attempts = [
        ["ban", "member-1", "discord-member"],
        ["kick", "member-2", "discord-member"],
        ["warn", "member-3", "discord-member"],
        ["timeout", "member-4", "discord-member"],
        ["untimeout", "member-5", "discord-member"],
        ["purge", "channel-1", "discord-channel"]
    ];

    for (const [action, targetId] of attempts) {
        assert.equal(service.recordAttempt({
            actorId: "discord-user-1",
            action,
            targetId,
            outcome: "SUCCESS",
            status: "succeeded"
        }), true);
    }

    assert.deepEqual(
        records.map(record => ({
            action: record.action,
            targetType: record.targetType,
            targetId: record.targetId
        })),
        attempts.map(([action, targetId, targetType]) => ({
            action: `moderation.${action}`,
            targetType,
            targetId
        }))
    );

    for (const record of records) {
        assert.equal(record.actorType, "discord-user");
        assert.equal(record.actorId, "discord-user-1");
        assert.equal(record.source, "discord");
        assert.equal(record.outcome, "success");
        assert.deepEqual(record.metadata, {
            status: "succeeded"
        });
    }
});

test("maps failures without retaining reasons, messages, or private details", () => {
    const records = [];
    const service = new DiscordModerationAuditService({
        recordingService: {
            record(record) {
                records.push(record);
            }
        }
    });

    service.recordAttempt({
        actorId: "discord-user-1",
        action: "purge",
        targetId: "discord-channel-1",
        outcome: "FAILED",
        status: "execution-failed",
        reason: "private moderation reason",
        messageContent: "private deleted message",
        deletedCount: 25
    });

    assert.deepEqual(records, [{
        actorType: "discord-user",
        actorId: "discord-user-1",
        source: "discord",
        action: "moderation.purge",
        targetType: "discord-channel",
        targetId: "discord-channel-1",
        outcome: "failed",
        metadata: {
            status: "execution-failed"
        }
    }]);
    assert.doesNotMatch(
        JSON.stringify(records),
        /private moderation reason|private deleted message|deletedCount|password|socket|stack|console/iu
    );
});

test("preserves existing ban and kick mappings", () => {
    const records = [];
    const service = new DiscordModerationAuditService({
        recordingService: {
            record(record) {
                records.push(record);
            }
        }
    });

    service.recordAttempt({
        actorId: "moderator-1",
        action: "ban",
        targetId: "member-1",
        outcome: "SUCCESS",
        status: "succeeded"
    });
    service.recordAttempt({
        actorId: "moderator-1",
        action: "kick",
        targetId: "member-2",
        outcome: "DENIED",
        status: "permission-denied"
    });

    assert.deepEqual(records.map(record => ({
        action: record.action,
        targetType: record.targetType,
        outcome: record.outcome,
        status: record.metadata.status
    })), [
        {
            action: "moderation.ban",
            targetType: "discord-member",
            outcome: "success",
            status: "succeeded"
        },
        {
            action: "moderation.kick",
            targetType: "discord-member",
            outcome: "denied",
            status: "permission-denied"
        }
    ]);
});

test("contains recording failures and rejects unsupported actions", () => {
    const service = new DiscordModerationAuditService({
        recordingService: {
            record() {
                throw new Error("private database failure");
            }
        }
    });

    assert.equal(service.recordAttempt({
        actorId: "discord-user-1",
        action: "warn",
        targetId: "discord-user-2",
        outcome: "FAILED"
    }), false);
    assert.equal(service.recordAttempt({
        actorId: "discord-user-1",
        action: "unsupported",
        targetId: "discord-user-2",
        outcome: "SUCCESS"
    }), false);
});

test("requires a narrow recording boundary", () => {
    assert.throws(
        () => new DiscordModerationAuditService(),
        {
            message:
                "Discord moderation audit recording boundary is invalid."
        }
    );
});
