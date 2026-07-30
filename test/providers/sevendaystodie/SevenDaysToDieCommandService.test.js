const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");

const SevenDaysToDieCommandCompletionReason = require(
    "../../../src/providers/sevendaystodie/" +
    "SevenDaysToDieCommandCompletionReason"
);
const SevenDaysToDieCommandService = require(
    "../../../src/providers/sevendaystodie/" +
    "SevenDaysToDieCommandService"
);
const SevenDaysToDieCommandStatus = require(
    "../../../src/providers/sevendaystodie/" +
    "SevenDaysToDieCommandStatus"
);

class FakeSocket extends EventEmitter {

    constructor() {
        super();
        this.writes = [];
        this.throwOnWrite = false;
    }

    write(value) {
        if (this.throwOnWrite) {
            throw new Error("write failed");
        }
        this.writes.push(value);
    }

}

function createService(overrides = {}) {

    const socket = new FakeSocket();
    const client = { ready: true, socket };
    const service = new SevenDaysToDieCommandService({
        client,
        commandTimeoutMs: 1000,
        inactivityTimeoutMs: 10,
        ...overrides
    });

    return { client, service, socket };

}

test("executes gettime and returns separated immutable output", async () => {

    const { service, socket } = createService();
    const resultPromise = service.executeCommand("gettime");

    assert.deepEqual(socket.writes, ["gettime\r\n"]);

    socket.emit("data", Buffer.from(
        "2026-07-27T22:12:19 3109.544 INF Executing command " +
        "'gettime' by Telnet from 127.0.0.1:65290\r\n" +
        "Day 1, 11:40\r\n" +
        "2026-07-27T22:12:24 3114.544 INF Time: 51.86m " +
        "FPS: 20.00\r\n"
    ));

    const result = await resultPromise;

    assert.equal(result.status, SevenDaysToDieCommandStatus.SUCCESS);
    assert.equal(
        result.completionReason,
        SevenDaysToDieCommandCompletionReason.MATCHED_RULE
    );
    assert.deepEqual(result.responseLines, [
        "2026-07-27T22:12:19 3109.544 INF Executing command " +
        "'gettime' by Telnet from 127.0.0.1:65290",
        "Day 1, 11:40"
    ]);
    assert.deepEqual(result.eventLines, []);
    assert.equal(Object.isFrozen(result), true);

});

test("completes kick before disconnect cleanup output", async () => {

    const { service, socket } = createService();
    const resultPromise = service.executeCommand(
        "kick 171 \"RSF evidence test\""
    );

    assert.deepEqual(socket.writes, [
        "kick 171 \"RSF evidence test\"\r\n"
    ]);

    socket.emit("data", Buffer.from(
        "2026-07-29T19:44:15 INF Executing command " +
        "'kick 171 \"RSF evidence test\"' by Telnet\r\n" +
        "Kicking Player TestPlayer: RSF evidence test\r\n" +
        "2026-07-29T19:44:15 INF PlayerDisconnected EntityID=171\r\n" +
        "2026-07-29T19:44:16 WRN DisconnectClient: Player not found\r\n" +
        "UnityEngine.StackTraceUtility:ExtractStackTrace ()\r\n"
    ));

    const result = await resultPromise;

    assert.equal(result.status, SevenDaysToDieCommandStatus.SUCCESS);
    assert.equal(
        result.completionReason,
        SevenDaysToDieCommandCompletionReason.MATCHED_RULE
    );
    assert.deepEqual(result.responseLines, [
        "2026-07-29T19:44:15 INF Executing command " +
        "'kick 171 \"RSF evidence test\"' by Telnet",
        "Kicking Player TestPlayer: RSF evidence test"
    ]);
    assert.deepEqual(result.eventLines, []);

});

test("completes kick on invalid offline entity target", async () => {

    const { service, socket } = createService();
    const resultPromise = service.executeCommand(
        "kick 171 \"RSF stale entity evidence test\""
    );

    socket.emit("data", Buffer.from(
        "2026-07-29T20:29:40 INF Executing command " +
        "'kick 171 \"RSF stale entity evidence test\"' by Telnet\r\n" +
        "\"171\" is not a valid entity id, player name or user id.\r\n"
    ));

    const result = await resultPromise;

    assert.equal(result.status, SevenDaysToDieCommandStatus.SUCCESS);
    assert.equal(
        result.completionReason,
        SevenDaysToDieCommandCompletionReason.MATCHED_RULE
    );
    assert.deepEqual(result.responseLines, [
        "2026-07-29T20:29:40 INF Executing command " +
        "'kick 171 \"RSF stale entity evidence test\"' by Telnet",
        "\"171\" is not a valid entity id, player name or user id."
    ]);

});

test("keeps matching say chat with the command response", async () => {

    const { service, socket } = createService();
    const resultPromise = service.executeCommand(
        "say \"RSF command-response test\""
    );

    socket.emit("data", Buffer.from(
        "2026-07-27T22:13:43 3193.967 INF Executing command " +
        "'say \"RSF command-response test\"' by Telnet from " +
        "127.0.0.1:65290\r\n" +
        "2026-07-27T22:13:43 3193.968 INF Chat " +
        "(from '-non-player-', entity id '-1', to 'Global'): " +
        "RSF command-response test\r\n"
    ));

    const result = await resultPromise;

    assert.equal(result.status, SevenDaysToDieCommandStatus.SUCCESS);
    assert.match(result.responseLines.at(-1), /RSF command-response test$/u);
    assert.deepEqual(result.eventLines, []);

});

test("uses inactivity fallback for an unverified multiline command", async () => {

    const { service, socket } = createService();
    const resultPromise = service.executeCommand("version");

    socket.emit("data", Buffer.from("Game version A22\r\nBuild 123\r\n"));

    const result = await resultPromise;

    assert.equal(result.status, SevenDaysToDieCommandStatus.SUCCESS);
    assert.equal(
        result.completionReason,
        SevenDaysToDieCommandCompletionReason.INACTIVITY
    );
    assert.deepEqual(result.responseLines, [
        "Game version A22",
        "Build 123"
    ]);

});

test("returns timeout, disconnect, and write failure results", async () => {

    const timers = [];
    const { service, socket } = createService({
        clearTimer: () => {},
        setTimer: callback => {
            timers.push(callback);
            return callback;
        }
    });

    const timeoutPromise = service.executeCommand("gettime");
    timers[0]();
    const timeoutResult = await timeoutPromise;
    assert.equal(timeoutResult.status, SevenDaysToDieCommandStatus.TIMEOUT);

    const disconnectPromise = service.executeCommand("gettime");
    socket.emit("close");
    const disconnectResult = await disconnectPromise;
    assert.equal(
        disconnectResult.status,
        SevenDaysToDieCommandStatus.DISCONNECTED
    );

    socket.throwOnWrite = true;
    const writeResult = await service.executeCommand("gettime");
    assert.equal(writeResult.status, SevenDaysToDieCommandStatus.ERROR);
    assert.equal(
        writeResult.completionReason,
        SevenDaysToDieCommandCompletionReason.EXECUTION_ERROR
    );

});

test("rejects unavailable transport and simultaneous execution", async () => {

    const { client, service } = createService();
    client.ready = false;

    await assert.rejects(
        service.executeCommand("gettime"),
        /must be ready/
    );

    client.ready = true;
    const first = service.executeCommand("gettime");

    await assert.rejects(
        service.executeCommand("listplayers"),
        /already has a command in progress/
    );

    client.socket.emit("close");
    await first;

});
