const assert = require("node:assert/strict");
const { test } = require("node:test");

const ComponentState = require(
    "../../../src/core/ComponentState"
);
const SevenDaysToDieProvider = require(
    "../../../src/providers/sevendaystodie/" +
    "SevenDaysToDieProvider"
);
const SevenDaysToDieReconnectPolicy = require(
    "../../../src/providers/sevendaystodie/" +
    "SevenDaysToDieReconnectPolicy"
);

function createConfiguration(overrides = {}) {
    return {
        connectionTimeoutMs: 1000,
        enabled: true,
        host: "127.0.0.1",
        port: 8081,
        ...overrides
    };
}

function createProvider({ client, reconnectPolicy }) {
    return new SevenDaysToDieProvider({
        client,
        commandService: {
            executeCommand: async () => Object.freeze({}),
            isCommandActive: () => false
        },
        configuration: createConfiguration(),
        environment: {
            SEVEN_DAYS_TO_DIE_TELNET_PASSWORD: "private-test-value"
        },
        identityProofCollector: {
            collect: async () => Object.freeze([]),
            isCollecting: () => false
        },
        reconnectPolicy
    });
}

test("reconnect policy recovers within its bounded attempt limit", async () => {
    const policy = new SevenDaysToDieReconnectPolicy({
        delayMs: 100,
        enabled: true,
        maximumAttempts: 3,
        wait: async () => {}
    });
    let attempts = 0;

    const result = await policy.run(async () => {
        attempts += 1;
        if (attempts < 3) {
            throw new Error("private socket detail");
        }
    });

    assert.deepStrictEqual(result, {
        attempts: 3,
        outcome: "RECOVERED",
        recovered: true
    });
    assert.strictEqual(Object.isFrozen(result), true);
    assert.strictEqual(policy.isActive(), false);
    assert.strictEqual(
        JSON.stringify(result).includes("private socket detail"),
        false
    );
});

test("reconnect policy stops after exhaustion", async () => {
    const policy = new SevenDaysToDieReconnectPolicy({
        delayMs: 100,
        enabled: true,
        maximumAttempts: 2,
        wait: async () => {}
    });

    const result = await policy.run(async () => {
        throw new Error("private connection failure");
    });

    assert.deepStrictEqual(result, {
        attempts: 2,
        outcome: "EXHAUSTED",
        recovered: false
    });
});

test("reconnect policy supports cancellation", async () => {
    let policy;
    policy = new SevenDaysToDieReconnectPolicy({
        delayMs: 100,
        enabled: true,
        maximumAttempts: 3,
        wait: async () => policy.cancel()
    });

    const result = await policy.run(async () => {});

    assert.deepStrictEqual(result, {
        attempts: 0,
        outcome: "CANCELLED",
        recovered: false
    });
});

test("disabled reconnect policy performs no connection attempt", async () => {
    const policy = new SevenDaysToDieReconnectPolicy({
        delayMs: 0,
        enabled: false,
        maximumAttempts: 0
    });
    let attempted = false;

    const result = await policy.run(async () => {
        attempted = true;
    });

    assert.strictEqual(attempted, false);
    assert.deepStrictEqual(result, {
        attempts: 0,
        outcome: "DISABLED",
        recovered: false
    });
});

test("rejects invalid enabled reconnect policy values", () => {
    assert.throws(() => new SevenDaysToDieReconnectPolicy({
        delayMs: 99,
        enabled: true,
        maximumAttempts: 3
    }));
    assert.throws(() => new SevenDaysToDieReconnectPolicy({
        delayMs: 100,
        enabled: true,
        maximumAttempts: 11
    }));
});

test("initial startup connection failure does not trigger reconnect", async () => {
    let callback;
    let reconnectRuns = 0;
    const reconnectPolicy = {
        enabled: true,
        cancel: () => {},
        isActive: () => false,
        run: async () => {
            reconnectRuns += 1;
            return Object.freeze({
                attempts: 1,
                outcome: "RECOVERED",
                recovered: true
            });
        }
    };
    const provider = createProvider({
        client: {
            connect: async (options, onLoss) => {
                callback = onLoss;
                callback(new Error("startup unavailable"));
            },
            disconnect: async () => {}
        },
        reconnectPolicy
    });

    provider.initialize();
    await assert.rejects(() => provider.start());

    assert.strictEqual(provider.state, ComponentState.ERROR);
    assert.strictEqual(reconnectRuns, 0);
});

test("runtime connection loss recovers the Provider", async () => {
    let connectionLoss;
    let connectCalls = 0;
    const client = {
        connect: async (options, onLoss) => {
            connectCalls += 1;
            connectionLoss = onLoss;
            if (connectCalls === 2) {
                throw new Error("temporary private failure");
            }
        },
        disconnect: async () => {}
    };
    const reconnectPolicy = new SevenDaysToDieReconnectPolicy({
        delayMs: 100,
        enabled: true,
        maximumAttempts: 2,
        wait: async () => {}
    });
    const provider = createProvider({ client, reconnectPolicy });

    provider.initialize();
    await provider.start();
    connectionLoss(new Error("private socket detail"));
    const result = await provider.reconnectTask;

    assert.strictEqual(result.recovered, true);
    assert.strictEqual(result.attempts, 2);
    assert.strictEqual(connectCalls, 3);
    assert.strictEqual(provider.state, ComponentState.RUNNING);
});

test("exhausted runtime reconnect leaves Provider in ERROR", async () => {
    let connectionLoss;
    let connectCalls = 0;
    const client = {
        connect: async (options, onLoss) => {
            connectCalls += 1;
            connectionLoss = onLoss;
            if (connectCalls > 1) {
                throw new Error("private persistent failure");
            }
        },
        disconnect: async () => {}
    };
    const reconnectPolicy = new SevenDaysToDieReconnectPolicy({
        delayMs: 100,
        enabled: true,
        maximumAttempts: 2,
        wait: async () => {}
    });
    const provider = createProvider({ client, reconnectPolicy });

    provider.initialize();
    await provider.start();
    connectionLoss(new Error("private socket detail"));
    const result = await provider.reconnectTask;

    assert.deepStrictEqual(result, {
        attempts: 2,
        outcome: "EXHAUSTED",
        recovered: false
    });
    assert.strictEqual(connectCalls, 3);
    assert.strictEqual(provider.state, ComponentState.ERROR);
    assert.strictEqual(
        JSON.stringify(result).includes("private persistent failure"),
        false
    );
});
