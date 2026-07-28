const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");

const SevenDaysToDieTelnetClient = require(
    "../../../src/providers/sevendaystodie/" +
    "SevenDaysToDieTelnetClient"
);

class FakeSocket extends EventEmitter {

    constructor() {
        super();
        this.closed = false;
        this.destroyed = false;
        this.writes = [];
    }

    write(value) {
        this.writes.push(value);
    }

    destroy() {
        this.destroyed = true;
        this.closed = true;
        this.emit("close");
    }

}

function createClient() {

    const socket = new FakeSocket();
    const timers = [];
    const client = new SevenDaysToDieTelnetClient({
        clearConnectionTimeout: timer => {
            const index = timers.indexOf(timer);
            if (index >= 0) {
                timers.splice(index, 1);
            }
        },
        createSocket: () => socket,
        setConnectionTimeout: callback => {
            timers.push(callback);
            return callback;
        }
    });

    return { client, socket, timers };

}

function createOptions() {

    return {
        host: "127.0.0.1",
        port: 8081,
        password: "test-only-password",
        connectionTimeoutMs: 5000
    };

}

test("becomes ready when 7DTD opens directly into the console", async () => {

    const { client, socket } = createClient();
    const connection = client.connect(createOptions());

    socket.emit("data", Buffer.from(
        "*** Connected with 7DTD server.\r\n" +
        "*** Server version: V 3.1.0 (b13)\r\n" +
        "Server port: 26900\r\n" +
        "Press 'help' to get a list of all commands. " +
        "Press 'exit' to end session.\r\n"
    ));

    await connection;

    assert.equal(client.ready, true);
    assert.equal(client.passwordSent, false);
    assert.deepEqual(socket.writes, []);

});

test("does not treat the first direct-console marker alone as ready", async () => {

    const { client, socket, timers } = createClient();
    const connection = client.connect(createOptions());

    socket.emit("data", "*** Connected with 7DTD server.\r\n");

    assert.equal(client.ready, false);
    assert.equal(timers.length, 1);

    socket.emit("data", Buffer.from(
        "Press 'help' to get a list of all commands. " +
        "Press 'exit' to end session.\r\n"
    ));

    await connection;
    assert.equal(client.ready, true);

});

test("preserves password-protected Telnet authentication", async () => {

    const { client, socket } = createClient();
    const connection = client.connect(createOptions());

    socket.emit("data", "Please enter password:\r\n");

    assert.deepEqual(socket.writes, ["test-only-password\r\n"]);
    assert.equal(client.ready, false);

    socket.emit("data", Buffer.from(
        "Logon successful.\r\n" +
        "*** Connected with 7DTD server.\r\n"
    ));

    await connection;

    assert.equal(client.ready, true);
    assert.equal(client.authenticationAccepted, true);

});
