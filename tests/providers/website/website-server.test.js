const { test } = require("node:test");
const assert = require("node:assert/strict");

const WebsiteServer = require(
    "../../../src/providers/website/WebsiteServer"
);
const FakeHttpServer = require(
    "./fakes/FakeHttpServer"
);

const defaultOptions = Object.freeze({
    host: "127.0.0.1",
    port: 8080,
    requestTimeoutMs: 10000,
    shutdownTimeoutMs: 5000
});

function createHarness({
    autoClose = true,
    autoListen = true,
    listenError = null,
    timers = null
} = {}) {

    let httpServer;
    let factoryCount = 0;
    const timerHarness = timers || {
        clearTimer() {},
        setTimer() {
            return Symbol("timer");
        }
    };
    const server = new WebsiteServer({
        clearTimer: timerHarness.clearTimer,
        createServer(options, requestListener) {
            factoryCount += 1;
            httpServer = new FakeHttpServer({
                autoClose,
                autoListen,
                listenError,
                requestListener,
                serverOptions: options
            });

            return httpServer;
        },
        setTimer: timerHarness.setTimer
    });

    return {
        get factoryCount() {
            return factoryCount;
        },
        get httpServer() {
            return httpServer;
        },
        server,
        timerHarness
    };

}

test("constructs an injected HTTP server and listens as configured", async () => {

    const harness = createHarness();

    await harness.server.start(defaultOptions);

    assert.strictEqual(harness.factoryCount, 1);
    assert.deepStrictEqual(
        harness.httpServer.serverOptions,
        {
            requestTimeout: 10000
        }
    );
    assert.deepStrictEqual(
        harness.httpServer.listenCalls,
        [
            {
                host: "127.0.0.1",
                port: 8080
            }
        ]
    );

    await harness.server.stop();

});

test("accepts port zero only at the direct server boundary", async () => {

    const harness = createHarness();

    await harness.server.start({
        ...defaultOptions,
        port: 0
    });

    assert.deepStrictEqual(
        harness.httpServer.listenCalls,
        [
            {
                host: "127.0.0.1",
                port: 0
            }
        ]
    );

    await harness.server.stop();

});

test("start resolves only after listening", async () => {

    const harness = createHarness({
        autoListen: false
    });
    let startupFinished = false;
    const startup = harness.server
        .start(defaultOptions)
        .then(() => {
            startupFinished = true;
        });

    await Promise.resolve();

    assert.strictEqual(startupFinished, false);

    harness.httpServer.reportListening();
    await startup;

    assert.strictEqual(startupFinished, true);

    await harness.server.stop();

});

test("GET health returns the exact safe response", async () => {

    const harness = createHarness();

    await harness.server.start(defaultOptions);

    const response = harness.httpServer.request();

    assert.strictEqual(response.statusCode, 200);
    assert.deepStrictEqual(
        response.headers,
        {
            "cache-control": "no-store",
            "content-type":
                "application/json; charset=utf-8",
            "x-content-type-options": "nosniff"
        }
    );
    assert.strictEqual(
        response.body,
        "{\"service\":\"website-provider\",\"status\":\"ok\"}"
    );
    assert.strictEqual(
        Object.hasOwn(response.headers, "access-control-allow-origin"),
        false
    );
    assert.strictEqual(
        Object.hasOwn(response.headers, "set-cookie"),
        false
    );

    await harness.server.stop();

});

test("POST health returns 405 without processing a body", async () => {

    const harness = createHarness();

    await harness.server.start(defaultOptions);

    const response = harness.httpServer.request({
        method: "POST"
    });

    assert.strictEqual(response.statusCode, 405);
    assert.strictEqual(response.headers.allow, "GET");
    assert.deepStrictEqual(
        JSON.parse(response.body),
        {
            error: "Method not allowed."
        }
    );

    await harness.server.stop();

});

test("unknown routes return a generic 404 response", async () => {

    const harness = createHarness();

    await harness.server.start(defaultOptions);

    const response = harness.httpServer.request({
        url: "/private/configuration"
    });

    assert.strictEqual(response.statusCode, 404);
    assert.deepStrictEqual(
        JSON.parse(response.body),
        {
            error: "Not found."
        }
    );
    assert.strictEqual(
        response.body.includes("private"),
        false
    );
    assert.strictEqual(
        response.body.includes("configuration"),
        false
    );

    await harness.server.stop();

});

test("validates options before creating an HTTP server", async () => {

    const invalidOptions = [
        {
            ...defaultOptions,
            host: "0.0.0.0"
        },
        {
            ...defaultOptions,
            port: -1
        },
        {
            ...defaultOptions,
            requestTimeoutMs: 0
        },
        {
            ...defaultOptions,
            shutdownTimeoutMs: 0
        }
    ];

    for (const options of invalidOptions) {

        const harness = createHarness();

        await assert.rejects(
            harness.server.start(options)
        );
        assert.strictEqual(harness.factoryCount, 0);

    }

});

test("listen failure rejects and permits safe shutdown", async () => {

    const listenError = new Error(
        "Address already in use."
    );
    const harness = createHarness({
        listenError
    });

    await assert.rejects(
        harness.server.start(defaultOptions),
        error => error === listenError
    );

    await harness.server.stop();

    assert.strictEqual(
        harness.httpServer.closeCount,
        0
    );

});

test("unexpected post-readiness error notifies once", async () => {

    const harness = createHarness();
    const reportedErrors = [];

    await harness.server.start(
        defaultOptions,
        error => {
            reportedErrors.push(error);
        }
    );

    const serverError = new Error(
        "HTTP server failed."
    );

    harness.httpServer.reportError(serverError);
    harness.httpServer.reportError(
        new Error("Duplicate error.")
    );

    assert.deepStrictEqual(
        reportedErrors,
        [serverError]
    );

    await harness.server.stop();

});

test("error followed by close still notifies once", async () => {

    const harness = createHarness();
    let notificationCount = 0;

    await harness.server.start(
        defaultOptions,
        () => {
            notificationCount += 1;
        }
    );

    harness.httpServer.reportError();
    harness.httpServer.reportUnexpectedClose();

    assert.strictEqual(notificationCount, 1);

    await harness.server.stop();

});

test("unexpected close without error notifies once", async () => {

    const harness = createHarness();
    const reportedErrors = [];

    await harness.server.start(
        defaultOptions,
        error => {
            reportedErrors.push(error);
        }
    );

    harness.httpServer.reportUnexpectedClose();
    harness.httpServer.reportUnexpectedClose();

    assert.strictEqual(reportedErrors.length, 1);
    assert.strictEqual(
        reportedErrors[0].message,
        "Website server closed unexpectedly."
    );

    await harness.server.stop();

});

test("callback exceptions do not escape server-loss cleanup", async () => {

    const harness = createHarness();

    await harness.server.start(
        defaultOptions,
        () => {
            throw new Error(
                "Provider callback failed."
            );
        }
    );

    assert.doesNotThrow(() => {
        harness.httpServer.reportUnexpectedClose();
    });

    await harness.server.stop();

});

test("intentional shutdown does not notify unexpected loss", async () => {

    const harness = createHarness();
    let notificationCount = 0;

    await harness.server.start(
        defaultOptions,
        () => {
            notificationCount += 1;
        }
    );
    await harness.server.stop();

    assert.strictEqual(notificationCount, 0);

});

test("stop before start and repeated stop are safe", async () => {

    const harness = createHarness();

    await harness.server.stop();
    await harness.server.stop();

    assert.strictEqual(harness.factoryCount, 0);

});

test("stop after readiness awaits server close", async () => {

    const harness = createHarness({
        autoClose: false
    });

    await harness.server.start(defaultOptions);

    let stopFinished = false;
    const shutdown = harness.server
        .stop()
        .then(() => {
            stopFinished = true;
        });

    await Promise.resolve();

    assert.strictEqual(stopFinished, false);
    assert.strictEqual(
        harness.httpServer.closeCount,
        1
    );

    harness.httpServer.finishClose();
    await shutdown;

    assert.strictEqual(stopFinished, true);

});

test("shutdown timeout forces remaining connections closed", async () => {

    let timerCallback;
    const clearedTimers = [];
    const timer = Symbol("shutdown-timer");
    const harness = createHarness({
        autoClose: false,
        timers: {
            clearTimer(receivedTimer) {
                clearedTimers.push(receivedTimer);
            },
            setTimer(callback, delay) {
                assert.strictEqual(delay, 5000);
                timerCallback = callback;

                return timer;
            }
        }
    });

    await harness.server.start(defaultOptions);

    const shutdown = harness.server.stop();

    timerCallback();
    await shutdown;

    assert.strictEqual(
        harness.httpServer.closeAllConnectionsCount,
        1
    );
    assert.deepStrictEqual(clearedTimers, [timer]);

});

test("repeated concurrent stop closes only once", async () => {

    const harness = createHarness({
        autoClose: false
    });

    await harness.server.start(defaultOptions);

    const firstStop = harness.server.stop();
    const secondStop = harness.server.stop();

    assert.strictEqual(
        harness.httpServer.closeCount,
        1
    );

    harness.httpServer.finishClose();

    await Promise.all([
        firstStop,
        secondStop
    ]);

    assert.strictEqual(
        harness.httpServer.closeCount,
        1
    );

});

test("server listener and timer cleanup remains stable", async () => {

    const clearedTimers = [];
    const timer = Symbol("shutdown-timer");
    const harness = createHarness({
        timers: {
            clearTimer(receivedTimer) {
                clearedTimers.push(receivedTimer);
            },
            setTimer() {
                return timer;
            }
        }
    });

    await harness.server.start(defaultOptions);
    await harness.server.stop();

    assert.strictEqual(
        harness.httpServer.listenerCount("listening"),
        0
    );
    assert.strictEqual(
        harness.httpServer.listenerCount("error"),
        0
    );
    assert.strictEqual(
        harness.httpServer.listenerCount("close"),
        0
    );
    assert.deepStrictEqual(clearedTimers, [timer]);

    await harness.server.stop();

    assert.deepStrictEqual(clearedTimers, [timer]);

});
