const assert = require("node:assert/strict");
const test = require("node:test");

const DiscordTicketAuditService = require(
    "../../../../src/providers/discord/services/DiscordTicketAuditService"
);

function createService(records, error = null) {
    return new DiscordTicketAuditService({
        recordingService: {
            record(record) {
                if (error) {
                    throw error;
                }

                records.push(record);
            }
        }
    });
}

test("maps all privileged Ticket staff mutations to fixed records", () => {
    const records = [];
    const service = createService(records);

    for (const action of [
        "message",
        "assign",
        "unassign",
        "close"
    ]) {
        assert.equal(service.recordAttempt({
            actorId: "staff-1",
            action,
            targetId: "ticket-7",
            outcome: "SUCCESS",
            status: "succeeded"
        }), true);
    }

    assert.deepEqual(
        records.map(record => record.action),
        [
            "ticket.staff.message",
            "ticket.staff.assign",
            "ticket.staff.unassign",
            "ticket.staff.close"
        ]
    );

    for (const record of records) {
        assert.equal(record.actorType, "discord-user");
        assert.equal(record.actorId, "staff-1");
        assert.equal(record.source, "discord");
        assert.equal(record.targetType, "ticket");
        assert.equal(record.targetId, "ticket-7");
        assert.equal(record.outcome, "success");
        assert.deepEqual(record.metadata, {
            status: "succeeded"
        });
    }
});

test("maps denied and failed Ticket outcomes without private data", () => {
    const records = [];
    const service = createService(records);

    service.recordAttempt({
        actorId: "staff-1",
        action: "assign",
        targetId: "ticket-7",
        outcome: "DENIED",
        status: "permission-denied",
        assigneeId: "staff-2"
    });
    service.recordAttempt({
        actorId: "staff-1",
        action: "message",
        targetId: "ticket-7",
        outcome: "FAILED",
        status: "persistence-failed",
        content: "private Ticket content",
        interaction: {
            token: "private Discord token"
        }
    });

    assert.deepEqual(
        records.map(record => record.outcome),
        ["denied", "failed"]
    );

    assert.doesNotMatch(
        JSON.stringify(records),
        /staff-2|private Ticket content|private Discord token/iu
    );
});

test("contains recording failures and unsupported actions", () => {
    const service = createService(
        [],
        new Error("private Audit persistence failure")
    );

    assert.equal(service.recordAttempt({
        actorId: "staff-1",
        action: "close",
        targetId: "ticket-7",
        outcome: "SUCCESS",
        status: "succeeded"
    }), false);

    assert.equal(service.recordAttempt({
        actorId: "staff-1",
        action: "view",
        targetId: "ticket-7",
        outcome: "SUCCESS",
        status: "succeeded"
    }), false);
});

test("exposes one frozen narrow Ticket Audit boundary", () => {
    const boundary = createService([]).asBoundary();

    assert.equal(Object.isFrozen(boundary), true);
    assert.deepEqual(Object.keys(boundary), [
        "recordAttempt"
    ]);
    assert.equal(typeof boundary.recordAttempt, "function");
});
