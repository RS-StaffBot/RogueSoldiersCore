const assert = require("node:assert/strict");
const test = require("node:test");

const DiscordModerationAuditService = require(
    "../../../../src/providers/discord/services/DiscordModerationAuditService"
);

test("maps ban and kick attempts to fixed privacy-safe records", () => {
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

    assert.equal(service.recordAttempt({
        actorId: "discord-user-1",
        action: "ban",
        targetId: "discord-user-2",
        outcome: "SUCCESS",
        status: "succeeded"
    }), true);
    assert.equal(service.recordAttempt({
        actorId: "discord-user-1",
        action: "kick",
        targetId: "discord-user-3",
        outcome: "DENIED",
        status: "permission-denied"
    }), true);

    assert.deepEqual(records, [
        {
            actorType: "discord-user",
            actorId: "discord-user-1",
            source: "discord",
            action: "moderation.ban",
            targetType: "discord-member",
            targetId: "discord-user-2",
            outcome: "success",
            metadata: {
                status: "succeeded"
            }
        },
        {
            actorType: "discord-user",
            actorId: "discord-user-1",
            source: "discord",
            action: "moderation.kick",
            targetType: "discord-member",
            targetId: "discord-user-3",
            outcome: "denied",
            metadata: {
                status: "permission-denied"
            }
        }
    ]);
});

test("maps failures without retaining reasons or private details", () => {
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
        action: "kick",
        targetId: "discord-user-2",
        outcome: "FAILED",
        status: "execution-failed",
        reason: "private moderation reason"
    });

    assert.deepEqual(records, [{
        actorType: "discord-user",
        actorId: "discord-user-1",
        source: "discord",
        action: "moderation.kick",
        targetType: "discord-member",
        targetId: "discord-user-2",
        outcome: "failed",
        metadata: {
            status: "execution-failed"
        }
    }]);
    assert.doesNotMatch(
        JSON.stringify(records),
        /private moderation reason|password|socket|stack|console/iu
    );
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
        action: "ban",
        targetId: "discord-user-2",
        outcome: "FAILED"
    }), false);
    assert.equal(service.recordAttempt({
        actorId: "discord-user-1",
        action: "purge",
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
