const { test } = require("node:test");
const assert = require("node:assert/strict");

const SevenDaysToDieTelnetClient = require(
    "../../../src/providers/sevendaystodie/" +
    "SevenDaysToDieTelnetClient"
);
const FakeSocket = require("./fakes/FakeSocket");

const CONNECTION_OPTIONS = Object.freeze({
    connectionTimeoutMs: 10000,
    host: "game.internal",
    password: "test-password",
    port: 8081
});

function createHarness({
    socket = new FakeSocket()
} = {}) {

    const socketFactoryCalls = [];
    const activeTimers = new Map();
    const clearedTimers = [];
    let nextTimerId = 1;
    const client = new SevenDaysToDieTelnetClient({
        clearConnectionTimeout(timerId) {
            clearedTimers.push(timerId);
            activeTimers.delete(timerId);
        },
        createSocket(options) {
            socketFactoryCalls.push(options);

            return socket;
        },
        setConnectionTimeout(callback, delay) {

            const timerId = nextTimerId;

            nextTimerId += 1;
            activeTimers.set(timerId, {
                callback,
                delay
            });

            return timerId;

        }
    });

    return {
        activeTimers,
        clearedTimers,
        client,
        socket,
        socketFactoryCalls
    };

}

function emitReadyHandshake(socket, {
    lineEnding = "\r\n"
} = {}) {

    socket.data(`Please enter password:${lineEnding}`);
    socket.data(`Logon successful.${lineEnding}`);
    socket.data(
        `*** Connected with 7DTD server.${lineEnding}`
    );

}

test("constructs without opening a real socket", () => {

    const harness = createHarness();

    assert.deepStrictEqual(
        harness.socketFactoryCalls,
        []
    );
    assert.strictEqual(harness.client.ready, false);

});

test("opens the expected raw TCP endpoint", async () => {

    const harness = createHarness();
    const connection =
        harness.client.connect(CONNECTION_OPTIONS);

    assert.deepStrictEqual(
        harness.socketFactoryCalls,
        [
            {
                host: "game.internal",
                port: 8081
            }
        ]
    );

    harness.socket.fail(new Error("Stop test."));

    await assert.rejects(connection);

});

test("does not write the password before its prompt", () => {

    const harness = createHarness();
    const connection =
        harness.client.connect(CONNECTION_OPTIONS);

    harness.socket.connect();
    harness.socket.data(
        "*** Connected with 7DTD server.\r\n"
    );

    assert.deepStrictEqual(harness.socket.writes, []);

    harness.socket.fail(new Error("Stop test."));

    return assert.rejects(connection);

});

test("writes the password once with CRLF", async () => {

    const harness = createHarness();
    const connection =
        harness.client.connect(CONNECTION_OPTIONS);

    harness.socket.data("Please enter password:\n");
    harness.socket.data("Please enter password:\r\n");

    assert.deepStrictEqual(
        harness.socket.writes,
        ["test-password\r\n"]
    );

    harness.socket.data("Logon successful.\n");
    harness.socket.data(
        "*** Connected with 7DTD server.\n"
    );

    await connection;

});

test("handles a password prompt split across chunks", async () => {

    const harness = createHarness();
    const connection =
        harness.client.connect(CONNECTION_OPTIONS);

    harness.socket.data("Please enter pass");

    assert.deepStrictEqual(harness.socket.writes, []);

    harness.socket.data("word:\r\n");

    assert.deepStrictEqual(
        harness.socket.writes,
        ["test-password\r\n"]
    );

    harness.socket.data(
        "Logon successful.\r\n" +
        "*** Connected with 7DTD server.\r\n"
    );

    await connection;

});

test("handles a readiness banner split across chunks", async () => {

    const harness = createHarness();
    const connection =
        harness.client.connect(CONNECTION_OPTIONS);

    harness.socket.data(
        "Please enter password:\r\n" +
        "Logon successful.\r\n" +
        "*** Connected with 7D"
    );

    let resolved = false;

    connection.then(() => {
        resolved = true;
    });

    await Promise.resolve();

    assert.strictEqual(resolved, false);

    harness.socket.data("TD server.\r\n");
    await connection;

    assert.strictEqual(resolved, true);

});

test("handles prompt and readiness text in one chunk", async () => {

    const harness = createHarness();
    const connection =
        harness.client.connect(CONNECTION_OPTIONS);

    harness.socket.data(
        "Please enter password:\r\n" +
        "Logon successful.\r\n" +
        "*** Connected with 7DTD server.\r\n"
    );

    await connection;

    assert.deepStrictEqual(
        harness.socket.writes,
        ["test-password\r\n"]
    );

});

test("does not resolve until authentication and readiness", async () => {

    const harness = createHarness();
    const connection =
        harness.client.connect(CONNECTION_OPTIONS);
    let resolved = false;

    connection.then(() => {
        resolved = true;
    });

    harness.socket.data("Please enter password:\r\n");
    harness.socket.data("Logon successful.\r\n");

    await Promise.resolve();

    assert.strictEqual(resolved, false);

    harness.socket.data(
        "*** Connected with 7DTD server.\r\n"
    );
    await connection;

    assert.strictEqual(resolved, true);

});

test("rejects a socket error before readiness", async () => {

    const harness = createHarness();
    const connection =
        harness.client.connect(CONNECTION_OPTIONS);

    harness.socket.fail(
        new Error("test-password")
    );

    await assert.rejects(
        connection,
        {
            message: "7 Days to Die connection failed."
        }
    );
    assert.strictEqual(
        harness.socket.destroyCount,
        1
    );

});

test("rejects premature close before readiness", async () => {

    const harness = createHarness();
    const connection =
        harness.client.connect(CONNECTION_OPTIONS);

    harness.socket.close();

    await assert.rejects(
        connection,
        {
            message:
                "7 Days to Die connection closed before readiness."
        }
    );

});

test("rejects the complete readiness timeout", async () => {

    const harness = createHarness();
    const connection =
        harness.client.connect(CONNECTION_OPTIONS);
    const [timer] = harness.activeTimers.values();

    assert.strictEqual(timer.delay, 10000);

    timer.callback();

    await assert.rejects(
        connection,
        {
            message:
                "7 Days to Die connection timed out before readiness."
        }
    );
    assert.strictEqual(
        harness.activeTimers.size,
        0
    );

});

test("rejects identifiable authentication failure", async () => {

    const rejectionMessages = [
        "Password incorrect, please enter password:",
        "Too many failed login attempts!"
    ];

    for (const rejectionMessage of rejectionMessages) {

        const harness = createHarness();
        const connection =
            harness.client.connect(CONNECTION_OPTIONS);

        harness.socket.data(
            "Please enter password:\r\n"
        );
        harness.socket.data(
            `${rejectionMessage}\r\n`
        );

        await assert.rejects(
            connection,
            {
                message:
                    "7 Days to Die authentication was rejected."
            }
        );

    }

});

test("clears timer and attempt listeners after success", async () => {

    const harness = createHarness();
    const connection =
        harness.client.connect(CONNECTION_OPTIONS);

    emitReadyHandshake(harness.socket);
    await connection;

    assert.strictEqual(
        harness.activeTimers.size,
        0
    );
    assert.strictEqual(
        harness.clearedTimers.length,
        1
    );
    assert.strictEqual(
        harness.socket.listenerCount("data"),
        0
    );

});

test("clears timer and listeners after failure", async () => {

    const harness = createHarness();
    const connection =
        harness.client.connect(CONNECTION_OPTIONS);

    harness.socket.fail(new Error("Failure."));

    await assert.rejects(connection);

    assert.strictEqual(
        harness.activeTimers.size,
        0
    );
    assert.strictEqual(
        harness.socket.listenerCount("data"),
        0
    );
    assert.strictEqual(
        harness.socket.listenerCount("error"),
        0
    );
    assert.strictEqual(
        harness.socket.listenerCount("close"),
        0
    );

});

test("disconnect before connect is safe and idempotent", async () => {

    const harness = createHarness();

    await harness.client.disconnect();
    await harness.client.disconnect();

    assert.strictEqual(
        harness.socket.destroyCount,
        0
    );

});

test("disconnect after partial startup is safe", async () => {

    const socket = new FakeSocket({
        autoCloseOnDestroy: false
    });
    const harness = createHarness({
        socket
    });
    const connection =
        harness.client.connect(CONNECTION_OPTIONS);

    await harness.client.disconnect();

    await assert.rejects(
        connection,
        {
            message:
                "7 Days to Die connection closed before readiness."
        }
    );
    assert.strictEqual(socket.destroyCount, 1);

    await harness.client.disconnect();

});

test("disconnect after readiness awaits socket closure", async () => {

    const socket = new FakeSocket({
        autoCloseOnDestroy: false
    });
    const harness = createHarness({
        socket
    });
    const connection =
        harness.client.connect(CONNECTION_OPTIONS);

    emitReadyHandshake(socket);
    await connection;

    let disconnected = false;
    const disconnection =
        harness.client.disconnect().then(() => {
            disconnected = true;
        });

    await Promise.resolve();

    assert.strictEqual(disconnected, false);
    assert.strictEqual(socket.destroyCount, 1);

    socket.close();
    await disconnection;

    assert.strictEqual(disconnected, true);

    await harness.client.disconnect();

    assert.strictEqual(socket.destroyCount, 1);

});

test("propagates a generic disconnection failure", async () => {

    const socket = new FakeSocket({
        autoCloseOnDestroy: false,
        destroy() {
            socket.fail(
                new Error("test-password")
            );
        }
    });
    const harness = createHarness({
        socket
    });
    const connection =
        harness.client.connect(CONNECTION_OPTIONS);

    emitReadyHandshake(socket);
    await connection;

    await assert.rejects(
        harness.client.disconnect(),
        {
            message:
                "7 Days to Die disconnection failed."
        }
    );

});

test("never includes the password in client errors", async () => {

    const harness = createHarness();
    const connection =
        harness.client.connect(CONNECTION_OPTIONS);

    harness.socket.fail(
        new Error(CONNECTION_OPTIONS.password)
    );

    await assert.rejects(
        connection,
        error =>
            !error.message.includes(
                CONNECTION_OPTIONS.password
            )
    );

});
