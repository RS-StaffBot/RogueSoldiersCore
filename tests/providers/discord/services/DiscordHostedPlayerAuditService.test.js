const assert = require("node:assert/strict");
const test = require("node:test");

const DiscordHostedPlayerAuditService = require(
    "../../../../src/providers/discord/services/DiscordHostedPlayerAuditService"
);

test("maps hosted-player actions to fixed privacy-safe records", () => {
    const records = [];
    const service = new DiscordHostedPlayerAuditService({
        recordingService: {
            record(record) {
                records.push(record);
            }
        }
    });

    for (const action of [
        "kick",
        "ban",
        "unban",
        "whitelist-add",
        "whitelist-remove"
    ]) {
        assert.equal(service.recordAttempt({
            actorId: "123456789012345678",
            action,
            targetId: "target-value",
            outcome: "SUCCESS",
            status: "succeeded"
        }), true);
    }

    assert.deepStrictEqual(
        records.map(record => record.action),
        [
            "game.player.kick",
            "game.player.ban",
            "game.player.unban",
            "game.player.whitelist-add",
            "game.player.whitelist-remove"
        ]
    );

    for (const record of records) {
        assert.equal(record.actorType, "discord-user");
        assert.equal(record.source, "discord");
        assert.equal(record.targetType, "7dtd-player");
        assert.equal(record.outcome, "success");
        assert.deepStrictEqual(record.metadata, {
            status: "succeeded"
        });
        assert.equal("reason" in record, false);
        assert.equal("command" in record, false);
        assert.equal("responseLines" in record, false);
    }
});

test("maps denied and failed outcomes without private details", () => {
    const records = [];
    const service = new DiscordHostedPlayerAuditService({
        recordingService: {
            record(record) {
                records.push(record);
            }
        }
    });

    service.recordAttempt({
        actorId: "123456789012345678",
        action: "kick",
        targetId: "42",
        outcome: "DENIED",
        status: "permission-denied"
    });
    service.recordAttempt({
        actorId: "123456789012345678",
        action: "ban",
        targetId: "Steam_123456789",
        outcome: "FAILED",
        status: "command-failed"
    });

    assert.equal(records[0].outcome, "denied");
    assert.equal(records[1].outcome, "failed");
    assert.deepStrictEqual(records[0].metadata, {
        status: "permission-denied"
    });
    assert.deepStrictEqual(records[1].metadata, {
        status: "command-failed"
    });
});

test("contains recording failures and validates construction", () => {
    assert.throws(
        () => new DiscordHostedPlayerAuditService(),
        {
            message:
                "Discord hosted-player audit recording boundary is invalid."
        }
    );

    const service = new DiscordHostedPlayerAuditService({
        recordingService: {
            record() {
                throw new Error("private database failure");
            }
        }
    });

    assert.equal(service.recordAttempt({
        actorId: "123456789012345678",
        action: "kick",
        targetId: "42",
        outcome: "FAILED",
        status: "command-failed"
    }), false);

    assert.equal(service.recordAttempt({
        actorId: "123456789012345678",
        action: "unsupported",
        targetId: "42",
        outcome: "FAILED"
    }), false);
});
