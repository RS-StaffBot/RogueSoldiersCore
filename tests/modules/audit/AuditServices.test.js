const assert = require("node:assert/strict");
const test = require("node:test");

const AuditModule = require(
    "../../../src/modules/audit/AuditModule"
);
const {
    AuditActorType,
    AuditOutcome,
    AuditSource
} = require(
    "../../../src/modules/audit/AuditContract"
);
const AuditQueryPolicy = require(
    "../../../src/modules/audit/services/AuditQueryPolicy"
);
const AuditQueryService = require(
    "../../../src/modules/audit/services/AuditQueryService"
);
const AuditRecordingService = require(
    "../../../src/modules/audit/services/AuditRecordingService"
);

function createAction(index, overrides = {}) {
    return {
        actorType: AuditActorType.DISCORD_USER,
        actorId: `discord-user-${index}`,
        source: AuditSource.DISCORD,
        action: index % 2 === 0
            ? "lifecycle.restart"
            : "lifecycle.reload",
        targetType: "provider",
        targetId: "7-days-to-die",
        outcome: index === 3
            ? AuditOutcome.FAILED
            : AuditOutcome.SUCCESS,
        metadata: {
            status: `result-${index}`
        },
        ...overrides
    };
}

test("recording service exposes only a frozen normalized boundary", () => {
    const module = new AuditModule();
    const service = new AuditRecordingService({
        auditModule: module
    });

    module.initialize();

    const record = service.record(createAction(1));

    assert.equal(record.id, "audit-1");
    assert.equal(Object.isFrozen(service), true);
    assert.equal("auditModule" in service, false);
    assert.equal("store" in service, false);
    assert.throws(
        () => service.record(createAction(2, { actorId: "" })),
        { message: "Audit recording failed." }
    );
});

test("query service paginates newest-first with opaque cursors", () => {
    const module = new AuditModule();
    const recording = new AuditRecordingService({
        auditModule: module
    });
    const query = new AuditQueryService({
        auditModule: module,
        defaultLimit: 2,
        maximumLimit: 3
    });

    module.initialize();

    for (let index = 1; index <= 5; index += 1) {
        recording.record(createAction(index));
    }

    const first = query.list();
    const second = query.list({
        limit: 2,
        cursor: first.nextCursor
    });
    const third = query.list({
        limit: 2,
        cursor: second.nextCursor
    });

    assert.deepEqual(
        first.records.map(record => record.id),
        ["audit-5", "audit-4"]
    );
    assert.deepEqual(
        second.records.map(record => record.id),
        ["audit-3", "audit-2"]
    );
    assert.deepEqual(
        third.records.map(record => record.id),
        ["audit-1"]
    );
    assert.notEqual(first.nextCursor, "audit-4");
    assert.equal(third.nextCursor, null);
    assert.equal(Object.isFrozen(first), true);
    assert.equal(Object.isFrozen(first.records), true);
    assert.equal(Object.isFrozen(query), true);
    assert.equal("auditModule" in query, false);
});

test("query service applies only allowlisted exact filters", () => {
    const module = new AuditModule();
    const recording = new AuditRecordingService({
        auditModule: module
    });
    const query = new AuditQueryService({
        auditModule: module
    });

    module.initialize();

    for (let index = 1; index <= 5; index += 1) {
        recording.record(createAction(index));
    }

    const result = query.list({
        filters: {
            action: "lifecycle.reload",
            outcome: AuditOutcome.SUCCESS
        }
    });

    assert.deepEqual(
        result.records.map(record => record.id),
        ["audit-5", "audit-1"]
    );
    assert.throws(
        () => query.list({
            filters: { actorId: "discord-user-1" }
        }),
        { message: "Audit query failed." }
    );
    assert.throws(
        () => query.list({ cursor: "not-a-valid-cursor" }),
        { message: "Audit query failed." }
    );
    assert.throws(
        () => query.list({ limit: 101 }),
        { message: "Audit query failed." }
    );
});

test("query policy rejects forged cursor structures", () => {
    const forged = Buffer.from(
        JSON.stringify({ before: 2, extra: true }),
        "utf8"
    ).toString("base64url");

    assert.throws(
        () => AuditQueryPolicy.decodeCursor(forged),
        /continuation cursor is invalid/
    );
});
