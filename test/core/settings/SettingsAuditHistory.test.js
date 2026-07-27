const test = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");

const SettingChangeMode = require(
    "../../../src/core/settings/SettingChangeMode"
);
const SettingDefinition = require(
    "../../../src/core/settings/SettingDefinition"
);
const SettingRegistry = require(
    "../../../src/core/settings/SettingRegistry"
);
const SettingValueType = require(
    "../../../src/core/settings/SettingValueType"
);
const SettingsService = require(
    "../../../src/core/settings/SettingsService"
);
const SettingsAuditStore = require(
    "../../../src/core/settings/persistence/SettingsAuditStore"
);
const SettingsMigrations = require(
    "../../../src/core/settings/persistence/SettingsMigrations"
);
const SettingsStore = require(
    "../../../src/core/settings/persistence/SettingsStore"
);

function createContext() {
    const database = new DatabaseSync(":memory:");

    for (const migration of SettingsMigrations) {
        database.exec(migration.sql);
    }

    const registry = new SettingRegistry();
    registry.register(new SettingDefinition({
        key: "economy.dailyReward",
        owner: "Economy",
        valueType: SettingValueType.INTEGER,
        changeMode: SettingChangeMode.LIVE,
        readPermission: "settings.view",
        updatePermission: "settings.update"
    }));

    const store = new SettingsStore(database);
    const auditStore = new SettingsAuditStore(database);
    const service = new SettingsService({
        registry,
        ownerReaders: {
            Economy: { get: () => 100 }
        },
        ownerValidators: {
            Economy: {
                validate(key, value) {
                    if (key !== "economy.dailyReward" || value <= 0) {
                        throw new Error("invalid Economy setting");
                    }
                }
            }
        },
        store,
        auditStore,
        now: () => new Date("2026-07-27T23:00:00.000Z")
    });
    const actor = {
        actorId: "admin-1",
        permissions: ["settings.update"]
    };

    return { database, store, auditStore, service, actor };
}

test("records updates and resets in newest-first history", () => {
    const context = createContext();

    context.service.updateSetting(
        context.actor,
        "economy.dailyReward",
        200
    );
    context.service.updateSetting(
        context.actor,
        "economy.dailyReward",
        300
    );
    context.service.resetSetting(
        context.actor,
        "economy.dailyReward"
    );

    const history = context.auditStore.listHistory({ limit: 10 });

    assert.equal(Object.isFrozen(history), true);
    assert.equal(history.length, 3);
    assert.equal(history[0].action, "RESET");
    assert.equal(history[0].previousValue, 300);
    assert.equal(history[0].newValue, null);
    assert.equal(history[1].previousValue, 200);
    assert.equal(history[1].newValue, 300);
    assert.equal(history[2].previousValue, null);
    assert.equal(history[2].newValue, 200);
    assert.equal(Object.isFrozen(history[0]), true);

    const filtered = context.auditStore.listHistory({
        settingKey: "economy.dailyReward",
        limit: 1,
        beforeSequence: history[0].sequence
    });

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].sequence, history[1].sequence);
    context.database.close();
});

test("does not audit failed changes or no-op resets", () => {
    const context = createContext();

    assert.throws(
        () => context.service.updateSetting(
            context.actor,
            "economy.dailyReward",
            0
        ),
        /invalid Economy setting/
    );

    const result = context.service.resetSetting(
        context.actor,
        "economy.dailyReward"
    );

    assert.equal(result.reset, false);
    assert.equal(context.auditStore.listHistory().length, 0);
    context.database.close();
});

test("rolls back a setting write when audit insertion fails", () => {
    const context = createContext();
    const originalRecord = context.auditStore.record.bind(context.auditStore);

    context.auditStore.record = () => {
        throw new Error("audit failed");
    };

    assert.throws(
        () => context.service.updateSetting(
            context.actor,
            "economy.dailyReward",
            250
        ),
        /audit failed/
    );

    assert.equal(context.store.get("economy.dailyReward"), null);
    context.auditStore.record = originalRecord;
    context.database.close();
});
