const test = require("node:test");
const assert = require("node:assert/strict");

const SettingRegistry = require(
    "../../../src/core/settings/SettingRegistry"
);
const LiveSettingsService = require(
    "../../../src/core/settings/LiveSettingsService"
);
const EconomyModule = require(
    "../../../src/modules/economy/EconomyModule"
);
const EconomySettingDefinitions = require(
    "../../../src/modules/economy/EconomySettingDefinitions"
);
const EconomySettingsApplicator = require(
    "../../../src/modules/economy/EconomySettingsApplicator"
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

function cloneRecord(record) {
    return record ? Object.freeze({ ...record }) : null;
}

function createContext() {
    const registry = new SettingRegistry();

    for (const definition of EconomySettingDefinitions) {
        registry.register(definition);
    }

    const economy = new EconomyModule();
    const records = new Map();
    const history = [];
    const store = {
        get(key) {
            return cloneRecord(records.get(key));
        },
        save(record) {
            const snapshot = cloneRecord(record);
            records.set(record.settingKey, snapshot);
            return snapshot;
        },
        delete(key) {
            return records.delete(key);
        }
    };
    const auditStore = {
        failAfterOperation: false,
        runTransaction(operation) {
            const recordSnapshot = new Map(records);
            const historyLength = history.length;

            try {
                const result = operation();

                if (this.failAfterOperation) {
                    throw new Error("simulated commit failure");
                }

                return result;
            } catch (error) {
                records.clear();
                for (const [key, value] of recordSnapshot) {
                    records.set(key, value);
                }
                history.length = historyLength;
                throw error;
            }
        },
        record(record) {
            history.push(Object.freeze({ ...record }));
        }
    };
    const reader = new EconomySettingsReader(economy);
    const applicator = new EconomySettingsApplicator(economy);
    const service = new LiveSettingsService({
        registry,
        ownerReaders: { Economy: reader },
        ownerValidators: {
            Economy: new EconomySettingsValidator(economy)
        },
        ownerApplicators: { Economy: applicator },
        store,
        auditStore,
        now: () => new Date("2026-07-27T23:30:00.000Z")
    });
    const actor = {
        actorId: "admin-1",
        permissions: [SettingsPermission.UPDATE, SettingsPermission.VIEW]
    };

    return {
        economy,
        records,
        history,
        store,
        auditStore,
        service,
        actor
    };
}

test("applies all six Economy settings immediately", () => {
    const context = createContext();
    const updates = [
        ["economy.startingBalance", 500],
        ["economy.dailyReward", 250],
        ["economy.dailyCooldownMilliseconds", 3600000],
        ["economy.leaderboardLimit", 20],
        ["economy.transactionPageLimit", 40],
        ["economy.transferPolicy", "EVERYONE"]
    ];

    for (const [key, value] of updates) {
        const result = context.service.updateSetting(
            context.actor,
            key,
            value
        );

        assert.equal(result.activeValue, value);
        assert.equal(
            context.service.getSetting(context.actor, key).value,
            value
        );
        assert.equal(context.store.get(key).value, value);
        assert.equal(Object.isFrozen(result), true);
    }

    assert.equal(context.history.length, 6);
    assert.equal(context.economy.startingBalance, 500);
    assert.equal(context.economy.dailyRewardAmount, 250);
    assert.equal(context.economy.dailyCooldownMs, 3600000);
    assert.equal(context.economy.defaultLeaderboardLimit, 20);
    assert.equal(context.economy.defaultTransactionPageSize, 40);
    assert.equal(context.economy.transferPolicy, "EVERYONE");
});

test("resets an active override to the Economy default immediately", () => {
    const context = createContext();

    context.service.updateSetting(
        context.actor,
        "economy.dailyReward",
        250
    );

    const result = context.service.resetSetting(
        context.actor,
        "economy.dailyReward"
    );

    assert.deepEqual(result, {
        key: "economy.dailyReward",
        reset: true,
        activeValue: 100
    });
    assert.equal(context.economy.dailyRewardAmount, 100);
    assert.equal(context.store.get("economy.dailyReward"), null);
    assert.equal(context.history.at(-1).action, "RESET");
});

test("keeps no-op resets free of runtime and audit changes", () => {
    const context = createContext();

    const result = context.service.resetSetting(
        context.actor,
        "economy.dailyReward"
    );

    assert.equal(result.reset, false);
    assert.equal(result.activeValue, 100);
    assert.equal(context.economy.dailyRewardAmount, 100);
    assert.equal(context.history.length, 0);
});

test("leaves all state unchanged after validation failure", () => {
    const context = createContext();

    assert.throws(
        () => context.service.updateSetting(
            context.actor,
            "economy.dailyReward",
            0
        ),
        /positive safe integer/
    );

    assert.equal(context.economy.dailyRewardAmount, 100);
    assert.equal(context.records.size, 0);
    assert.equal(context.history.length, 0);
});

test("restores runtime and persisted state after commit failure", () => {
    const context = createContext();

    context.service.updateSetting(
        context.actor,
        "economy.dailyReward",
        200
    );
    context.auditStore.failAfterOperation = true;

    assert.throws(
        () => context.service.updateSetting(
            context.actor,
            "economy.dailyReward",
            300
        ),
        /simulated commit failure/
    );

    assert.equal(context.economy.dailyRewardAmount, 200);
    assert.equal(context.store.get("economy.dailyReward").value, 200);
    assert.equal(context.history.length, 1);
});

test("does not rewrite existing balances when starting balance changes", () => {
    const context = createContext();

    context.economy.createAccount("member-1");
    context.economy.credit("member-1", 75, "test");

    context.service.updateSetting(
        context.actor,
        "economy.startingBalance",
        500
    );

    assert.equal(context.economy.getBalance("member-1"), 75);
    context.economy.createAccount("member-2");
    assert.equal(context.economy.getBalance("member-2"), 500);
});
