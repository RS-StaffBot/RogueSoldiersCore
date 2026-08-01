const { test } = require("node:test");
const assert = require("node:assert/strict");

const SettingsStore = require(
    "../../src/core/settings/persistence/SettingsStore"
);
const AuditModule = require(
    "../../src/modules/audit/AuditModule"
);
const InMemoryAuditStore = require(
    "../../src/modules/audit/persistence/InMemoryAuditStore"
);
const SqliteAuditStore = require(
    "../../src/modules/audit/persistence/SqliteAuditStore"
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
const IdentityModule = require(
    "../../src/modules/identity/IdentityModule"
);
const InMemoryIdentityStore = require(
    "../../src/modules/identity/persistence/" +
    "InMemoryIdentityStore"
);
const SqliteIdentityStore = require(
    "../../src/modules/identity/persistence/" +
    "SqliteIdentityStore"
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

    const audit = new AuditModule();
    const economy = new EconomyModule();
    const identity = new IdentityModule();
    const moderation = new ModerationModule();
    const tickets = new TicketModule();

    assert.strictEqual(
        audit.store instanceof InMemoryAuditStore,
        true
    );
    assert.strictEqual(
        economy.store instanceof InMemoryEconomyStore,
        true
    );
    assert.strictEqual(
        identity.store instanceof InMemoryIdentityStore,
        true
    );
    assert.strictEqual(
        moderation.store instanceof InMemoryModerationStore,
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

    const modules = ModuleLoader.load({ database });

    assert.deepStrictEqual(
        createdStores.map(entry => entry.StoreClass),
        [
            SettingsStore,
            SqliteAuditStore,
            SqliteEconomyStore,
            SqliteIdentityStore,
            SqliteModerationStore,
            SqliteTicketStore
        ]
    );
    assert.deepStrictEqual(
        modules.map(module => module.store),
        createdStores.slice(1).map(entry => entry.store)
    );
    assert.strictEqual(
        modules[0].store instanceof SqliteAuditStore,
        true
    );
    assert.strictEqual(
        modules[1].store instanceof SqliteEconomyStore,
        true
    );
    assert.strictEqual(
        modules[2].store instanceof SqliteIdentityStore,
        true
    );
    assert.strictEqual(
        modules[3].store instanceof SqliteModerationStore,
        true
    );
    assert.strictEqual(
        modules[4].store instanceof SqliteTicketStore,
        true
    );

});
