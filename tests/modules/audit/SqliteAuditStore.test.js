const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
    DatabaseSync
} = require("node:sqlite");

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
const AuditMigrations = require(
    "../../../src/modules/audit/persistence/AuditMigrations"
);
const SqliteAuditStore = require(
    "../../../src/modules/audit/persistence/SqliteAuditStore"
);
const AuditQueryPolicy = require(
    "../../../src/modules/audit/services/AuditQueryPolicy"
);

function openDatabase(location) {

    const database = new DatabaseSync(location);

    database.exec("PRAGMA foreign_keys = ON");
    database.exec(AuditMigrations[0].sql);

    return database;

}

function createAction(action, overrides = {}) {
    return {
        actorType: AuditActorType.DISCORD_USER,
        actorId: "discord-user-1",
        source: AuditSource.DISCORD,
        action,
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

test("SQLite Audit persistence survives restart and continues IDs", t => {

    const directory = fs.mkdtempSync(
        path.join(os.tmpdir(), "rsf-audit-")
    );
    const location = path.join(directory, "audit.sqlite");

    t.after(() => {
        fs.rmSync(directory, {
            recursive: true,
            force: true
        });
    });

    let database = openDatabase(location);
    let module = new AuditModule({
        store: new SqliteAuditStore(database),
        clock: () => new Date("2026-08-01T12:00:00.000Z")
    });

    module.initialize();

    assert.equal(
        module.recordAction(createAction("lifecycle.reload")).id,
        "audit-1"
    );
    assert.equal(
        module.recordAction(createAction("lifecycle.restart")).id,
        "audit-2"
    );

    database.close();

    database = new DatabaseSync(location);
    module = new AuditModule({
        store: new SqliteAuditStore(database),
        clock: () => new Date("2026-08-01T12:05:00.000Z")
    });

    module.initialize();

    assert.equal(module.countRecords(), 2);
    assert.deepEqual(
        module.listRecent(2).map(record => record.id),
        ["audit-2", "audit-1"]
    );
    assert.equal(
        module.getRecord("audit-1").metadata.currentState,
        "running"
    );
    assert.equal(
        module.recordAction(createAction("lifecycle.reload")).id,
        "audit-3"
    );

    database.close();

});

test("SQLite Audit store applies fixed filtered page queries", () => {
    const database = openDatabase(":memory:");
    const module = new AuditModule({
        store: new SqliteAuditStore(database)
    });

    module.initialize();
    module.recordAction(createAction("lifecycle.reload"));
    module.recordAction(createAction("lifecycle.restart"));
    module.recordAction(createAction("lifecycle.reload", {
        outcome: AuditOutcome.FAILED
    }));
    module.recordAction(createAction("lifecycle.reload"));

    const filters = AuditQueryPolicy.createFilters({
        action: "lifecycle.reload",
        outcome: AuditOutcome.SUCCESS
    });
    const first = module.queryRecords({
        beforeSequence: null,
        limit: 1,
        filters
    });
    const second = module.queryRecords({
        beforeSequence: 4,
        limit: 2,
        filters
    });

    assert.deepEqual(
        first.map(record => record.id),
        ["audit-4"]
    );
    assert.deepEqual(
        second.map(record => record.id),
        ["audit-1"]
    );

    database.close();
});

test("SQLite Audit store returns null for unknown valid IDs", () => {

    const database = openDatabase(":memory:");
    const store = new SqliteAuditStore(database);

    assert.equal(store.getById("audit-1"), null);

    database.close();

});
