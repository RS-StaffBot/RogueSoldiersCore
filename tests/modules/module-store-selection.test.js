const { test } = require("node:test");
const assert = require("node:assert/strict");

const SettingsStore = require(
    "../../src/core/settings/persistence/SettingsStore"
);
const ModuleLoader = require(
    "../../src/modules/core/ModuleLoader"
);
const EconomyModule = require(
    "../../src/modules/economy/EconomyModule"
);
const InMemoryEconomyStore = require(
    "../../src/modules/economy/persistence/" +
    "InMemoryEconomyStore"
);
const SqliteEconomyStore = require(
    "../../src/modules/economy/persistence/" +
    "SqliteEconomyStore"
);
const ModerationModule = require(
    "../../src/modules/moderation/ModerationModule"
);
const InMemoryModerationStore = require(
    "../../src/modules/moderation/persistence/" +
    "InMemoryModerationStore"
);
const SqliteModerationStore = require(
    "../../src/modules/moderation/persistence/" +
    "SqliteModerationStore"
);
const TicketModule = require(
    "../../src/modules/tickets/TicketModule"
);
const InMemoryTicketStore = require(
    "../../src/modules/tickets/persistence/" +
    "InMemoryTicketStore"
);
const SqliteTicketStore = require(
    "../../src/modules/tickets/persistence/" +
    "SqliteTicketStore"
);

test("direct Module construction selects in-memory stores", () => {

    const economy = new EconomyModule();
    const moderation = new ModerationModule();
    const tickets = new TicketModule();

    assert.strictEqual(
        economy.store instanceof InMemoryEconomyStore,
        true
    );
    assert.strictEqual(
        moderation.store instanceof
            InMemoryModerationStore,
        true
    );
    assert.strictEqual(
        tickets.store instanceof InMemoryTicketStore,
        true
    );

});

test("ModuleLoader injects the requested SQLite store types", () => {

    const createdStores = [];
    const database = {
        createStore(StoreClass) {

            const store = StoreClass === SettingsStore
                ? { list: () => [] }
                : Object.create(StoreClass.prototype);

            createdStores.push({
                StoreClass,
                store
            });

            return store;

        }
    };

    const modules = ModuleLoader.load({
        database
    });

    assert.deepStrictEqual(
        createdStores.map(entry => entry.StoreClass),
        [
            SettingsStore,
            SqliteEconomyStore,
            SqliteModerationStore,
            SqliteTicketStore
        ]
    );
    assert.deepStrictEqual(
        modules.map(module => module.store),
        createdStores.slice(1).map(entry => entry.store)
    );
    assert.strictEqual(
        modules[0].store instanceof SqliteEconomyStore,
        true
    );
    assert.strictEqual(
        modules[1].store instanceof
            SqliteModerationStore,
        true
    );
    assert.strictEqual(
        modules[2].store instanceof SqliteTicketStore,
        true
    );

});
