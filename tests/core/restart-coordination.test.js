const { test } = require("node:test");
const assert = require("node:assert/strict");

const ComponentState = require("../../src/core/ComponentState");
const Logger = require("../../src/core/Logger");
const ModuleManager = require(
    "../../src/modules/core/ModuleManager"
);
const ProviderManager = require(
    "../../src/providers/core/ProviderManager"
);

function createDeferred() {
    let resolve;
    const promise = new Promise(done => {
        resolve = done;
    });
    return { promise, resolve };
}

function createComponent({
    failStart = false,
    failStop = false,
    name,
    stopGate = null,
    wrongStartState = false,
    wrongStopState = false
}) {
    return {
        name,
        state: ComponentState.CREATED,
        initialize() {
            this.state = ComponentState.READY;
        },
        async start() {
            this.state = ComponentState.STARTING;
            if (failStart) {
                throw new Error(
                    "private start failure at D:\\private\\component.js"
                );
            }
            this.state = wrongStartState
                ? ComponentState.READY
                : ComponentState.RUNNING;
        },
        async stop() {
            this.state = ComponentState.STOPPING;
            if (stopGate) {
                await stopGate.promise;
            }
            if (failStop) {
                throw new Error(
                    "private stop failure at D:\\private\\component.js"
                );
            }
            this.state = wrongStopState
                ? ComponentState.RUNNING
                : ComponentState.STOPPED;
        },
        setError() {
            this.state = ComponentState.ERROR;
        }
    };
}

function resetManagers() {
    ProviderManager.providers.clear();
    ModuleManager.modules.clear();
}

async function prepareRunning(manager, component) {
    manager.register(component);
    await manager.initializeAll();
    await manager.startAll();
}

async function captureErrors(action) {
    const original = Logger.error;
    const messages = [];
    Logger.error = message => messages.push(String(message));

    try {
        return {
            messages,
            result: await action()
        };
    } finally {
        Logger.error = original;
    }
}

test("Provider restart stops then starts one running Provider", async () => {
    resetManagers();
    const provider = createComponent({ name: "7 Days to Die" });
    await prepareRunning(ProviderManager, provider);

    const result = await ProviderManager.restartProvider(provider.name);

    assert.deepStrictEqual(result, {
        componentType: "PROVIDER",
        name: provider.name,
        operation: "RESTART",
        outcome: "SUCCEEDED",
        state: ComponentState.RUNNING,
        succeeded: true
    });
    assert.ok(Object.isFrozen(result));
    assert.strictEqual(provider.state, ComponentState.RUNNING);
    resetManagers();
});

test("Module restart rejects invalid, uninitialized, and unknown requests", async () => {
    resetManagers();
    const module = createComponent({ name: "Identity" });
    ModuleManager.register(module);

    const uninitialized = await ModuleManager.restartModule(module.name);
    assert.strictEqual(uninitialized.outcome, "NOT_INITIALIZED");

    await ModuleManager.initializeAll();
    const invalid = await ModuleManager.restartModule(module.name);
    assert.strictEqual(invalid.outcome, "INVALID_STATE");
    assert.strictEqual(invalid.state, ComponentState.READY);

    const unknown = await ModuleManager.restartModule("private-request-name");
    assert.deepStrictEqual(unknown, {
        componentType: "MODULE",
        name: null,
        operation: "RESTART",
        outcome: "NOT_FOUND",
        state: null,
        succeeded: false
    });
    assert.strictEqual(
        JSON.stringify(unknown).includes("private-request-name"),
        false
    );
    resetManagers();
});

test("restart failures become ERROR without exposing private details", async () => {
    resetManagers();
    const provider = createComponent({
        failStart: true,
        name: "Broken Provider"
    });
    ProviderManager.register(provider);
    await ProviderManager.initializeAll();
    provider.state = ComponentState.RUNNING;

    const captured = await captureErrors(
        () => ProviderManager.restartProvider(provider.name)
    );

    assert.strictEqual(captured.result.outcome, "FAILED");
    assert.strictEqual(captured.result.state, ComponentState.ERROR);
    assert.strictEqual(provider.state, ComponentState.ERROR);
    assert.ok(
        captured.messages.some(message => message.includes("failed to restart"))
    );
    assert.strictEqual(
        JSON.stringify(captured.messages).includes("private start failure"),
        false
    );
    assert.strictEqual(
        JSON.stringify(captured.messages).includes("D:\\private"),
        false
    );
    resetManagers();
});

test("restart verifies stop and start terminal states", async () => {
    resetManagers();
    const badStop = createComponent({
        name: "Bad Stop",
        wrongStopState: true
    });
    await prepareRunning(ModuleManager, badStop);

    const stopResult = await ModuleManager.restartModule(badStop.name);
    assert.strictEqual(stopResult.outcome, "FAILED");
    assert.strictEqual(stopResult.state, ComponentState.ERROR);

    resetManagers();
    const badStart = createComponent({
        name: "Bad Start",
        wrongStartState: true
    });
    ModuleManager.register(badStart);
    await ModuleManager.initializeAll();
    badStart.state = ComponentState.RUNNING;

    const startResult = await ModuleManager.restartModule(badStart.name);
    assert.strictEqual(startResult.outcome, "FAILED");
    assert.strictEqual(startResult.state, ComponentState.ERROR);
    resetManagers();
});

test("one shared lock rejects overlapping Provider and Module mutations", async () => {
    resetManagers();
    const gate = createDeferred();
    const provider = createComponent({
        name: "7 Days to Die",
        stopGate: gate
    });
    const module = createComponent({ name: "Economy" });

    await prepareRunning(ProviderManager, provider);
    await prepareRunning(ModuleManager, module);

    const restartPromise = ProviderManager.restartProvider(provider.name);
    await new Promise(resolve => setImmediate(resolve));

    const busy = await ModuleManager.stopModule(module.name);
    assert.deepStrictEqual(busy, {
        componentType: "MODULE",
        name: module.name,
        operation: "STOP",
        outcome: "BUSY",
        state: ComponentState.RUNNING,
        succeeded: false
    });
    assert.strictEqual(module.state, ComponentState.RUNNING);

    gate.resolve();
    const restarted = await restartPromise;
    assert.strictEqual(restarted.outcome, "SUCCEEDED");
    assert.strictEqual(provider.state, ComponentState.RUNNING);

    const stopped = await ModuleManager.stopModule(module.name);
    assert.strictEqual(stopped.outcome, "SUCCEEDED");
    assert.strictEqual(module.state, ComponentState.STOPPED);
    resetManagers();
});
