const assert = require("node:assert/strict");
const test = require("node:test");

const DiscordLifecycleAuditService = require(
    "../../../src/providers/discord/services/DiscordLifecycleAuditService"
);

test("maps lifecycle attempts to fixed privacy-safe audit records", () => {
    const records = [];
    const service = new DiscordLifecycleAuditService({
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
        operation: "reload",
        outcome: "SUCCESS",
        previousState: "ERROR",
        currentState: "RUNNING",
        status: "succeeded"
    }), true);

    assert.deepEqual(records, [{
        actorType: "discord-user",
        actorId: "discord-user-1",
        source: "discord",
        action: "lifecycle.reload",
        targetType: "provider",
        targetId: "7-days-to-die",
        outcome: "success",
        metadata: {
            previousState: "ERROR",
            currentState: "RUNNING",
            status: "succeeded"
        }
    }]);
});

test("maps denied, busy, and failed decisions without private details", () => {
    const records = [];
    const service = new DiscordLifecycleAuditService({
        recordingService: {
            record(record) {
                records.push(record);
            }
        }
    });

    service.recordAttempt({
        actorId: "discord-user-1",
        operation: "restart",
        outcome: "DENIED",
        status: "permission-denied"
    });
    service.recordAttempt({
        actorId: "discord-user-1",
        operation: "restart",
        outcome: "FAILED",
        status: "busy"
    });

    assert.deepEqual(
        records.map(record => record.outcome),
        ["denied", "failed"]
    );
    assert.doesNotMatch(
        JSON.stringify(records),
        /password|host|port|socket|stack|console/iu
    );
});

test("contains recording failures and rejects unsupported operations", () => {
    const service = new DiscordLifecycleAuditService({
        recordingService: {
            record() {
                throw new Error("private storage details");
            }
        }
    });

    assert.equal(service.recordAttempt({
        actorId: "discord-user-1",
        operation: "reload",
        outcome: "FAILED"
    }), false);
    assert.equal(service.recordAttempt({
        actorId: "discord-user-1",
        operation: "delete",
        outcome: "SUCCESS"
    }), false);
});
