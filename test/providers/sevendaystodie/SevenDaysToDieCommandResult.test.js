const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const SevenDaysToDieCommandCompletionReason = require(
    "../../../src/providers/sevendaystodie/" +
    "SevenDaysToDieCommandCompletionReason"
);
const SevenDaysToDieCommandResult = require(
    "../../../src/providers/sevendaystodie/" +
    "SevenDaysToDieCommandResult"
);
const SevenDaysToDieCommandStatus = require(
    "../../../src/providers/sevendaystodie/" +
    "SevenDaysToDieCommandStatus"
);

const FIXTURE_DIRECTORY = path.join(
    __dirname,
    "fixtures"
);

function createResult(overrides = {}) {

    return new SevenDaysToDieCommandResult({
        command: "gettime",
        status: SevenDaysToDieCommandStatus.SUCCESS,
        responseLines: ["Day 1, 11:40"],
        eventLines: [
            "2026-07-27T22:12:24 INF Time: 51.86m FPS: 20.00"
        ],
        startedAt: "2026-07-27T22:12:19.000Z",
        completedAt: "2026-07-27T22:12:19.100Z",
        completionReason:
            SevenDaysToDieCommandCompletionReason.MATCHED_RULE,
        truncated: false,
        ...overrides
    });

}

test("exports frozen command status and completion contracts", () => {

    assert.equal(Object.isFrozen(SevenDaysToDieCommandStatus), true);
    assert.equal(
        Object.isFrozen(SevenDaysToDieCommandCompletionReason),
        true
    );
    assert.deepEqual(
        Object.values(SevenDaysToDieCommandStatus),
        ["SUCCESS", "ERROR", "TIMEOUT", "DISCONNECTED"]
    );
    assert.deepEqual(
        Object.values(SevenDaysToDieCommandCompletionReason),
        [
            "MATCHED_RULE",
            "INVALID_COMMAND",
            "INACTIVITY",
            "TIMEOUT",
            "DISCONNECTED",
            "SIZE_LIMIT"
        ]
    );

});

test("creates a frozen defensive command result", () => {

    const responseLines = ["Day 1, 11:40"];
    const eventLines = ["INF Time: 51.86m FPS: 20.00"];
    const result = createResult({ responseLines, eventLines });

    responseLines.push("mutated response");
    eventLines.push("mutated event");

    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.responseLines), true);
    assert.equal(Object.isFrozen(result.eventLines), true);
    assert.deepEqual(result.responseLines, ["Day 1, 11:40"]);
    assert.deepEqual(result.eventLines, [
        "INF Time: 51.86m FPS: 20.00"
    ]);
    assert.equal(result.startedAt, "2026-07-27T22:12:19.000Z");
    assert.equal(result.completedAt, "2026-07-27T22:12:19.100Z");

});

test("rejects invalid command result values", () => {

    assert.throws(
        () => createResult({ command: " gettime " }),
        /command must be a non-empty trimmed string/
    );
    assert.throws(
        () => createResult({ status: "UNKNOWN" }),
        /command status is invalid/
    );
    assert.throws(
        () => createResult({ completionReason: "UNKNOWN" }),
        /completion reason is invalid/
    );
    assert.throws(
        () => createResult({ responseLines: [null] }),
        /response lines are invalid/
    );
    assert.throws(
        () => createResult({ eventLines: "not-an-array" }),
        /event lines are invalid/
    );
    assert.throws(
        () => createResult({ startedAt: "not-a-date" }),
        /start timestamp is invalid/
    );
    assert.throws(
        () => createResult({
            completedAt: "2026-07-27T22:12:18.000Z"
        }),
        /completion cannot precede its start/
    );
    assert.throws(
        () => createResult({ truncated: "false" }),
        /truncation state must be boolean/
    );

});

test("stores response lines separately from unsolicited event lines", () => {

    const result = createResult({
        command: "listplayers",
        responseLines: [
            "0. id=171, TestPlayer, health=86, level=1",
            "Total of 1 in the game"
        ],
        eventLines: [
            "2026-07-27T22:11:54 INF Time: 51.36m FPS: 20.00"
        ]
    });

    assert.equal(result.responseLines.length, 2);
    assert.equal(result.eventLines.length, 1);
    assert.match(result.responseLines[1], /Total of 1 in the game/);
    assert.match(result.eventLines[0], /FPS: 20\.00/);

});

test("keeps captured Telnet evidence sanitized and available", () => {

    const fixtureNames = [
        "gettime.txt",
        "invalid-command.txt",
        "listplayers-empty.txt",
        "listplayers-one.txt",
        "multiline-help.txt",
        "say-with-chat-event.txt",
        "unsolicited-events.txt"
    ];
    const combined = fixtureNames.map(name => {
        const location = path.join(FIXTURE_DIRECTORY, name);
        assert.equal(fs.existsSync(location), true);
        return fs.readFileSync(location, "utf8");
    }).join("\n");

    assert.match(combined, /Day 1, 11:40/);
    assert.match(combined, /Total of 0 in the game/);
    assert.match(combined, /Total of 1 in the game/);
    assert.match(combined, /unknown command/);
    assert.match(combined, /Description: Sends a message/);
    assert.match(combined, /Chat \(from '-non-player-'/);
    assert.match(combined, /VehicleManager saving/);

    assert.equal(combined.includes("RubbaDuckie"), false);
    assert.equal(combined.includes("76561198324839127"), false);
    assert.equal(
        combined.includes("0002c60901644d5dbbe98aa9575f6d65"),
        false
    );
    assert.equal(combined.includes("192.168.1.139"), false);

});
