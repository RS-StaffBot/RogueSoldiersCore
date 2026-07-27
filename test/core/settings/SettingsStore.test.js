const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const SettingValueType = require(
    "../../../src/core/settings/SettingValueType"
);
const SettingsMigrations = require(
    "../../../src/core/settings/persistence/SettingsMigrations"
);
const SettingsStore = require(
    "../../../src/core/settings/persistence/SettingsStore"
);

function createDatabase(location = ":memory:") {
    const database = new DatabaseSync(location);
    database.exec(SettingsMigrations[0].sql);
    return database;
}

test("stores, updates, lists, and deletes setting overrides", () => {
    const database = createDatabase();
    const store = new SettingsStore(database);

    const first = store.save({
        settingKey: "economy.dailyReward",
        valueType: SettingValueType.INTEGER,
        value: 100,
        updatedAt: "2026-07-27T12:00:00.000Z",
        updatedBy: "actor-1"
    });

    assert.deepEqual(first, {
        settingKey: "economy.dailyReward",
        valueType: SettingValueType.INTEGER,
        value: 100,
        updatedAt: "2026-07-27T12:00:00.000Z",
        updatedBy: "actor-1"
    });
    assert.equal(Object.isFrozen(first), true);

    store.save({
        settingKey: "economy.dailyReward",
        valueType: SettingValueType.INTEGER,
        value: 250,
        updatedAt: "2026-07-27T13:00:00.000Z",
        updatedBy: "actor-2"
    });
    store.save({
        settingKey: "economy.transferPolicy",
        valueType: SettingValueType.STRING,
        value: "EVERYONE",
        updatedAt: "2026-07-27T13:30:00.000Z",
        updatedBy: "actor-2"
    });
    store.save({
        settingKey: "example.enabled",
        valueType: SettingValueType.BOOLEAN,
        value: true,
        updatedAt: "2026-07-27T13:45:00.000Z",
        updatedBy: "actor-2"
    });

    const settings = store.list();
    assert.equal(settings.length, 3);
    assert.equal(Object.isFrozen(settings), true);
    assert.equal(settings[0].value, 250);
    assert.equal(settings[1].value, "EVERYONE");
    assert.equal(settings[2].value, true);

    assert.equal(store.delete("economy.dailyReward"), true);
    assert.equal(store.delete("economy.dailyReward"), false);
    assert.equal(store.get("economy.dailyReward"), null);

    database.close();
});

test("persists overrides after closing and reopening SQLite", () => {
    const directory = fs.mkdtempSync(
        path.join(os.tmpdir(), "rsf-settings-")
    );
    const location = path.join(directory, "settings.sqlite3");

    let database = createDatabase(location);
    let store = new SettingsStore(database);

    store.save({
        settingKey: "economy.leaderboardLimit",
        valueType: SettingValueType.INTEGER,
        value: 15,
        updatedAt: "2026-07-27T14:00:00.000Z",
        updatedBy: "actor-1"
    });
    database.close();

    database = new DatabaseSync(location);
    store = new SettingsStore(database);

    assert.equal(store.get("economy.leaderboardLimit").value, 15);

    database.close();
    fs.rmSync(directory, { recursive: true, force: true });
});

test("rejects invalid input and corrupt stored values", () => {
    const database = createDatabase();
    const store = new SettingsStore(database);

    assert.throws(() => new SettingsStore(), /database connection/);
    assert.throws(
        () => store.save({
            settingKey: " ",
            valueType: SettingValueType.INTEGER,
            value: 1,
            updatedAt: "2026-07-27T14:00:00.000Z",
            updatedBy: "actor-1"
        }),
        /Settings key/
    );
    assert.throws(
        () => store.save({
            settingKey: "economy.dailyReward",
            valueType: "NUMBER",
            value: true,
            updatedAt: "2026-07-27T14:00:00.000Z",
            updatedBy: "actor-1"
        }),
        /Unsupported setting value type/
    );
    assert.throws(
        () => store.save({
            settingKey: "economy.dailyReward",
            valueType: SettingValueType.INTEGER,
            value: 1.5,
            updatedAt: "not-a-date",
            updatedBy: "actor-1"
        }),
        /updated timestamp/
    );

    database.prepare(`
        INSERT INTO settings_overrides (
            setting_key,
            value_type,
            serialized_value,
            updated_at,
            updated_by
        ) VALUES (?, ?, ?, ?, ?)
    `).run(
        "economy.dailyReward",
        SettingValueType.INTEGER,
        "not-json",
        "2026-07-27T14:00:00.000Z",
        "actor-1"
    );

    assert.throws(
        () => store.get("economy.dailyReward"),
        /corrupt/
    );

    database.close();
});
