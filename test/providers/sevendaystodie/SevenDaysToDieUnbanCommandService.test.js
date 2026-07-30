const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");

const SevenDaysToDieCommandCompletionReason = require(
    "../../../src/providers/sevendaystodie/" +
    "SevenDaysToDieCommandCompletionReason"
);
const SevenDaysToDieCommandCompletionRules = require(
    "../../../src/providers/sevendaystodie/" +
    "SevenDaysToDieCommandCompletionRules"
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

test("completes ban remove only on the verified response line", () => {

    const rules = new SevenDaysToDieCommandCompletionRules();
    const decider = rules.createDecider(
        "ban remove EOS_0002c60901644d5dbbe98aa9575f6d65"
    );

    assert.deepEqual(decider({
        latestLine:
            "2026-07-29T22:22:07 INF Executing command 'ban remove' by Telnet"
    }), { completed: false });
    assert.deepEqual(decider({
        latestLine:
            "EOS_0002c60901644d5dbbe98aa9575f6d65 removed from ban list."
    }), {
        completed: true,
        completionReason:
            SevenDaysToDieCommandCompletionReason.MATCHED_RULE
    });

});

test("does not apply ban remove completion to ban add or ban list", () => {

    const rules = new SevenDaysToDieCommandCompletionRules();
    const response =
        "Steam_76561198324839127 removed from ban list.";

    assert.deepEqual(
        rules.createDecider(
            "ban add Steam_76561198324839127 3 minutes \"Reason\" \"Player\""
        )({ latestLine: response }),
        { completed: false }
    );
    assert.deepEqual(
        rules.createDecider("ban list")({ latestLine: response }),
        { completed: false }
    );

});

test("completes command service before reload and cleanup output", async () => {

    const { service, socket } = createService();
    const command =
        "ban remove EOS_0002c60901644d5dbbe98aa9575f6d65";
    const resultPromise = service.executeCommand(command);

    assert.deepEqual(socket.writes, [`${command}\r\n`]);

    socket.emit("data", Buffer.from(
        "2026-07-29T22:22:07 INF Executing command '" + command +
        "' by Telnet\r\n" +
        "EOS_0002c60901644d5dbbe98aa9575f6d65 removed from ban list.\r\n" +
        "2026-07-29T22:22:08 INF Reloading serveradmin.xml\r\n" +
        "UnityEngine.StackTraceUtility:ExtractStackTrace ()\r\n"
    ));

    const result = await resultPromise;

    assert.equal(result.status, SevenDaysToDieCommandStatus.SUCCESS);
    assert.equal(
        result.completionReason,
        SevenDaysToDieCommandCompletionReason.MATCHED_RULE
    );
    assert.deepEqual(result.responseLines, [
        "2026-07-29T22:22:07 INF Executing command '" + command +
        "' by Telnet",
        "EOS_0002c60901644d5dbbe98aa9575f6d65 removed from ban list."
    ]);
    assert.deepEqual(result.eventLines, []);

});

test("does not treat a success-looking removal as verified unban", () => {

    const rules = new SevenDaysToDieCommandCompletionRules();
    const decision = rules.createDecider(
        "ban remove Steam_76561198324839127"
    )({
        latestLine:
            "Steam_76561198324839127 removed from ban list."
    });

    assert.deepEqual(decision, {
        completed: true,
        completionReason:
            SevenDaysToDieCommandCompletionReason.MATCHED_RULE
    });

    // This proves command completion only. The Discord unban workflow must
    // still execute ban list afterward and verify that the entry is absent.
});
