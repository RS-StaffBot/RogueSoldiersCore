const test = require("node:test");
const assert = require("node:assert/strict");
const SettingDefinition = require(
    "../../../src/core/settings/SettingDefinition"
);
const SettingRegistry = require(
    "../../../src/core/settings/SettingRegistry"
);
const SettingChangeMode = require(
    "../../../src/core/settings/SettingChangeMode"
);
const SettingValueType = require(
    "../../../src/core/settings/SettingValueType"
);
const SettingsPermission = require(
    "../../../src/shared/permissions/SettingsPermission"
);
const EconomySettingDefinitions = require(
    "../../../src/modules/economy/EconomySettingDefinitions"
);

function createDefinition(overrides = {}) {

    return new SettingDefinition({
        key: "test.setting",
        owner: "Test",
        valueType: SettingValueType.INTEGER,
        changeMode: SettingChangeMode.LIVE,
        readPermission: SettingsPermission.VIEW,
        updatePermission: SettingsPermission.UPDATE,
        ...overrides
    });

}

test("creates frozen defensive setting definitions", () => {

    const definition = createDefinition();
    const first = definition.toSnapshot();
    const second = definition.toSnapshot();

    assert.equal(Object.isFrozen(definition), true);
    assert.equal(Object.isFrozen(first), true);
    assert.notEqual(first, second);
    assert.deepEqual(first, second);

});

test("rejects invalid and inconsistent setting definitions", () => {

    assert.throws(
        () => createDefinition({ key: " " }),
        /Setting key/
    );
    assert.throws(
        () => createDefinition({ valueType: "NUMBER" }),
        /Unsupported setting value type/
    );
    assert.throws(
        () => createDefinition({ changeMode: "HOT" }),
        /Unsupported setting change mode/
    );
    assert.throws(
        () => createDefinition({ secret: true }),
        /Secret settings/
    );
    assert.throws(
        () => createDefinition({
            changeMode: SettingChangeMode.SECRET
        }),
        /Secret settings/
    );

});

test("registers, lists, and retrieves setting definitions safely", () => {

    const registry = new SettingRegistry();
    const definition = createDefinition();

    registry.register(definition);

    const listed = registry.list();

    assert.equal(Object.isFrozen(listed), true);
    assert.equal(listed.length, 1);
    assert.deepEqual(registry.get(definition.key), listed[0]);
    assert.throws(
        () => registry.register(definition),
        /already registered/
    );
    assert.throws(
        () => registry.get("missing.setting"),
        /Unknown setting/
    );

});

test("declares the six initial Economy settings", () => {

    const registry = new SettingRegistry();

    for (const definition of EconomySettingDefinitions) {
        registry.register(definition);
    }

    assert.equal(Object.isFrozen(EconomySettingDefinitions), true);
    assert.deepEqual(
        registry.list().map(definition => definition.key),
        [
            "economy.startingBalance",
            "economy.dailyReward",
            "economy.dailyCooldownMilliseconds",
            "economy.leaderboardLimit",
            "economy.transactionPageLimit",
            "economy.transferPolicy"
        ]
    );
    assert.equal(
        registry.list().every(
            definition =>
                definition.owner === "Economy" &&
                definition.secret === false
        ),
        true
    );

});
