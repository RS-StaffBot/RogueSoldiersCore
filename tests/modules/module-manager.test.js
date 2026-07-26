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

test("currently replaces a Module registered with a duplicate name", () => {

    const originalModule = createModule("Duplicate");
    const replacementModule = createModule("Duplicate");

    ModuleManager.register(originalModule);
    ModuleManager.register(replacementModule);

    assert.strictEqual(
        ModuleManager.get("Duplicate"),
        replacementModule
    );
    assert.notStrictEqual(
        ModuleManager.get("Duplicate"),
        originalModule
    );
    assert.deepStrictEqual(
        ModuleManager.list(),
        ["Duplicate"]
    );

});
