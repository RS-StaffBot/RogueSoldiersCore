const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
    DatabaseSync
} = require("node:sqlite");

const ModerationAuditRecord = require(
    "../../../src/modules/moderation/ModerationAuditRecord"
);
const InMemoryModerationStore = require(
    "../../../src/modules/moderation/persistence/" +
    "InMemoryModerationStore"
);
const ModerationMigrations = require(
    "../../../src/modules/moderation/persistence/" +
    "ModerationMigrations"
);
const SqliteModerationStore = require(
    "../../../src/modules/moderation/persistence/" +
    "SqliteModerationStore"
);

function createRecord(details = {}) {

    return new ModerationAuditRecord({
        action: "WARN",
        guildId: "guild-1",
        moderatorId: "moderator-1",
        targetId: "target-1",
        reason: "  Test reason.  ",
        details,
        createdAt: new Date("2026-01-02T03:04:05.000Z")
    });

}

test("constructs a frozen moderation audit record", () => {

    const record = createRecord({
        channelId: "channel-1"
    });

    assert.deepStrictEqual(
        {
            action: record.action,
            guildId: record.guildId,
            moderatorId: record.moderatorId,
            targetId: record.targetId,
            reason: record.reason,
            details: record.details,
            createdAt: record.createdAt
        },
        {
            action: "WARN",
            guildId: "guild-1",
            moderatorId: "moderator-1",
            targetId: "target-1",
            reason: "Test reason.",
            details: {
                channelId: "channel-1"
            },
            createdAt: "2026-01-02T03:04:05.000Z"
        }
    );
    assert.strictEqual(Object.isFrozen(record), true);
    assert.strictEqual(
        Object.isFrozen(record.details),
        true
    );

});

test("returns defensive top-level records and details", () => {

    const store = new InMemoryModerationStore();

    store.append(createRecord({
        channelId: "channel-1"
    }));

    const firstRead = store.list();

    firstRead[0].reason = "Changed reason.";
    firstRead[0].details.channelId = "changed-channel";
    firstRead.push({
        action: "PURGE"
    });

    assert.deepStrictEqual(
        store.list(),
        [
            {
                action: "WARN",
                guildId: "guild-1",
                moderatorId: "moderator-1",
                targetId: "target-1",
                reason: "Test reason.",
                details: {
                    channelId: "channel-1"
                },
                createdAt: "2026-01-02T03:04:05.000Z"
            }
        ]
    );
    assert.strictEqual(store.count(), 1);

});

test(
    "keeps nested moderation details defensive and immutable",
    () => {

        const store = new InMemoryModerationStore();

        store.append(createRecord({
            context: {
                durationSeconds: 60
            }
        }));

        const firstRead = store.list();

        assert.strictEqual(
            Reflect.set(
                firstRead[0].details.context,
                "durationSeconds",
                120
            ),
            false
        );

        assert.strictEqual(
            store.list()[0].details.context.durationSeconds,
            60
        );
        assert.strictEqual(
            Object.isFrozen(
                firstRead[0].details.context
            ),
            true
        );

    }
);

test("copies nested input objects and arrays independently", () => {

    const input = {
        context: {
            flags: [
                "first",
                {
                    name: "second"
                }
            ]
        }
    };
    const record = createRecord(input);

    input.context.flags[0] = "changed";
    input.context.flags[1].name = "changed";
    input.context.flags.push("third");

    assert.deepStrictEqual(
        record.details,
        {
            context: {
                flags: [
                    "first",
                    {
                        name: "second"
                    }
                ]
            }
        }
    );
    assert.notStrictEqual(record.details, input);
    assert.notStrictEqual(
        record.details.context,
        input.context
    );
    assert.notStrictEqual(
        record.details.context.flags,
        input.context.flags
    );
    assert.strictEqual(
        Object.isFrozen(record.details.context),
        true
    );
    assert.strictEqual(
        Object.isFrozen(record.details.context.flags),
        true
    );
    assert.strictEqual(
        Object.isFrozen(
            record.details.context.flags[1]
        ),
        true
    );

});

test("returns independent immutable nested details on repeated reads", () => {

    const store = new InMemoryModerationStore();

    store.append(createRecord({
        context: {
            values: [
                {
                    count: 1
                }
            ]
        }
    }));

    const firstRead = store.list();
    const secondRead = store.list();

    assert.notStrictEqual(firstRead, secondRead);
    assert.notStrictEqual(
        firstRead[0].details,
        secondRead[0].details
    );
    assert.notStrictEqual(
        firstRead[0].details.context,
        secondRead[0].details.context
    );
    assert.notStrictEqual(
        firstRead[0].details.context.values,
        secondRead[0].details.context.values
    );
    assert.strictEqual(
        Reflect.set(
            firstRead[0].details.context.values[0],
            "count",
            2
        ),
        false
    );
    assert.throws(
        () => firstRead[0].details.context.values.push(2),
        TypeError
    );
    assert.strictEqual(
        secondRead[0].details.context.values[0].count,
        1
    );
    assert.strictEqual(
        store.list()[0].details.context.values[0].count,
        1
    );

});

test("rejects unsupported and cyclic detail values", () => {

    const cyclic = {};

    cyclic.self = cyclic;

    const sparse = [];

    sparse[1] = "value";

    const accessor = {};

    Object.defineProperty(
        accessor,
        "value",
        {
            enumerable: true,
            get() {
                return "value";
            }
        }
    );

    const symbolKey = Symbol("key");
    const withSymbolKey = {
        value: "value"
    };

    withSymbolKey[symbolKey] = "hidden";

    const unsupportedDetails = [
        {
            value: undefined
        },
        {
            value() {}
        },
        {
            value: Symbol("value")
        },
        {
            value: 1n
        },
        {
            value: Number.NaN
        },
        {
            value: Number.POSITIVE_INFINITY
        },
        {
            value: -0
        },
        {
            value: new Date()
        },
        {
            value: new Map()
        },
        {
            value: sparse
        },
        {
            value: accessor
        },
        withSymbolKey,
        cyclic
    ];

    for (const details of unsupportedDetails) {
        assert.throws(
            () => createRecord(details),
            /Moderation details/
        );
    }

});

test("matches nested details behavior in SQLite", () => {

    const database = new DatabaseSync(":memory:");

    try {

        database.exec(ModerationMigrations[0].sql);

        const store = new SqliteModerationStore(database);
        const input = {
            context: {
                values: [
                    true,
                    null,
                    42,
                    {
                        name: "value"
                    }
                ]
            }
        };

        store.append(createRecord(input));

        input.context.values[3].name = "changed";

        const firstRead = store.list();
        const secondRead = store.list();

        assert.deepStrictEqual(
            firstRead[0].details,
            {
                context: {
                    values: [
                        true,
                        null,
                        42,
                        {
                            name: "value"
                        }
                    ]
                }
            }
        );
        assert.notStrictEqual(
            firstRead[0].details,
            secondRead[0].details
        );
        assert.strictEqual(
            Object.isFrozen(
                firstRead[0].details.context.values
            ),
            true
        );
        assert.strictEqual(
            Reflect.set(
                firstRead[0].details.context.values[3],
                "name",
                "changed"
            ),
            false
        );
        assert.strictEqual(
            secondRead[0].details.context.values[3].name,
            "value"
        );
        assert.strictEqual(store.count(), 1);

    } finally {
        database.close();
    }

});
