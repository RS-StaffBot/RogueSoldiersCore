const {
    after,
    beforeEach,
    test
} = require("node:test");
const assert = require("node:assert/strict");

const ProviderManager = require(
    "../../src/providers/core/ProviderManager"
);

beforeEach(() => {
    ProviderManager.providers.clear();
});

after(() => {
    ProviderManager.providers.clear();
});

function createProvider(name, lifecycleEvents = []) {

    return {
        name,
        initialize() {
            lifecycleEvents.push(`${name}:initialize`);
        },
        start() {
            lifecycleEvents.push(`${name}:start`);
        },
        stop() {
            lifecycleEvents.push(`${name}:stop`);
        }
    };

}

test("registers, retrieves, and lists Providers", () => {

    const firstProvider = createProvider("First");
    const secondProvider = createProvider("Second");

    ProviderManager.register(firstProvider);
    ProviderManager.register(secondProvider);

    assert.strictEqual(
        ProviderManager.get("First"),
        firstProvider
    );
    assert.strictEqual(
        ProviderManager.get("Second"),
        secondProvider
    );
    assert.deepStrictEqual(
        ProviderManager.list(),
        ["First", "Second"]
    );

});

test("invokes Provider lifecycle methods in dependency order", async () => {

    const lifecycleEvents = [];

    ProviderManager.register(
        createProvider("First", lifecycleEvents)
    );
    ProviderManager.register(
        createProvider("Second", lifecycleEvents)
    );

    await ProviderManager.initializeAll();
    await ProviderManager.startAll();
    await ProviderManager.stopAll();

    assert.deepStrictEqual(
        lifecycleEvents,
        [
            "First:initialize",
            "Second:initialize",
            "First:start",
            "Second:start",
            "Second:stop",
            "First:stop"
        ]
    );

});

test("attempts every Provider during reverse shutdown", async () => {

    const lifecycleEvents = [];
    const firstProvider = createProvider(
        "First",
        lifecycleEvents
    );
    const secondProvider = createProvider(
        "Second",
        lifecycleEvents
    );

    secondProvider.stop = async () => {
        lifecycleEvents.push("Second:stop");
        throw new Error("Second failed to stop.");
    };

    ProviderManager.register(firstProvider);
    ProviderManager.register(secondProvider);

    await assert.rejects(
        ProviderManager.stopAll(),
        {
            message: "One or more Providers failed to stop."
        }
    );
    assert.deepStrictEqual(
        lifecycleEvents,
        [
            "Second:stop",
            "First:stop"
        ]
    );

});

test("currently replaces a Provider registered with a duplicate name", () => {

    const originalProvider = createProvider("Duplicate");
    const replacementProvider = createProvider("Duplicate");

    ProviderManager.register(originalProvider);
    ProviderManager.register(replacementProvider);

    assert.strictEqual(
        ProviderManager.get("Duplicate"),
        replacementProvider
    );
    assert.notStrictEqual(
        ProviderManager.get("Duplicate"),
        originalProvider
    );
    assert.deepStrictEqual(
        ProviderManager.list(),
        ["Duplicate"]
    );

});
