const assert = require("node:assert/strict");
const test = require("node:test");

const ComponentState = require(
    "../../src/core/ComponentState"
);
const ComponentLifecycleOperationLock = require(
    "../../src/core/lifecycle/ComponentLifecycleOperationLock"
);
const ProviderLoader = require(
    "../../src/providers/core/ProviderLoader"
);
const ProviderManager = require(
    "../../src/providers/core/ProviderManager"
);

function createProvider({
    failInitialize = false,
    failStart = false,
    failStop = false,
    name = "7 Days to Die"
} = {}) {
    return {
        name,
        state: ComponentState.CREATED,
        initialize() {
            this.state = ComponentState.INITIALIZING;
            if (failInitialize) {
                throw new Error("private initialize detail");
            }
            this.state = ComponentState.READY;
        },
        start() {
            this.state = ComponentState.STARTING;
            if (failStart) {
                throw new Error("private start detail");
            }
            this.state = ComponentState.RUNNING;
        },
        stop() {
            this.state = ComponentState.STOPPING;
            if (failStop) {
                throw new Error("private stop detail");
            }
            this.state = ComponentState.STOPPED;
        },
        setError() {
            this.state = ComponentState.ERROR;
        }
    };
}

async function registerRunning(provider) {
    ProviderManager.providers.clear();
    ProviderManager.register(provider);
    await ProviderManager.initializeAll();
    await ProviderManager.startAll();
}

test("atomically replaces a running initialized Provider", async () => {
    const current = createProvider();
    const candidate = createProvider();
    await registerRunning(current);

    const result = await ProviderManager.replaceProvider(
        current.name,
        () => candidate
    );

    assert.deepEqual(result, {
        componentType: "PROVIDER",
        name: "7 Days to Die",
        operation: "REPLACE",
        outcome: "SUCCEEDED",
        state: ComponentState.RUNNING,
        succeeded: true
    });
    assert.equal(Object.isFrozen(result), true);
    assert.equal(current.state, ComponentState.STOPPED);
    assert.equal(candidate.state, ComponentState.RUNNING);
    assert.equal(ProviderManager.get(current.name), candidate);
    assert.equal(
        ProviderManager.getProviderStatus(current.name).initialized,
        true
    );

    ProviderManager.providers.clear();
});

test("replaces an initialized Provider from runtime error", async () => {
    const current = createProvider();
    const candidate = createProvider();
    await registerRunning(current);
    current.setError();

    const result = await ProviderManager.replaceProvider(
        current.name,
        () => candidate
    );

    assert.deepEqual(result, {
        componentType: "PROVIDER",
        name: "7 Days to Die",
        operation: "REPLACE",
        outcome: "SUCCEEDED",
        state: ComponentState.RUNNING,
        succeeded: true
    });
    assert.equal(current.state, ComponentState.STOPPED);
    assert.equal(candidate.state, ComponentState.RUNNING);
    assert.equal(ProviderManager.get(current.name), candidate);
    assert.deepEqual(
        ProviderManager.getProviderStatus(current.name),
        {
            componentType: "PROVIDER",
            initialized: true,
            name: "7 Days to Die",
            operational: true,
            state: ComponentState.RUNNING,
            supportedActions: ["STOP", "RESTART", "REPLACE"]
        }
    );

    ProviderManager.providers.clear();
});

test("retains the old Provider when candidate startup fails", async () => {
    const current = createProvider();
    const candidate = createProvider({ failStart: true });
    await registerRunning(current);

    const result = await ProviderManager.replaceProvider(
        current.name,
        () => candidate
    );

    assert.equal(result.outcome, "FAILED");
    assert.equal(result.succeeded, false);
    assert.equal(result.state, ComponentState.RUNNING);
    assert.equal(ProviderManager.get(current.name), current);
    assert.equal(current.state, ComponentState.RUNNING);
    assert.equal(candidate.state, ComponentState.STOPPED);
    assert.equal(
        JSON.stringify(result).includes("private start detail"),
        false
    );

    ProviderManager.providers.clear();
});

test("rejects invalid candidates without replacing the old Provider", async () => {
    const current = createProvider();
    await registerRunning(current);

    const results = [];
    results.push(await ProviderManager.replaceProvider(
        current.name,
        () => null
    ));
    results.push(await ProviderManager.replaceProvider(
        current.name,
        () => createProvider({ name: "Discord" })
    ));

    assert.ok(results.every(result => result.outcome === "FAILED"));
    assert.equal(ProviderManager.get(current.name), current);
    assert.equal(current.state, ComponentState.RUNNING);

    ProviderManager.providers.clear();
});

test("does not swap when the old Provider cannot stop", async () => {
    const current = createProvider({ failStop: true });
    const candidate = createProvider();
    await registerRunning(current);

    const result = await ProviderManager.replaceProvider(
        current.name,
        () => candidate
    );

    assert.equal(result.outcome, "FAILED");
    assert.equal(ProviderManager.get(current.name), current);
    assert.equal(candidate.state, ComponentState.STOPPED);
    assert.equal(current.state, ComponentState.STOPPING);

    ProviderManager.providers.clear();
});

test("returns a sanitized result for unknown Provider names", async () => {
    ProviderManager.providers.clear();

    const result = await ProviderManager.replaceProvider(
        "private-controlled-name",
        () => createProvider()
    );

    assert.deepEqual(result, {
        componentType: "PROVIDER",
        name: null,
        operation: "REPLACE",
        outcome: "NOT_FOUND",
        state: null,
        succeeded: false
    });
});

test("rejects replacement while another lifecycle mutation owns the lock", async () => {
    const current = createProvider();
    await registerRunning(current);

    let release;
    const held = ComponentLifecycleOperationLock.run(
        () => new Promise(resolve => {
            release = resolve;
        })
    );

    await new Promise(resolve => setImmediate(resolve));

    const result = await ProviderManager.replaceProvider(
        current.name,
        () => createProvider()
    );

    assert.equal(result.outcome, "BUSY");
    assert.equal(ProviderManager.get(current.name), current);

    release();
    await held;
    ProviderManager.providers.clear();
});

test("ProviderLoader reconstruction is fixed to 7 Days to Die", () => {
    assert.equal(ProviderLoader.canReconstruct("7 Days to Die"), true);
    assert.equal(ProviderLoader.canReconstruct("Discord"), false);
    assert.equal(ProviderLoader.canReconstruct("../private/module"), false);
    assert.equal(
        ProviderLoader.createProvider("Discord", {}),
        null
    );
});

test("reloads trusted configuration before constructing a candidate", () => {
    const calls = [];
    const configuration = {
        load() {
            calls.push("load");
        },
        get(path) {
            calls.push(path);
            return {
                connectionTimeoutMs: 1000,
                enabled: true,
                host: "localhost",
                port: 8081
            };
        }
    };
    const client = {
        connect() {},
        disconnect() {}
    };

    const candidate = ProviderLoader.createProvider(
        "7 Days to Die",
        {
            configuration,
            createSevenDaysToDieClient: () => client,
            environment: {
                SEVEN_DAYS_TO_DIE_TELNET_PASSWORD: "secret"
            },
            reloadConfiguration: true
        }
    );

    assert.deepEqual(calls, [
        "load",
        "providers.sevendaystodie"
    ]);
    assert.equal(candidate.name, "7 Days to Die");
    assert.equal(candidate.state, ComponentState.CREATED);
});
