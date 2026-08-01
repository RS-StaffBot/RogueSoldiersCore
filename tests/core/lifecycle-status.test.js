const { test } = require("node:test");
const assert = require("node:assert/strict");

const ComponentState = require(
    "../../src/core/ComponentState"
);
const ProviderManager = require(
    "../../src/providers/core/ProviderManager"
);
const ModuleManager = require(
    "../../src/modules/core/ModuleManager"
);

function createComponent(name) {
    return {
        name,
        state: ComponentState.CREATED,
        initialize() {
            this.state = ComponentState.READY;
        },
        start() {
            this.state = ComponentState.RUNNING;
        },
        stop() {
            this.state = ComponentState.STOPPED;
        },
        setError() {
            this.state = ComponentState.ERROR;
        }
    };
}

test("Provider lifecycle status is immutable and deterministic", async () => {

    ProviderManager.providers.clear();

    const discord = createComponent("Discord");
    const game = createComponent("7 Days to Die");
    ProviderManager.register(discord);
    ProviderManager.register(game);

    await ProviderManager.initializeAll();
    await ProviderManager.startAll();
    game.setError();

    const statuses = ProviderManager.listProviderStatuses();

    assert.ok(Object.isFrozen(statuses));
    assert.strictEqual(statuses.length, 2);
    assert.ok(statuses.every(Object.isFrozen));
    assert.deepStrictEqual(statuses, [
        {
            componentType: "PROVIDER",
            initialized: true,
            name: "Discord",
            operational: true,
            state: ComponentState.RUNNING
        },
        {
            componentType: "PROVIDER",
            initialized: true,
            name: "7 Days to Die",
            operational: false,
            state: ComponentState.ERROR
        }
    ]);
    assert.deepStrictEqual(
        Object.keys(statuses[0]).sort(),
        [
            "componentType",
            "initialized",
            "name",
            "operational",
            "state"
        ]
    );

    const secondRead = ProviderManager.listProviderStatuses();
    assert.notStrictEqual(secondRead, statuses);
    assert.notStrictEqual(secondRead[0], statuses[0]);
    assert.deepStrictEqual(secondRead, statuses);

    ProviderManager.providers.clear();

});

test("Provider lifecycle status returns null for an unknown name", () => {

    ProviderManager.providers.clear();

    assert.strictEqual(
        ProviderManager.getProviderStatus("Missing Provider"),
        null
    );

});

test("Module lifecycle status tracks initialization without mutation", async () => {

    ModuleManager.modules.clear();

    const identity = createComponent("Identity");
    const economy = createComponent("Economy");
    ModuleManager.register(identity);
    ModuleManager.register(economy);

    const beforeInitialization = ModuleManager.getModuleStatus("Identity");
    assert.deepStrictEqual(beforeInitialization, {
        componentType: "MODULE",
        initialized: false,
        name: "Identity",
        operational: false,
        state: ComponentState.CREATED
    });

    await ModuleManager.initializeAll();
    await ModuleManager.startAll();

    const status = ModuleManager.getModuleStatus("Identity");

    assert.ok(Object.isFrozen(status));
    assert.deepStrictEqual(status, {
        componentType: "MODULE",
        initialized: true,
        name: "Identity",
        operational: true,
        state: ComponentState.RUNNING
    });
    assert.strictEqual(identity.state, ComponentState.RUNNING);
    assert.strictEqual(ModuleManager.get("Identity"), identity);
    assert.strictEqual(
        ModuleManager.getModuleStatus("Missing Module"),
        null
    );

    const statuses = ModuleManager.listModuleStatuses();
    assert.deepStrictEqual(
        statuses.map(entry => entry.name),
        ["Identity", "Economy"]
    );

    ModuleManager.modules.clear();

});
