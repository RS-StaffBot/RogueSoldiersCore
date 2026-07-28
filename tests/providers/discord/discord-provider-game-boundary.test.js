const assert = require("node:assert/strict");
const test = require("node:test");

const DiscordGameCommandAuthorizer = require(
    "../../../src/providers/discord/services/DiscordGameCommandAuthorizer"
);
const DiscordGameServerProviderResolver = require(
    "../../../src/providers/discord/services/DiscordGameServerProviderResolver"
);
const DiscordProvider = require(
    "../../../src/providers/discord/DiscordProvider"
);

test("passes focused game boundaries to the command loader", () => {

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
    const provider = new DiscordProvider({
        commandLoader,
        commandRegistry,
        logger,
        resolveGameServerProvider(name) {
            assert.equal(name, "7 Days to Die");
            return resolvedProvider;
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
        receivedOptions.gameServerProviderResolver.resolve().available,
        true
    );
    assert.deepEqual(Object.keys(receivedOptions), [
        "gameCommandAuthorizer",
        "gameServerProviderResolver"
    ]);

});

test("accepts injected game command boundaries", () => {

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

});
