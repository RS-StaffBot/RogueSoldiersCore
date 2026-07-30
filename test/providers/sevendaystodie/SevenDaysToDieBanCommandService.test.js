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
    }

    write(value) {
        this.writes.push(value);
    }

}

function createService() {

    const socket = new FakeSocket();
    const service = new SevenDaysToDieCommandService({
        client: { ready: true, socket },
        commandTimeoutMs: 1000,
        inactivityTimeoutMs: 10
    });

    return { service, socket };
}

test("completes ban add on the verified terminal line", async () => {

    const { service, socket } = createService();
    const command =
        "ban add Steam_76561198324839127 3 minutes " +
        "\"RSF evidence test\" \"RubbaDuckie\"";
    const resultPromise = service.executeCommand(command);

    assert.deepEqual(socket.writes, [`${command}\r\n`]);

    socket.emit("data", Buffer.from(
        "2026-07-29T22:28:44 INF Executing command '" +
        command + "' by Telnet\r\n" +
        "Steam_76561198324839127 banned until " +
        "2026-07-29 22:31:44, reason: RSF evidence test.\r\n" +
        "2026-07-29T22:28:44 INF Reloading serveradmin.xml\r\n" +
        "2026-07-29T22:28:44 INF PlayerDisconnected EntityID=171\r\n" +
        "UnityEngine.StackTraceUtility:ExtractStackTrace ()\r\n"
    ));

    const result = await resultPromise;

    assert.equal(result.status, SevenDaysToDieCommandStatus.SUCCESS);
    assert.equal(
        result.completionReason,
        SevenDaysToDieCommandCompletionReason.MATCHED_RULE
    );
    assert.deepEqual(result.responseLines, [
        "2026-07-29T22:28:44 INF Executing command '" +
            command + "' by Telnet",
        "Steam_76561198324839127 banned until " +
            "2026-07-29 22:31:44, reason: RSF evidence test."
    ]);
    assert.deepEqual(result.eventLines, []);

});

test("completes ban add on an EOS-normalized success line", async () => {

    const { service, socket } = createService();
    const command =
        "ban add Steam_76561198324839127 1 minute " +
        "\"RSF evidence test\" \"RubbaDuckie\"";
    const resultPromise = service.executeCommand(command);

    socket.emit("data", Buffer.from(
        "2026-07-29T21:48:54 INF Executing command '" +
        command + "' by Telnet\r\n" +
        "2026-07-29T21:48:54 INF Kicking player " +
        "(Banned until: 2026-07-29 21:49:54, " +
        "reason: RSF evidence test): EntityID=171\r\n" +
        "EOS_0002c60901644d5dbbe98aa9575f6d65 banned until " +
        "2026-07-29 21:49:54, reason: RSF evidence test.\r\n"
    ));

    const result = await resultPromise;

    assert.equal(result.status, SevenDaysToDieCommandStatus.SUCCESS);
    assert.deepEqual(result.responseLines, [
        "2026-07-29T21:48:54 INF Executing command '" +
            command + "' by Telnet",
        "2026-07-29T21:48:54 INF Kicking player " +
            "(Banned until: 2026-07-29 21:49:54, " +
            "reason: RSF evidence test): EntityID=171",
        "EOS_0002c60901644d5dbbe98aa9575f6d65 banned until " +
            "2026-07-29 21:49:54, reason: RSF evidence test."
    ]);

});

test("completes ban add on verified invalid-target rejection", async () => {

    const { service, socket } = createService();
    const command =
        "ban add MissingPlayer 3 minutes \"RSF evidence test\"";
    const resultPromise = service.executeCommand(command);

    socket.emit("data", Buffer.from(
        "2026-07-29T22:30:00 INF Executing command '" +
        command + "' by Telnet\r\n" +
        "\"MissingPlayer\" is not a valid entity id, player name or " +
        "user id.\r\n"
    ));

    const result = await resultPromise;

    assert.equal(result.status, SevenDaysToDieCommandStatus.SUCCESS);
    assert.equal(
        result.completionReason,
        SevenDaysToDieCommandCompletionReason.MATCHED_RULE
    );
    assert.equal(
        result.responseLines.at(-1),
        "\"MissingPlayer\" is not a valid entity id, player name or " +
            "user id."
    );

});
