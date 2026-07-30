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

const TEST_USER_ID = "EOS_0002c60901644d5dbbe98aa9575f6d65";

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

function assertMatched(decision) {
    assert.deepEqual(decision, {
        completed: true,
        completionReason:
            SevenDaysToDieCommandCompletionReason.MATCHED_RULE
    });
}

test("completes whitelist add on the verified success line", () => {

    const rules = new SevenDaysToDieCommandCompletionRules();
    const decider = rules.createDecider(
        `whitelist add ${TEST_USER_ID} RubbaDuckie`
    );

    assert.deepEqual(decider({
        latestLine:
            "2026-07-30T19:15:16 INF Executing command " +
            "'whitelist add' by Telnet"
    }), { completed: false });
    assertMatched(decider({
        latestLine: `${TEST_USER_ID} added to whitelist.`
    }));

});

test("completes whitelist remove on success or verified not-found", () => {

    const rules = new SevenDaysToDieCommandCompletionRules();

    assertMatched(rules.createDecider(
        `whitelist remove ${TEST_USER_ID}`
    )({
        latestLine: `${TEST_USER_ID} removed from the whitelist.`
    }));
    assertMatched(rules.createDecider(
        `whitelist remove ${TEST_USER_ID}`
    )({
        latestLine: `${TEST_USER_ID} was not on the whitelist.`
    }));

});

test("does not complete on mode, reload, path, or server activity noise", () => {

    const rules = new SevenDaysToDieCommandCompletionRules();
    const addDecider = rules.createDecider(
        `whitelist add ${TEST_USER_ID} RubbaDuckie`
    );
    const removeDecider = rules.createDecider(
        `whitelist remove ${TEST_USER_ID}`
    );
    const noise = [
        "Whitelist only mode has been ACTIVATED!",
        "Whitelist only mode has been DISABLED!",
        "2026-07-30T19:15:17 INF Reloading serveradmin.xml",
        "2026-07-30T19:15:17 INF Loading permissions file at " +
            "'C:\\Users\\example\\serveradmin.xml'",
        "2026-07-30T19:15:21 INF EntityBackpack id 239, plyrId 171",
        "2026-07-30T19:15:23 INF Time: 21.73m FPS: 20.00"
    ];

    for (const latestLine of noise) {
        assert.deepEqual(addDecider({ latestLine }), { completed: false });
        assert.deepEqual(removeDecider({ latestLine }), { completed: false });
    }

});

test("does not apply whitelist completion to other command actions", () => {

    const rules = new SevenDaysToDieCommandCompletionRules();

    assert.deepEqual(
        rules.createDecider("whitelist list")({
            latestLine: `${TEST_USER_ID} added to whitelist.`
        }),
        { completed: false }
    );
    assert.deepEqual(
        rules.createDecider("ban remove " + TEST_USER_ID)({
            latestLine: `${TEST_USER_ID} removed from the whitelist.`
        }),
        { completed: false }
    );

});

test("command service completes add before activation and reload output", async () => {

    const { service, socket } = createService();
    const command = `whitelist add ${TEST_USER_ID} RubbaDuckie`;
    const resultPromise = service.executeCommand(command);

    assert.deepEqual(socket.writes, [`${command}\r\n`]);

    socket.emit("data", Buffer.from(
        "2026-07-30T19:15:16 INF Executing command '" + command +
        "' by Telnet\r\n" +
        `${TEST_USER_ID} added to whitelist.\r\n` +
        "Whitelist only mode has been ACTIVATED!\r\n" +
        "2026-07-30T19:15:17 INF Reloading serveradmin.xml\r\n"
    ));

    const result = await resultPromise;

    assert.equal(result.status, SevenDaysToDieCommandStatus.SUCCESS);
    assert.equal(
        result.completionReason,
        SevenDaysToDieCommandCompletionReason.MATCHED_RULE
    );
    assert.deepEqual(result.responseLines, [
        "2026-07-30T19:15:16 INF Executing command '" + command +
            "' by Telnet",
        `${TEST_USER_ID} added to whitelist.`
    ]);
    assert.deepEqual(result.eventLines, []);

});

test("command service waits through disable before remove completion", async () => {

    const { service, socket } = createService();
    const command = `whitelist remove ${TEST_USER_ID}`;
    const resultPromise = service.executeCommand(command);

    assert.deepEqual(socket.writes, [`${command}\r\n`]);

    socket.emit("data", Buffer.from(
        "2026-07-30T19:19:02 INF Executing command '" + command +
        "' by Telnet\r\n" +
        "Whitelist only mode has been DISABLED!\r\n" +
        `${TEST_USER_ID} removed from the whitelist.\r\n` +
        "2026-07-30T19:19:03 INF Reloading serveradmin.xml\r\n"
    ));

    const result = await resultPromise;

    assert.equal(result.status, SevenDaysToDieCommandStatus.SUCCESS);
    assert.equal(
        result.completionReason,
        SevenDaysToDieCommandCompletionReason.MATCHED_RULE
    );
    assert.deepEqual(result.responseLines, [
        "2026-07-30T19:19:02 INF Executing command '" + command +
            "' by Telnet",
        "Whitelist only mode has been DISABLED!",
        `${TEST_USER_ID} removed from the whitelist.`
    ]);
    assert.deepEqual(result.eventLines, []);

});
