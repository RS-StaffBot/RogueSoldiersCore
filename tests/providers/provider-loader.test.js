const { test } = require("node:test");
const assert = require("node:assert/strict");

const DiscordProvider = require(
    "../../src/providers/discord/DiscordProvider"
);
const ProviderLoader = require(
    "../../src/providers/core/ProviderLoader"
);
const FakeSevenDaysToDieClient = require(
    "./sevendaystodie/fakes/FakeSevenDaysToDieClient"
);

function createConfiguration(settings) {

    return {
        get(path, defaultValue = null) {

            assert.strictEqual(
                path,
                "providers.sevendaystodie"
            );

            return settings === undefined
                ? defaultValue
                : settings;

        }
    };

}

test("continues to load Discord when game configuration is missing", () => {

    const providers = ProviderLoader.load({
        configuration: createConfiguration(undefined)
    });

    assert.strictEqual(providers.length, 1);
    assert.strictEqual(
        providers[0] instanceof DiscordProvider,
        true
    );
    assert.strictEqual(
        providers[0].name,
        "Discord"
    );

});

test("omits disabled game configuration without creating a client", () => {

    let clientCreationCount = 0;
    const providers = ProviderLoader.load({
        configuration: createConfiguration({
            enabled: false
        }),
        createSevenDaysToDieClient() {
            clientCreationCount += 1;

            return new FakeSevenDaysToDieClient();
        }
    });

    assert.deepStrictEqual(
        providers.map(provider => provider.name),
        ["Discord"]
    );
    assert.strictEqual(clientCreationCount, 0);

});

test("rejects a non-boolean enabled setting", () => {

    assert.throws(
        () => ProviderLoader.load({
            configuration: createConfiguration({
                enabled: "true"
            })
        }),
        {
            message:
                "7 Days to Die enabled configuration must be " +
                "a boolean."
        }
    );

});

test("makes the enabled Phase 1 client limitation explicit", () => {

    assert.throws(
        () => ProviderLoader.load({
            configuration: createConfiguration({
                enabled: true
            })
        }),
        {
            message:
                "7 Days to Die Provider requires an injected " +
                "client until Phase 2."
        }
    );

});

test("loads one game Provider after Discord when a client is injected", () => {

    let clientCreationCount = 0;
    const client = new FakeSevenDaysToDieClient();
    const configuration = {
        connectionTimeoutMs: 10000,
        enabled: true,
        host: "game.internal",
        port: 8081
    };
    const environment = {
        SEVEN_DAYS_TO_DIE_TELNET_PASSWORD:
            "test-password"
    };
    const providers = ProviderLoader.load({
        configuration: createConfiguration(
            configuration
        ),
        createSevenDaysToDieClient() {
            clientCreationCount += 1;

            return client;
        },
        environment
    });

    assert.deepStrictEqual(
        providers.map(provider => provider.name),
        ["Discord", "7 Days to Die"]
    );
    assert.strictEqual(
        new Set(
            providers.map(provider => provider.name)
        ).size,
        providers.length
    );
    assert.strictEqual(clientCreationCount, 1);

    const gameProvider = providers[1];

    gameProvider.initialize();

    assert.strictEqual(
        gameProvider.client,
        client
    );
    assert.deepStrictEqual(
        gameProvider.connectionOptions,
        {
            connectionTimeoutMs: 10000,
            host: "game.internal",
            password: "test-password",
            port: 8081
        }
    );

});
