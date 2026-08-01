const { test } = require("node:test");
const assert = require("node:assert/strict");

const ComponentState = require(
    "../../src/core/ComponentState"
);
const Logger = require("../../src/core/Logger");
const ModuleManager = require(
    "../../src/modules/core/ModuleManager"
);
const ProviderManager = require(
    "../../src/providers/core/ProviderManager"
);

function createComponent({
    failStart = false,
    failStop = false,
    name
}) {
    return {
        name,
        state: ComponentState.CREATED,
        initialize() {
            this.state = ComponentState.READY;
        },
        start() {
            if (failStart) {
                throw new Error(
                    "private startup detail at D:\\private\\provider.js"
                );
            }
            this.state = ComponentState.RUNNING;
        },
        stop() {
            if (failStop) {
                throw new Error(
                    "private stop detail at D:\\private\\provider.js"
                );
            }
            this.state = ComponentState.STOPPED;
        },
        setError() {
            this.state = ComponentState.ERROR;
        }
    };
}

async function captureErrors(action) {
    const originalError = Logger.error;
    const messages = [];
    Logger.error = message => messages.push(String(message));

    try {
        return {
            messages,
            result: await action()
        };
    } finally {
        Logger.error = originalError;
    }
}

function assertResult(result, expected) {
    assert.deepStrictEqual(result, expected);
    assert.ok(Object.isFrozen(result));
    assert.deepStrictEqual(Object.keys(result), [
        "componentType",
        "name",
        "operation",
        "outcome",
        "state",
        "succeeded"
    ]);
}

test("ProviderManager controls one initialized Provider", async () => {
    ProviderManager.providers.clear();

    const target = createComponent({ name: "7 Days to Die" });
    const unrelated = createComponent({ name: "Discord" });
    ProviderManager.register(target);
    ProviderManager.register(unrelated);

    await ProviderManager.initializeAll();
    await ProviderManager.startAll();

    const stopped = await ProviderManager.stopProvider(
        "7 Days to Die"
    );

    assertResult(stopped, {
        componentType: "PROVIDER",
        name: "7 Days to Die",
        operation: "STOP",
        outcome: "SUCCEEDED",
        state: ComponentState.STOPPED,
        succeeded: true
    });
    assert.strictEqual(unrelated.state, ComponentState.RUNNING);

    const started = await ProviderManager.startProvider(
        "7 Days to Die"
    );

    assertResult(started, {
        componentType: "PROVIDER",
        name: "7 Days to Die",
        operation: "START",
        outcome: "SUCCEEDED",
        state: ComponentState.RUNNING,
        succeeded: true
    });
    assert.strictEqual(unrelated.state, ComponentState.RUNNING);

    ProviderManager.providers.clear();
});

test("individual lifecycle operations reject unsafe requests", async () => {
    ModuleManager.modules.clear();

    const module = createComponent({ name: "Identity" });
    ModuleManager.register(module);

    const notInitialized = await ModuleManager.startModule("Identity");
    assertResult(notInitialized, {
        componentType: "MODULE",
        name: "Identity",
        operation: "START",
        outcome: "NOT_INITIALIZED",
        state: ComponentState.CREATED,
        succeeded: false
    });

    const invalidStop = await ModuleManager.stopModule("Identity");
    assertResult(invalidStop, {
        componentType: "MODULE",
        name: "Identity",
        operation: "STOP",
        outcome: "INVALID_STATE",
        state: ComponentState.CREATED,
        succeeded: false
    });

    const unknown = await ModuleManager.startModule("Untrusted Name");
    assertResult(unknown, {
        componentType: "MODULE",
        name: null,
        operation: "START",
        outcome: "NOT_FOUND",
        state: null,
        succeeded: false
    });

    ModuleManager.modules.clear();
});

test("failed individual operations are sanitized and observable", async () => {
    ProviderManager.providers.clear();

    const failed = createComponent({
        failStart: true,
        name: "7 Days to Die"
    });
    ProviderManager.register(failed);
    await ProviderManager.initializeAll();

    const captured = await captureErrors(
        () => ProviderManager.startProvider("7 Days to Die")
    );

    assertResult(captured.result, {
        componentType: "PROVIDER",
        name: "7 Days to Die",
        operation: "START",
        outcome: "FAILED",
        state: ComponentState.ERROR,
        succeeded: false
    });
    assert.strictEqual(
        JSON.stringify(captured.result).includes("private startup detail"),
        false
    );
    assert.strictEqual(
        captured.messages.some(
            message => message.includes("private startup detail")
        ),
        false
    );
    assert.strictEqual(
        captured.messages.some(
            message => message.includes("D:\\private")
        ),
        false
    );

    ProviderManager.providers.clear();
});

test("failed stop moves only the selected Module to ERROR", async () => {
    ModuleManager.modules.clear();

    const failed = createComponent({
        failStop: true,
        name: "Identity"
    });
    const unrelated = createComponent({ name: "Economy" });
    ModuleManager.register(failed);
    ModuleManager.register(unrelated);

    await ModuleManager.initializeAll();
    await ModuleManager.startAll();

    const captured = await captureErrors(
        () => ModuleManager.stopModule("Identity")
    );

    assertResult(captured.result, {
        componentType: "MODULE",
        name: "Identity",
        operation: "STOP",
        outcome: "FAILED",
        state: ComponentState.ERROR,
        succeeded: false
    });
    assert.strictEqual(unrelated.state, ComponentState.RUNNING);
    assert.strictEqual(
        JSON.stringify(captured.messages).includes("private stop detail"),
        false
    );

    ModuleManager.modules.clear();
});
