const test = require("node:test");
const assert = require("node:assert/strict");
const AuditModule = require(
    "../../../src/modules/audit/AuditModule"
);
const AuditRecord = require(
    "../../../src/modules/audit/AuditRecord"
);
const InMemoryAuditStore = require(
    "../../../src/modules/audit/persistence/InMemoryAuditStore"
);
const {
    AuditActorType,
    AuditOutcome,
    AuditSource
} = require(
    "../../../src/modules/audit/AuditContract"
);

function createAction(overrides = {}) {
    return {
        actorType: AuditActorType.DISCORD_USER,
        actorId: "discord-user-1",
        source: AuditSource.DISCORD,
        action: "lifecycle.reload",
        targetType: "provider",
        targetId: "7-days-to-die",
        outcome: AuditOutcome.SUCCESS,
        metadata: {
            previousState: "error",
            currentState: "running"
        },
        ...overrides
    };
}

test("AuditModule records immutable sequential audit records", () => {

    const fixedDate = new Date("2026-08-01T12:00:00.000Z");
    const module = new AuditModule({
        clock: () => new Date(fixedDate)
    });

    module.initialize();

    const first = module.recordAction(createAction());
    const second = module.recordAction(createAction({
        action: "lifecycle.restart"
    }));

    assert.equal(first.id, "audit-1");
    assert.equal(second.id, "audit-2");
    assert.equal(first.createdAt, fixedDate.toISOString());
    assert.equal(module.countRecords(), 2);
    assert.ok(Object.isFrozen(first));
    assert.ok(Object.isFrozen(first.metadata));

    first.metadata.currentState = "tampered";

    assert.equal(first.metadata.currentState, "running");

});

test("AuditModule returns defensive records in newest-first order", () => {

    const store = new InMemoryAuditStore();
    const module = new AuditModule({ store });

    module.initialize();
    module.recordAction(createAction({ action: "first" }));
    module.recordAction(createAction({ action: "second" }));

    const recent = module.listRecent(2);

    assert.deepEqual(
        recent.map(record => record.action),
        ["second", "first"]
    );
    assert.ok(Object.isFrozen(recent));
    assert.notStrictEqual(
        recent[0].metadata,
        store.records[1].metadata
    );

    recent[0].metadata.status = "changed";

    assert.equal(
        module.getRecord("audit-2").metadata.status,
        undefined
    );

});

test("AuditRecord rejects unsupported or unbounded metadata", () => {

    assert.throws(
        () => AuditRecord.createDraft(createAction({
            metadata: {
                rawConsoleOutput: "private"
            },
            createdAt: new Date()
        })),
        /unsupported field/
    );

    assert.throws(
        () => AuditRecord.createDraft(createAction({
            metadata: {
                referenceId: "x".repeat(129)
            },
            createdAt: new Date()
        })),
        /no longer than 128 characters/
    );

});

test("AuditModule validates contracts, limits, and stored state", () => {

    assert.throws(
        () => new AuditModule({ store: {} }),
        /required contract/
    );

    const module = new AuditModule({
        defaultRecentLimit: 2,
        maximumRecentLimit: 2
    });

    module.initialize();

    assert.throws(
        () => module.listRecent(3),
        /configured maximum/
    );
    assert.throws(
        () => module.recordAction(createAction({
            actorId: ""
        })),
        /actor ID/
    );

    const invalidStore = new InMemoryAuditStore();
    invalidStore.records.push({
        id: "bad-id"
    });
    const invalidModule = new AuditModule({
        store: invalidStore
    });

    assert.throws(
        () => invalidModule.initialize(),
        /durable state is invalid/
    );

});
