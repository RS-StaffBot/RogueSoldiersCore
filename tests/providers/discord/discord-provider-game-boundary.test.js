const assert = require("node:assert/strict");
const test = require("node:test");

const DiscordGameCommandAuthorizer = require(
    "../../../src/providers/discord/services/DiscordGameCommandAuthorizer"
);
const DiscordGameServerProviderResolver = require(
    "../../../src/providers/discord/services/DiscordGameServerProviderResolver"
);
const DiscordIdentityModuleResolver = require(
    "../../../src/providers/discord/services/DiscordIdentityModuleResolver"
);
const DiscordProvider = require(
    "../../../src/providers/discord/DiscordProvider"
);

test("passes focused game and identity boundaries to the command loader", () => {

    let receivedOptions;
    const commandLoader = {
        load(options) {
            receivedOptions = options;
            return [];
        }
    };
    const commandRegistry = {
        clear() {},
        getAll() {
            return [];
        },
        register() {
            throw new Error("No commands should be registered.");
        }
    };
    const logger = {
        info() {}
    };
    const resolvedProvider = {
        executeCommand() {},
        name: "7 Days to Die",
        state: "RUNNING"
    };
    const resolvedIdentityModule = {
        getOwnStatus() {},
        name: "Identity",
        recordVerifiedSelfLink() {},
        state: "RUNNING"
    };
    const provider = new DiscordProvider({
        commandLoader,
        commandRegistry,
        logger,
        resolveGameServerProvider(name) {
            assert.equal(name, "7 Days to Die");
            return resolvedProvider;
        },
        resolveIdentityModule(name) {
            assert.equal(name, "Identity");
            return resolvedIdentityModule;
        }
    });

    provider.loadCommands();

    assert.equal(
        receivedOptions.gameCommandAuthorizer instanceof
            DiscordGameCommandAuthorizer,
        true
    );
    assert.equal(
        receivedOptions.gameServerProviderResolver instanceof
            DiscordGameServerProviderResolver,
        true
    );
    assert.equal(
        receivedOptions.identityModuleResolver instanceof
            DiscordIdentityModuleResolver,
        true
    );
    assert.equal(
        receivedOptions.gameServerProviderResolver.resolve().available,
        true
    );
    assert.equal(
        receivedOptions.identityModuleResolver.resolve().available,
        true
    );
    assert.deepEqual(Object.keys(receivedOptions), [
        "gameCommandAuthorizer",
        "gameServerProviderResolver",
        "identityModuleResolver"
    ]);

});

test("accepts injected game and identity command boundaries", () => {

    const gameCommandAuthorizer = {
        isAuthorized() {
            return true;
        }
    };
    const gameServerProviderResolver = {
        resolve() {
            return {
                available: false,
                status: "PROVIDER_UNAVAILABLE"
            };
        }
    };
    const identityModuleResolver = {
        resolve() {
            return {
                available: false,
                status: "MODULE_UNAVAILABLE"
            };
        }
    };
    let receivedOptions;
    const provider = new DiscordProvider({
        commandLoader: {
            load(options) {
                receivedOptions = options;
                return [];
            }
        },
        commandRegistry: {
            clear() {},
            getAll() {
                return [];
            }
        },
        gameCommandAuthorizer,
        gameServerProviderResolver,
        identityModuleResolver,
        logger: {
            info() {}
        }
    });

    provider.loadCommands();

    assert.equal(
        receivedOptions.gameCommandAuthorizer,
        gameCommandAuthorizer
    );
    assert.equal(
        receivedOptions.gameServerProviderResolver,
        gameServerProviderResolver
    );
    assert.equal(
        receivedOptions.identityModuleResolver,
        identityModuleResolver
    );

});
