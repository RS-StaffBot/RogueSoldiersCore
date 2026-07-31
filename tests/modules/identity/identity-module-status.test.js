const assert = require("node:assert/strict");
const test = require("node:test");

const ComponentState = require(
    "../../../src/core/ComponentState"
);
const ModuleLoader = require(
    "../../../src/modules/core/ModuleLoader"
);
const IdentityModule = require(
    "../../../src/modules/identity/IdentityModule"
);
const IdentityLinkStatus = require(
    "../../../src/modules/identity/IdentityLinkStatus"
);
const InMemoryIdentityStore = require(
    "../../../src/modules/identity/persistence/InMemoryIdentityStore"
);

function createPendingLink(overrides = {}) {
    return {
        discordUserId: "discord-user-1",
        gameUserId: "Steam_123456789",
        status: IdentityLinkStatus.PENDING,
        createdAt: "2026-07-31T00:00:00.000Z",
        verifiedAt: null,
        revokedAt: null,
        ...overrides
    };
}

test("returns a frozen private empty status for an unlinked member", () => {
    const module = new IdentityModule();

    const status = module.getOwnStatus("discord-user-1");

    assert.deepEqual(status, {
        linked: false,
        status: null,
        createdAt: null,
        verifiedAt: null,
        revokedAt: null
    });
    assert.equal(Object.isFrozen(status), true);
    assert.equal("discordUserId" in status, false);
    assert.equal("gameUserId" in status, false);
});

test("returns only approved private status fields for an active link", () => {
    const store = new InMemoryIdentityStore();
    store.createLink(createPendingLink());
    const module = new IdentityModule({ store });

    const status = module.getOwnStatus("discord-user-1");

    assert.deepEqual(status, {
        linked: true,
        status: IdentityLinkStatus.PENDING,
        createdAt: "2026-07-31T00:00:00.000Z",
        verifiedAt: null,
        revokedAt: null
    });
    assert.equal(Object.isFrozen(status), true);
    assert.equal(JSON.stringify(status).includes("Steam_"), false);
    assert.equal(JSON.stringify(status).includes("discord-user-1"), false);
});

test("validates durable Identity state during initialization", () => {
    const validStore = new InMemoryIdentityStore();
    validStore.createLink(createPendingLink());
    const validModule = new IdentityModule({
        store: validStore
    });

    validModule.initialize();

    assert.equal(validModule.state, ComponentState.READY);

    const invalidModule = new IdentityModule({
        store: {
            createLink() {},
            getLinkById() {},
            getActiveLinkByDiscordUserId() {},
            getActiveLinkByGameUserId() {},
            replaceLink() {},
            listLinks() {
                return [createPendingLink({
                    id: "identity-link-1",
                    gameUserId: "unsupported"
                })];
            }
        }
    });

    assert.throws(
        () => invalidModule.initialize(),
        {
            message: "Identity durable state is invalid."
        }
    );
    assert.equal(invalidModule.state, ComponentState.ERROR);
});

test("registers Identity between Economy and Moderation", () => {
    const modules = ModuleLoader.load();

    assert.deepEqual(
        modules.map(module => module.name),
        ["Economy", "Identity", "Moderation", "Tickets"]
    );
    assert.equal(
        modules[1] instanceof IdentityModule,
        true
    );
});

test("rejects invalid member IDs and incomplete stores", () => {
    const module = new IdentityModule();

    assert.throws(
        () => module.getOwnStatus(" "),
        { message: "Discord user ID is required." }
    );
    assert.throws(
        () => new IdentityModule({ store: {} }),
        {
            message:
                "Identity store does not implement the required " +
                "persistence contract."
        }
    );
});
