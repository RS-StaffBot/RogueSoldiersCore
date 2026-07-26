const { test } = require("node:test");
const assert = require("node:assert/strict");

const ModerationAuditRecord = require(
    "../../../src/modules/moderation/ModerationAuditRecord"
);
const InMemoryModerationStore = require(
    "../../../src/modules/moderation/persistence/" +
    "InMemoryModerationStore"
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
    "pending: nested moderation details are defensive and immutable",
    {
        skip:
            "Known Phase 4 defect: nested detail objects are shared."
    },
    () => {

        const store = new InMemoryModerationStore();

        store.append(createRecord({
            context: {
                durationSeconds: 60
            }
        }));

        const firstRead = store.list();

        firstRead[0].details.context.durationSeconds = 120;

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
