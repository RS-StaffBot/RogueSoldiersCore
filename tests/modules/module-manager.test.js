const {
    after,
    beforeEach,
    test
} = require("node:test");
const assert = require("node:assert/strict");

const ModuleManager = require(
    "../../src/modules/core/ModuleManager"
);

beforeEach(() => {
    ModuleManager.modules.clear();
});

after(() => {
    ModuleManager.modules.clear();
});

function createModule(name, lifecycleEvents = []) {

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

test("registers, retrieves, and lists Modules", () => {

    const firstModule = createModule("First");
    const secondModule = createModule("Second");

    ModuleManager.register(firstModule);
    ModuleManager.register(secondModule);

    assert.strictEqual(
        ModuleManager.get("First"),
        firstModule
    );
    assert.strictEqual(
        ModuleManager.get("Second"),
        secondModule
    );
    assert.deepStrictEqual(
        ModuleManager.list(),
        ["First", "Second"]
    );

});

test("invokes Module lifecycle methods in dependency order", async () => {

    const lifecycleEvents = [];

    ModuleManager.register(
        createModule("First", lifecycleEvents)
    );
    ModuleManager.register(
        createModule("Second", lifecycleEvents)
    );

    await ModuleManager.initializeAll();
    await ModuleManager.startAll();
    await ModuleManager.stopAll();

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

test("attempts every Module during reverse shutdown", async () => {

    const lifecycleEvents = [];
    const firstModule = createModule(
        "First",
        lifecycleEvents
    );
    const secondModule = createModule(
        "Second",
        lifecycleEvents
    );

    secondModule.stop = async () => {
        lifecycleEvents.push("Second:stop");
        throw new Error("Second failed to stop.");
    };

    ModuleManager.register(firstModule);
    ModuleManager.register(secondModule);

    await assert.rejects(
        ModuleManager.stopAll(),
        {
            message: "One or more Modules failed to stop."
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

test("rejects a duplicate Module without changing registration", () => {

    const firstModule = createModule("First");
    const originalModule = createModule("Duplicate");
    const replacementModule = createModule("Duplicate");
    const lastModule = createModule("Last");

    ModuleManager.register(firstModule);
    ModuleManager.register(originalModule);
    ModuleManager.register(lastModule);

    assert.throws(
        () => ModuleManager.register(replacementModule),
        {
            message:
                "Module 'Duplicate' is already registered."
        }
    );
    assert.strictEqual(
        ModuleManager.get("Duplicate"),
        originalModule
    );
    assert.deepStrictEqual(
        ModuleManager.list(),
        ["First", "Duplicate", "Last"]
    );
    assert.strictEqual(ModuleManager.modules.size, 3);

});
