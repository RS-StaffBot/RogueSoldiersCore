const { test } = require("node:test");
const assert = require("node:assert/strict");

const DiscordProvider = require(
    "../../src/providers/discord/DiscordProvider"
);
const ProviderLoader = require(
    "../../src/providers/core/ProviderLoader"
);
const SevenDaysToDieTelnetClient = require(
    "../../src/providers/sevendaystodie/" +
    "SevenDaysToDieTelnetClient"
);
const WebsiteServer = require(
    "../../src/providers/website/WebsiteServer"
);
const FakeSevenDaysToDieClient = require(
    "./sevendaystodie/fakes/FakeSevenDaysToDieClient"
);
const FakeWebsiteServer = require(
    "./website/fakes/FakeWebsiteServer"
);

function createConfiguration(
    gameSettings,
    websiteSettings
) {

    return {
        get(path, defaultValue = null) {

            if (path === "providers.sevendaystodie") {
                return gameSettings === undefined
                    ? defaultValue
                    : gameSettings;
            }

            if (path === "providers.website") {
                return websiteSettings === undefined
                    ? defaultValue
                    : websiteSettings;
            }

            assert.fail(
                `Unexpected configuration path: ${path}`
            );

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

test("loads the real client for enabled production configuration", () => {

    const providers = ProviderLoader.load({
        configuration: createConfiguration({
            connectionTimeoutMs: 10000,
            enabled: true,
            host: "game.internal",
            port: 8081
        }),
        environment: {
            SEVEN_DAYS_TO_DIE_TELNET_PASSWORD:
                "test-password"
        }
    });

    assert.deepStrictEqual(
        providers.map(provider => provider.name),
        ["Discord", "7 Days to Die"]
    );
    assert.strictEqual(
        providers[1].client instanceof
            SevenDaysToDieTelnetClient,
        true
    );

});

test("invalid enabled configuration opens no socket", () => {

    let socketCreationCount = 0;
    const client = new SevenDaysToDieTelnetClient({
        createSocket() {
            socketCreationCount += 1;

            throw new Error("Socket should not open.");
        }
    });
    const providers = ProviderLoader.load({
        configuration: createConfiguration({
            connectionTimeoutMs: 10000,
            enabled: true,
            host: "",
            port: 8081
        }),
        createSevenDaysToDieClient() {
            return client;
        },
        environment: {
            SEVEN_DAYS_TO_DIE_TELNET_PASSWORD:
                "test-password"
        }
    });

    assert.throws(
        () => providers[1].initialize(),
        {
            message:
                "7 Days to Die host must be a non-empty string."
        }
    );
    assert.strictEqual(socketCreationCount, 0);

});

test("rejects an invalid enabled client factory", () => {

    assert.throws(
        () => ProviderLoader.load({
            configuration: createConfiguration({
                enabled: true
            }),
            createSevenDaysToDieClient: null
        }),
        {
            message:
                "7 Days to Die client factory must be a function."
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

test("omits missing Website configuration", () => {

    const providers = ProviderLoader.load({
        configuration: createConfiguration(
            undefined,
            undefined
        )
    });

    assert.deepStrictEqual(
        providers.map(provider => provider.name),
        ["Discord"]
    );

});

test("omits disabled Website without constructing a server", () => {

    let serverCreationCount = 0;
    const providers = ProviderLoader.load({
        configuration: createConfiguration(
            undefined,
            {
                enabled: false,
                host: "invalid",
                port: "invalid",
                requestTimeoutMs: null,
                shutdownTimeoutMs: null
            }
        ),
        createWebsiteServer() {
            serverCreationCount += 1;

            return new FakeWebsiteServer();
        }
    });

    assert.deepStrictEqual(
        providers.map(provider => provider.name),
        ["Discord"]
    );
    assert.strictEqual(serverCreationCount, 0);

});

test("rejects a non-boolean Website enabled setting", () => {

    assert.throws(
        () => ProviderLoader.load({
            configuration: createConfiguration(
                undefined,
                {
                    enabled: "true"
                }
            )
        }),
        {
            message:
                "Website enabled configuration must be a boolean."
        }
    );

});

test("loads the real Website server for enabled configuration", () => {

    const providers = ProviderLoader.load({
        configuration: createConfiguration(
            undefined,
            {
                enabled: true,
                host: "127.0.0.1",
                port: 8080,
                requestTimeoutMs: 10000,
                shutdownTimeoutMs: 5000
            }
        )
    });

    assert.deepStrictEqual(
        providers.map(provider => provider.name),
        ["Discord", "Website"]
    );
    assert.strictEqual(
        providers[1].server instanceof WebsiteServer,
        true
    );

});

test("loads one Website Provider after existing Providers", () => {

    let serverCreationCount = 0;
    const server = new FakeWebsiteServer();
    const websiteConfiguration = {
        authentication: {
            enabled: false
        },
        enabled: true,
        host: "127.0.0.1",
        port: 8080,
        requestTimeoutMs: 10000,
        shutdownTimeoutMs: 5000
    };
    const environment = {
        DISCORD_CLIENT_ID: "application-1",
        SEVEN_DAYS_TO_DIE_TELNET_PASSWORD:
            "test-password"
    };
    const providers = ProviderLoader.load({
        configuration: createConfiguration(
            {
                connectionTimeoutMs: 10000,
                enabled: true,
                host: "game.internal",
                port: 8081
            },
            websiteConfiguration
        ),
        createSevenDaysToDieClient() {
            return new FakeSevenDaysToDieClient();
        },
        createWebsiteServer() {
            serverCreationCount += 1;

            return server;
        },
        environment
    });

    assert.deepStrictEqual(
        providers.map(provider => provider.name),
        ["Discord", "7 Days to Die", "Website"]
    );
    assert.strictEqual(serverCreationCount, 1);

    const websiteProvider = providers[2];

    websiteProvider.initialize();

    assert.strictEqual(
        websiteProvider.server,
        server
    );
    assert.strictEqual(
        websiteProvider.configuration,
        websiteConfiguration
    );
    assert.strictEqual(
        websiteProvider.environment,
        environment
    );
    assert.deepStrictEqual(
        websiteProvider.authenticationOptions,
        {
            enabled: false
        }
    );

});

test("disabled Website ignores incomplete authentication values", () => {

    let serverCreationCount = 0;
    const providers = ProviderLoader.load({
        configuration: createConfiguration(
            undefined,
            {
                authentication: {
                    enabled: true
                },
                enabled: false
            }
        ),
        createWebsiteServer() {
            serverCreationCount += 1;

            return new FakeWebsiteServer();
        },
        environment: {}
    });

    assert.deepStrictEqual(
        providers.map(provider => provider.name),
        ["Discord"]
    );
    assert.strictEqual(serverCreationCount, 0);

});

test("rejects an invalid enabled Website server factory", () => {

    assert.throws(
        () => ProviderLoader.load({
            configuration: createConfiguration(
                undefined,
                {
                    enabled: true
                }
            ),
            createWebsiteServer: null
        }),
        {
            message:
                "Website server factory must be a function."
        }
    );

});
