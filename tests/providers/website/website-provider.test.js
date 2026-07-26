const { test } = require("node:test");
const assert = require("node:assert/strict");

const ComponentState = require(
    "../../../src/core/ComponentState"
);
const WebsiteProvider = require(
    "../../../src/providers/website/WebsiteProvider"
);
const FakeWebsiteServer = require(
    "./fakes/FakeWebsiteServer"
);

function createHarness({
    configuration = {
        enabled: true,
        host: "127.0.0.1",
        port: 8080,
        requestTimeoutMs: 10000,
        shutdownTimeoutMs: 5000
    },
    server = new FakeWebsiteServer()
} = {}) {

    return {
        provider: new WebsiteProvider({
            configuration,
            server
        }),
        server
    };

}

test("uses the expected Provider identity", () => {

    const harness = createHarness();

    assert.strictEqual(
        harness.provider.name,
        "Website"
    );
    assert.strictEqual(
        harness.provider.state,
        ComponentState.CREATED
    );

});

test("initializes with validated server options", () => {

    const harness = createHarness();

    assert.deepStrictEqual(
        harness.provider.initialize(),
        {
            name: "Website",
            state: ComponentState.READY
        }
    );
    assert.deepStrictEqual(
        harness.provider.serverOptions,
        {
            host: "127.0.0.1",
            port: 8080,
            requestTimeoutMs: 10000,
            shutdownTimeoutMs: 5000
        }
    );

});

test("rejects invalid configuration before server use", () => {

    const invalidConfigurations = [
        {
            configuration: null,
            message:
                "Website Provider configuration is required."
        },
        {
            configuration: {
                enabled: false
            },
            message:
                "Website Provider configuration must be enabled."
        },
        {
            configuration: {
                enabled: true,
                host: "0.0.0.0",
                port: 8080,
                requestTimeoutMs: 10000,
                shutdownTimeoutMs: 5000
            },
            message:
                "Website host must equal 127.0.0.1."
        },
        {
            configuration: {
                enabled: true,
                host: "127.0.0.1",
                port: 0,
                requestTimeoutMs: 10000,
                shutdownTimeoutMs: 5000
            },
            message:
                "Website port must be an integer from 1 through 65535."
        },
        {
            configuration: {
                enabled: true,
                host: "127.0.0.1",
                port: 8080,
                requestTimeoutMs: 0,
                shutdownTimeoutMs: 5000
            },
            message:
                "Website request timeout must be a positive safe integer."
        },
        {
            configuration: {
                enabled: true,
                host: "127.0.0.1",
                port: 8080,
                requestTimeoutMs: 10000,
                shutdownTimeoutMs:
                    Number.MAX_SAFE_INTEGER + 1
            },
            message:
                "Website shutdown timeout must be a positive safe integer."
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
            harness.server.startCalls,
            []
        );

    }

});

test("rejects an invalid server boundary", () => {

    const harness = createHarness({
        server: {
            start() {}
        }
    });

    assert.throws(
        () => harness.provider.initialize(),
        {
            message:
                "Website server must provide start and stop operations."
        }
    );
    assert.strictEqual(
        harness.provider.state,
        ComponentState.ERROR
    );

});

test("reports RUNNING only after server readiness", async () => {

    let finishStartup;
    let reportStartup;
    const startupStarted = new Promise(resolve => {
        reportStartup = resolve;
    });
    const server = new FakeWebsiteServer({
        start() {

            reportStartup();

            return new Promise(resolve => {
                finishStartup = resolve;
            });

        }
    });
    const harness = createHarness({
        server
    });

    harness.provider.initialize();

    const startup = harness.provider.start();

    await startupStarted;

    assert.strictEqual(
        harness.provider.state,
        ComponentState.STARTING
    );

    finishStartup();
    await startup;

    assert.strictEqual(
        harness.provider.state,
        ComponentState.RUNNING
    );
    assert.deepStrictEqual(
        server.startCalls,
        [
            {
                host: "127.0.0.1",
                port: 8080,
                requestTimeoutMs: 10000,
                shutdownTimeoutMs: 5000
            }
        ]
    );

});

test("propagates startup failure and enters ERROR", async () => {

    const startupError = new Error(
        "Website listen failed."
    );
    const server = new FakeWebsiteServer({
        start() {
            throw startupError;
        }
    });
    const harness = createHarness({
        server
    });

    harness.provider.initialize();

    await assert.rejects(
        harness.provider.start(),
        error => error === startupError
    );
    assert.strictEqual(
        harness.provider.state,
        ComponentState.ERROR
    );

    await harness.provider.stop();

    assert.strictEqual(server.stopCount, 1);
    assert.strictEqual(
        harness.provider.state,
        ComponentState.STOPPED
    );

});

test("enters ERROR after unexpected server loss", async () => {

    const harness = createHarness();

    harness.provider.initialize();
    await harness.provider.start();
    harness.server.reportUnexpectedLoss();

    assert.strictEqual(
        harness.provider.state,
        ComponentState.ERROR
    );

});

test("does not overwrite startup-time loss with RUNNING", async () => {

    const serverLossError = new Error(
        "Website server was lost."
    );
    const server = new FakeWebsiteServer({
        start(options, unexpectedLossHandler) {
            unexpectedLossHandler(serverLossError);
        }
    });
    const harness = createHarness({
        server
    });

    harness.provider.initialize();

    await assert.rejects(
        harness.provider.start(),
        error => error === serverLossError
    );
    assert.strictEqual(
        harness.provider.state,
        ComponentState.ERROR
    );

});

test("applies duplicate server-loss signals once", async () => {

    const harness = createHarness();
    const originalSetError =
        harness.provider.setError.bind(harness.provider);
    let errorTransitionCount = 0;

    harness.provider.setError = () => {
        errorTransitionCount += 1;
        originalSetError();
    };

    harness.provider.initialize();
    await harness.provider.start();

    harness.server.reportUnexpectedLoss();
    harness.server.reportUnexpectedLoss();

    assert.strictEqual(errorTransitionCount, 1);
    assert.strictEqual(
        harness.provider.state,
        ComponentState.ERROR
    );

});

test("intentional and repeated stop ends STOPPED", async () => {

    const harness = createHarness();

    harness.provider.initialize();
    await harness.provider.start();
    await harness.provider.stop();
    await harness.provider.stop();

    assert.strictEqual(
        harness.provider.state,
        ComponentState.STOPPED
    );
    assert.strictEqual(
        harness.server.stopCount,
        1
    );

});

test("stops safely after unexpected loss", async () => {

    const harness = createHarness();

    harness.provider.initialize();
    await harness.provider.start();
    harness.server.reportUnexpectedLoss();

    await harness.provider.stop();
    await harness.provider.stop();

    assert.strictEqual(
        harness.provider.state,
        ComponentState.STOPPED
    );
    assert.strictEqual(
        harness.server.stopCount,
        1
    );

});

test("ignores server-loss notification during stop", async () => {

    const server = new FakeWebsiteServer({
        stop(unexpectedLossHandler) {
            unexpectedLossHandler(
                new Error("Website server closed.")
            );
        }
    });
    const harness = createHarness({
        server
    });

    harness.provider.initialize();
    await harness.provider.start();
    await harness.provider.stop();

    assert.strictEqual(
        harness.provider.state,
        ComponentState.STOPPED
    );

});
