const test = require("node:test");
const assert = require("node:assert/strict");

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
const EconomyModule = require(
    "../../../src/modules/economy/EconomyModule"
);
const EconomySettingDefinitions = require(
    "../../../src/modules/economy/EconomySettingDefinitions"
);
const EconomySettingsReader = require(
    "../../../src/modules/economy/EconomySettingsReader"
);
const EconomySettingsValidator = require(
    "../../../src/modules/economy/EconomySettingsValidator"
);
const SettingsPermission = require(
    "../../../src/shared/permissions/SettingsPermission"
);

function createActor(permissions) {
    return {
        actorId: "actor-1",
        permissions
    };
}

function createStore() {
    const records = new Map();

    return {
        records,
        save(record) {
            const snapshot = Object.freeze({ ...record });
            records.set(record.settingKey, snapshot);
            return snapshot;
        },
        delete(settingKey) {
            return records.delete(settingKey);
        }
    };
}

function createService() {
    const registry = new SettingRegistry();

    for (const definition of EconomySettingDefinitions) {
        registry.register(definition);
    }

    const economyModule = new EconomyModule();
    const store = createStore();
    const service = new SettingsService({
        registry,
        ownerReaders: {
            Economy: new EconomySettingsReader(economyModule)
        },
        ownerValidators: {
            Economy: new EconomySettingsValidator(economyModule)
        },
        store,
        now: () => new Date("2026-07-27T20:00:00.000Z")
    });

    return { service, store };
}

test("stores authorized validated updates and supports reset", () => {
    const { service, store } = createService();
    const actor = createActor([SettingsPermission.UPDATE]);

    const updated = service.updateSetting(
        actor,
        "economy.dailyReward",
        250
    );

    assert.deepEqual(updated, {
        settingKey: "economy.dailyReward",
        valueType: SettingValueType.INTEGER,
        value: 250,
        updatedAt: "2026-07-27T20:00:00.000Z",
        updatedBy: "actor-1"
    });
    assert.equal(Object.isFrozen(updated), true);
    assert.equal(store.records.get("economy.dailyReward").value, 250);

    const reset = service.resetSetting(actor, "economy.dailyReward");
    assert.deepEqual(reset, {
        key: "economy.dailyReward",
        reset: true
    });
    assert.equal(Object.isFrozen(reset), true);
    assert.equal(store.records.has("economy.dailyReward"), false);
});

test("allows administrative mutation override", () => {
    const { service } = createService();

    const updated = service.updateSetting(
        createActor([SettingsPermission.ADMINISTRATE]),
        "economy.transferPolicy",
        "EVERYONE"
    );

    assert.equal(updated.value, "EVERYONE");
});

test("rejects unauthorized, unknown, and wrong-type updates", () => {
    const { service } = createService();

    assert.throws(
        () => service.updateSetting(
            createActor([]),
            "economy.dailyReward",
            100
        ),
        /not authorized/
    );
    assert.throws(
        () => service.resetSetting(
            createActor([]),
            "economy.dailyReward"
        ),
        /not authorized/
    );
    assert.throws(
        () => service.updateSetting(
            createActor([SettingsPermission.UPDATE]),
            "economy.unknown",
            100
        ),
        /Unknown setting/
    );
    assert.throws(
        () => service.updateSetting(
            createActor([SettingsPermission.UPDATE]),
            "economy.dailyReward",
            "100"
        ),
        /safe integer/
    );
});

test("rejects Economy-invalid values without replacing stored state", () => {
    const { service, store } = createService();
    const actor = createActor([SettingsPermission.UPDATE]);

    service.updateSetting(actor, "economy.dailyReward", 100);

    assert.throws(
        () => service.updateSetting(actor, "economy.dailyReward", 0),
        /positive safe integer/
    );
    assert.equal(store.records.get("economy.dailyReward").value, 100);

    assert.throws(
        () => service.updateSetting(
            actor,
            "economy.leaderboardLimit",
            101
        ),
        /cannot exceed the maximum/
    );
    assert.throws(
        () => service.updateSetting(
            actor,
            "economy.transferPolicy",
            "INVALID"
        ),
        /Unsupported economy transfer policy/
    );
});

test("rejects secret mutation before owner validation", () => {
    const registry = new SettingRegistry();
    registry.register(new SettingDefinition({
        key: "example.secret",
        owner: "Example",
        valueType: SettingValueType.STRING,
        changeMode: SettingChangeMode.SECRET,
        secret: true,
        readPermission: SettingsPermission.VIEW,
        updatePermission: SettingsPermission.UPDATE
    }));

    let validationCount = 0;
    const service = new SettingsService({
        registry,
        ownerReaders: {},
        ownerValidators: {
            Example: {
                validate() {
                    validationCount += 1;
                }
            }
        },
        store: createStore()
    });
    const actor = createActor([SettingsPermission.ADMINISTRATE]);

    assert.throws(
        () => service.updateSetting(actor, "example.secret", "value"),
        /cannot be updated here/
    );
    assert.throws(
        () => service.resetSetting(actor, "example.secret"),
        /cannot be reset here/
    );
    assert.equal(validationCount, 0);
});

test("preserves existing read-only construction and validates mutation boundaries", () => {
    const registry = new SettingRegistry();
    const readOnly = new SettingsService({
        registry,
        ownerReaders: {}
    });

    assert.deepEqual(
        readOnly.listSettings(createActor([SettingsPermission.VIEW])),
        []
    );
    assert.throws(
        () => readOnly.updateSetting(
            createActor([SettingsPermission.UPDATE]),
            "missing",
            true
        ),
        /store is not configured/
    );
    assert.throws(
        () => new EconomySettingsValidator({ name: "Tickets" }),
        /requires the Economy Module/
    );
});
