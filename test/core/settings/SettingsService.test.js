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
const SettingsPermission = require(
    "../../../src/shared/permissions/SettingsPermission"
);

function createService(economyOptions = {}) {
    const registry = new SettingRegistry();

    for (const definition of EconomySettingDefinitions) {
        registry.register(definition);
    }

    const economyModule = new EconomyModule(economyOptions);
    const economyReader = new EconomySettingsReader(economyModule);

    return new SettingsService({
        registry,
        ownerReaders: {
            Economy: economyReader
        }
    });
}

function createActor(permissions) {
    return {
        actorId: "actor-1",
        permissions
    };
}

test("lists frozen Economy setting snapshots for an authorized actor", () => {
    const service = createService({
        startingBalance: 25,
        dailyRewardAmount: 150,
        dailyCooldownMs: 60000,
        defaultLeaderboardLimit: 15,
        defaultTransactionPageSize: 30,
        transferPolicy: "EVERYONE"
    });

    const settings = service.listSettings(
        createActor([SettingsPermission.VIEW])
    );

    assert.equal(settings.length, 6);
    assert.equal(Object.isFrozen(settings), true);
    assert.equal(Object.isFrozen(settings[0]), true);

    const values = Object.fromEntries(
        settings.map(setting => [setting.key, setting.value])
    );

    assert.deepEqual(values, {
        "economy.startingBalance": 25,
        "economy.dailyReward": 150,
        "economy.dailyCooldownMilliseconds": 60000,
        "economy.leaderboardLimit": 15,
        "economy.transactionPageLimit": 30,
        "economy.transferPolicy": "EVERYONE"
    });
});

test("reads one setting with administrative override", () => {
    const service = createService({ dailyRewardAmount: 275 });

    const setting = service.getSetting(
        createActor([SettingsPermission.ADMINISTRATE]),
        "economy.dailyReward"
    );

    assert.deepEqual(setting, {
        key: "economy.dailyReward",
        owner: "Economy",
        valueType: SettingValueType.INTEGER,
        changeMode: SettingChangeMode.LIVE,
        secret: false,
        value: 275
    });
    assert.equal(Object.isFrozen(setting), true);
});

test("returns no list values and rejects direct reads without permission", () => {
    const service = createService();
    const actor = createActor([]);

    assert.deepEqual(service.listSettings(actor), []);
    assert.throws(
        () => service.getSetting(actor, "economy.dailyReward"),
        /not authorized/
    );
});

test("rejects invalid actors and unknown settings", () => {
    const service = createService();

    assert.throws(
        () => service.listSettings({ actorId: "actor-1" }),
        /actor is invalid/
    );
    assert.throws(
        () => service.getSetting(
            createActor([SettingsPermission.VIEW]),
            "economy.unknown"
        ),
        /Unknown setting/
    );
});

test("rejects unsupported owners without exposing values", () => {
    const registry = new SettingRegistry();
    registry.register(new SettingDefinition({
        key: "tickets.sample",
        owner: "Tickets",
        valueType: SettingValueType.INTEGER,
        changeMode: SettingChangeMode.LIVE,
        readPermission: SettingsPermission.VIEW,
        updatePermission: SettingsPermission.UPDATE
    }));

    const service = new SettingsService({
        registry,
        ownerReaders: {}
    });

    assert.throws(
        () => service.getSetting(
            createActor([SettingsPermission.VIEW]),
            "tickets.sample"
        ),
        /Unsupported setting owner/
    );
});

test("secret definitions never expose their values", () => {
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

    let readCount = 0;
    const service = new SettingsService({
        registry,
        ownerReaders: {
            Example: {
                get() {
                    readCount += 1;
                    return "never-return-this";
                }
            }
        }
    });
    const actor = createActor([SettingsPermission.ADMINISTRATE]);

    assert.deepEqual(service.listSettings(actor), []);
    assert.equal(readCount, 0);
    assert.throws(
        () => service.getSetting(actor, "example.secret"),
        /cannot be read/
    );
    assert.equal(readCount, 1);
});

test("validates the service and Economy reader boundaries", () => {
    assert.throws(
        () => new SettingsService(),
        /valid registry/
    );
    assert.throws(
        () => new SettingsService({
            registry: new SettingRegistry()
        }),
        /owner readers/
    );
    assert.throws(
        () => new EconomySettingsReader({ name: "Tickets" }),
        /requires the Economy Module/
    );
});
