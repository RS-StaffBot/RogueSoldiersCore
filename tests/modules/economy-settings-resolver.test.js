const { test } = require("node:test");
const assert = require("node:assert/strict");

const SettingValueType = require(
    "../../src/core/settings/SettingValueType"
);
const EconomyModule = require(
    "../../src/modules/economy/EconomyModule"
);
const EconomySettingsReader = require(
    "../../src/modules/economy/EconomySettingsReader"
);
const EconomySettingsResolver = require(
    "../../src/modules/economy/EconomySettingsResolver"
);
const EconomyTransferPolicy = require(
    "../../src/modules/economy/EconomyTransferPolicy"
);

function createRecord(settingKey, valueType, value) {

    return Object.freeze({
        settingKey,
        valueType,
        value,
        updatedAt: "2026-07-27T23:00:00.000Z",
        updatedBy: "admin-1"
    });

}

function createResolver(records) {

    return new EconomySettingsResolver({
        store: {
            list: () => Object.freeze(records)
        }
    });

}

test("maps all persisted Economy settings into real Module options", () => {

    const resolver = createResolver([
        createRecord(
            "economy.startingBalance",
            SettingValueType.INTEGER,
            25
        ),
        createRecord(
            "economy.dailyReward",
            SettingValueType.INTEGER,
            250
        ),
        createRecord(
            "economy.dailyCooldownMilliseconds",
            SettingValueType.INTEGER,
            3600000
        ),
        createRecord(
            "economy.leaderboardLimit",
            SettingValueType.INTEGER,
            20
        ),
        createRecord(
            "economy.transactionPageLimit",
            SettingValueType.INTEGER,
            40
        ),
        createRecord(
            "economy.transferPolicy",
            SettingValueType.STRING,
            EconomyTransferPolicy.EVERYONE
        ),
        createRecord(
            "tickets.unrelated",
            SettingValueType.BOOLEAN,
            true
        )
    ]);
    const options = resolver.resolve();
    const economy = new EconomyModule(options);
    const reader = new EconomySettingsReader(economy);

    assert.equal(Object.isFrozen(options), true);
    assert.equal(reader.get("economy.startingBalance"), 25);
    assert.equal(reader.get("economy.dailyReward"), 250);
    assert.equal(
        reader.get("economy.dailyCooldownMilliseconds"),
        3600000
    );
    assert.equal(reader.get("economy.leaderboardLimit"), 20);
    assert.equal(reader.get("economy.transactionPageLimit"), 40);
    assert.equal(
        reader.get("economy.transferPolicy"),
        EconomyTransferPolicy.EVERYONE
    );

});

test("retains existing Economy defaults when overrides are absent", () => {

    const economy = new EconomyModule(createResolver([]).resolve());

    assert.equal(economy.startingBalance, 0);
    assert.equal(economy.dailyRewardAmount, 100);
    assert.equal(economy.dailyCooldownMs, 86400000);
    assert.equal(economy.defaultLeaderboardLimit, 10);
    assert.equal(economy.defaultTransactionPageSize, 25);
    assert.equal(
        economy.transferPolicy,
        EconomyTransferPolicy.STAFF_ONLY
    );

});

test("rejects unknown, mismatched, and invalid stored Economy values", () => {

    assert.throws(
        () => createResolver([
            createRecord(
                "economy.unknown",
                SettingValueType.INTEGER,
                1
            )
        ]).resolve(),
        /Unknown stored Economy setting/
    );

    assert.throws(
        () => createResolver([
            createRecord(
                "economy.dailyReward",
                SettingValueType.STRING,
                "100"
            )
        ]).resolve(),
        /type does not match definition/
    );

    assert.throws(
        () => createResolver([
            createRecord(
                "economy.leaderboardLimit",
                SettingValueType.INTEGER,
                101
            )
        ]).resolve(),
        /cannot exceed the maximum/
    );

});
