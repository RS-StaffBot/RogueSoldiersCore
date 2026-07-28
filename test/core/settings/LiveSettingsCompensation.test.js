const test = require("node:test");
const assert = require("node:assert/strict");

const LiveSettingsService = require(
    "../../../src/core/settings/LiveSettingsService"
);

const DEFINITION = Object.freeze({
    key: "economy.dailyReward",
    owner: "Economy",
    valueType: "INTEGER",
    changeMode: "LIVE",
    readPermission: "settings.view",
    updatePermission: "settings.update",
    secret: false
});

function createContext({ storedValue = null } = {}) {
    const records = new Map();
    const history = [];

    if (storedValue !== null) {
        records.set(DEFINITION.key, Object.freeze({
            settingKey: DEFINITION.key,
            valueType: DEFINITION.valueType,
            value: storedValue,
            updatedAt: "2026-07-28T00:00:00.000Z",
            updatedBy: "admin-1"
        }));
    }

    const store = {
        get(key) {
            return records.get(key) ?? null;
        },
        save(record) {
            const snapshot = Object.freeze({ ...record });
            records.set(record.settingKey, snapshot);
            return snapshot;
        },
        delete(key) {
            return records.delete(key);
        }
    };
    const auditStore = {
        runTransaction(operation) {
            const recordSnapshot = new Map(records);
            const historyLength = history.length;

            try {
                return operation();
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
    let runtimeValue = storedValue ?? 100;
    let restoreCalls = 0;
    const applicator = {
        get() {
            return runtimeValue;
        },
        getDefault() {
            return 100;
        },
        apply(key, value) {
            runtimeValue = value;
            throw new Error("simulated partial runtime failure");
        },
        restore(key, value) {
            restoreCalls += 1;
            runtimeValue = value;
        }
    };
    const service = new LiveSettingsService({
        registry: {
            get: () => DEFINITION,
            list: () => Object.freeze([DEFINITION])
        },
        ownerReaders: {
            Economy: {
                get: () => runtimeValue
            }
        },
        ownerValidators: {
            Economy: {
                validate(key, value) {
                    if (!Number.isSafeInteger(value) || value <= 0) {
                        throw new Error("invalid Economy value");
                    }
                }
            }
        },
        ownerApplicators: {
            Economy: applicator
        },
        store,
        auditStore,
        now: () => new Date("2026-07-28T00:30:00.000Z")
    });
    const actor = {
        actorId: "admin-1",
        permissions: ["settings.update", "settings.view"]
    };

    return {
        service,
        actor,
        records,
        history,
        getRuntimeValue: () => runtimeValue,
        getRestoreCalls: () => restoreCalls
    };
}

test("restores runtime when an update applicator mutates then throws", () => {
    const context = createContext();

    assert.throws(
        () => context.service.updateSetting(
            context.actor,
            DEFINITION.key,
            250
        ),
        /simulated partial runtime failure/
    );

    assert.equal(context.getRuntimeValue(), 100);
    assert.equal(context.getRestoreCalls(), 1);
    assert.equal(context.records.size, 0);
    assert.equal(context.history.length, 0);
});

test("restores runtime when a reset applicator mutates then throws", () => {
    const context = createContext({ storedValue: 250 });

    assert.throws(
        () => context.service.resetSetting(
            context.actor,
            DEFINITION.key
        ),
        /simulated partial runtime failure/
    );

    assert.equal(context.getRuntimeValue(), 250);
    assert.equal(context.getRestoreCalls(), 1);
    assert.equal(context.records.get(DEFINITION.key).value, 250);
    assert.equal(context.history.length, 0);
});
