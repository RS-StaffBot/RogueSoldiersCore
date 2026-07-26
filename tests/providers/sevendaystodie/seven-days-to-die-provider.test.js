const { test } = require("node:test");
const assert = require("node:assert/strict");

const ComponentState = require(
    "../../../src/core/ComponentState"
);
const SevenDaysToDieProvider = require(
    "../../../src/providers/sevendaystodie/" +
    "SevenDaysToDieProvider"
);
const FakeSevenDaysToDieClient = require(
    "./fakes/FakeSevenDaysToDieClient"
);

function createHarness({
    client = new FakeSevenDaysToDieClient(),
    configuration = {
        connectionTimeoutMs: 10000,
        enabled: true,
        host: "game.internal",
        port: 8081
    },
    environment = {
        SEVEN_DAYS_TO_DIE_TELNET_PASSWORD:
            "test-password"
    }
} = {}) {

    return {
        client,
        provider: new SevenDaysToDieProvider({
            client,
            configuration,
            environment
        })
    };

}

test("uses the expected Provider identity", () => {

    const harness = createHarness();

    assert.strictEqual(
        harness.provider.name,
        "7 Days to Die"
    );
    assert.strictEqual(
        harness.provider.state,
        ComponentState.CREATED
    );

});

test("initializes, starts, and stops through the client boundary", async () => {

    const harness = createHarness();

    assert.deepStrictEqual(
        harness.provider.initialize(),
        {
            name: "7 Days to Die",
            state: ComponentState.READY
        }
    );

    await harness.provider.start();

    assert.strictEqual(
        harness.provider.state,
        ComponentState.RUNNING
    );
    assert.deepStrictEqual(
        harness.client.connectCalls,
        [
            {
                connectionTimeoutMs: 10000,
                host: "game.internal",
                password: "test-password",
                port: 8081
            }
        ]
    );

    await harness.provider.stop();

    assert.strictEqual(
        harness.provider.state,
        ComponentState.STOPPED
    );
    assert.strictEqual(
        harness.client.disconnectCount,
        1
    );

    await harness.provider.stop();

    assert.strictEqual(
        harness.client.disconnectCount,
        1
    );

});

test("reports RUNNING only after client readiness", async () => {

    let finishConnection;
    let reportConnection;
    const connectionStarted = new Promise(resolve => {
        reportConnection = resolve;
    });
    const client = new FakeSevenDaysToDieClient({
        connect() {

            reportConnection();

            return new Promise(resolve => {
                finishConnection = resolve;
            });

        }
    });
    const harness = createHarness({
        client
    });

    harness.provider.initialize();

    const startup = harness.provider.start();

    await connectionStarted;

    assert.strictEqual(
        harness.provider.state,
        ComponentState.STARTING
    );

    finishConnection();
    await startup;

    assert.strictEqual(
        harness.provider.state,
        ComponentState.RUNNING
    );

});

test("rejects invalid configuration before client use", () => {

    const invalidConfigurations = [
        {
            configuration: null,
            message:
                "7 Days to Die Provider configuration is required."
        },
        {
            configuration: {
                enabled: false
            },
            message:
                "7 Days to Die Provider configuration must be enabled."
        },
        {
            configuration: {
                connectionTimeoutMs: 10000,
                enabled: true,
                host: " ",
                port: 8081
            },
            message:
                "7 Days to Die host must be a non-empty string."
        },
        {
            configuration: {
                connectionTimeoutMs: 10000,
                enabled: true,
                host: "game.internal",
                port: 65536
            },
            message:
                "7 Days to Die port must be an integer from 1 " +
                "through 65535."
        },
        {
            configuration: {
                connectionTimeoutMs: 0,
                enabled: true,
                host: "game.internal",
                port: 8081
            },
            message:
                "7 Days to Die connection timeout must be a " +
                "positive integer."
        }
    ];

    for (const invalid of invalidConfigurations) {

        const harness = createHarness({
            configuration: invalid.configuration
        });

        assert.throws(
            () => harness.provider.initialize(),
            {
                message: invalid.message
            }
        );
        assert.strictEqual(
            harness.provider.state,
            ComponentState.ERROR
        );
        assert.deepStrictEqual(
            harness.client.connectCalls,
            []
        );

    }

});

test("rejects a missing secret before client use", () => {

    const harness = createHarness({
        environment: {}
    });

    assert.throws(
        () => harness.provider.initialize(),
        {
            message:
                "7 Days to Die Telnet password is required."
        }
    );
    assert.strictEqual(
        harness.provider.state,
        ComponentState.ERROR
    );
    assert.deepStrictEqual(
        harness.client.connectCalls,
        []
    );

});

test("rejects an invalid client boundary during initialization", () => {

    const harness = createHarness({
        client: {
            connect() {}
        }
    });

    assert.throws(
        () => harness.provider.initialize(),
        {
            message:
                "7 Days to Die client must provide connect and " +
                "disconnect operations."
        }
    );
    assert.strictEqual(
        harness.provider.state,
        ComponentState.ERROR
    );

});

test("propagates connection failure and enters ERROR", async () => {

    const connectionError = new Error(
        "Connection failed."
    );
    const client = new FakeSevenDaysToDieClient({
        connect() {
            throw connectionError;
        }
    });
    const harness = createHarness({
        client
    });

    harness.provider.initialize();

    await assert.rejects(
        harness.provider.start(),
        error => error === connectionError
    );
    assert.strictEqual(
        harness.provider.state,
        ComponentState.ERROR
    );

});

test("safely disconnects after partial startup", async () => {

    const client = new FakeSevenDaysToDieClient({
        connect() {
            throw new Error("Connection failed.");
        }
    });
    const harness = createHarness({
        client
    });

    harness.provider.initialize();

    await assert.rejects(
        harness.provider.start(),
        {
            message: "Connection failed."
        }
    );

    await harness.provider.stop();

    assert.strictEqual(
        harness.client.disconnectCount,
        1
    );
    assert.strictEqual(
        harness.provider.state,
        ComponentState.STOPPED
    );

});

test("awaits client disconnection", async () => {

    let finishDisconnection;
    let reportDisconnection;
    const disconnectionStarted = new Promise(resolve => {
        reportDisconnection = resolve;
    });
    const client = new FakeSevenDaysToDieClient({
        disconnect() {

            reportDisconnection();

            return new Promise(resolve => {
                finishDisconnection = resolve;
            });

        }
    });
    const harness = createHarness({
        client
    });

    harness.provider.initialize();
    await harness.provider.start();

    const shutdown = harness.provider.stop();

    await disconnectionStarted;

    assert.strictEqual(
        harness.provider.state,
        ComponentState.STOPPING
    );

    finishDisconnection();
    await shutdown;

    assert.strictEqual(
        harness.provider.state,
        ComponentState.STOPPED
    );

});

test("reports ERROR when client disconnection fails", async () => {

    const disconnectionError = new Error(
        "Disconnection failed."
    );
    const client = new FakeSevenDaysToDieClient({
        disconnect() {
            throw disconnectionError;
        }
    });
    const harness = createHarness({
        client
    });

    harness.provider.initialize();
    await harness.provider.start();

    await assert.rejects(
        harness.provider.stop(),
        error => error === disconnectionError
    );
    assert.strictEqual(
        harness.provider.state,
        ComponentState.ERROR
    );

});
