const test = require("node:test");
const assert = require("node:assert/strict");

const SevenDaysToDieConsoleLineClassifier = require(
    "../../../src/providers/sevendaystodie/" +
    "SevenDaysToDieConsoleLineClassifier"
);
const SevenDaysToDieConsoleLineType = require(
    "../../../src/providers/sevendaystodie/" +
    "SevenDaysToDieConsoleLineType"
);

const classifier = new SevenDaysToDieConsoleLineClassifier();

const STATUS_LINE =
    "2026-07-27T22:12:24 3114.544 INF Time: 51.86m FPS: 20.00 " +
    "Heap: 1601.2MB";
const ENTITY_LINE =
    "2026-07-27T22:14:05 3215.821 INF Entity animalRabbit 192 " +
    "killed by zombieBowler 191";
const SAVE_LINE =
    "2026-07-27T22:13:19 3170.117 INF VehicleManager saving 0 (0 + 0)";
const SAVED_LINE =
    "2026-07-27T22:13:19 3170.119 INF DroneManager saved 9 bytes";
const DECO_LINE =
    "2026-07-27T22:13:19 3170.283 INF [DECO] written 75800, in 16ms";
const CHAT_LINE =
    "2026-07-27T22:13:43 3193.968 INF Chat (from '-non-player-', " +
    "entity id '-1', to 'Global'): RSF command-response test";

test("exports frozen console line types", () => {

    assert.equal(Object.isFrozen(SevenDaysToDieConsoleLineType), true);
    assert.deepEqual(
        Object.values(SevenDaysToDieConsoleLineType),
        ["RESPONSE", "EVENT"]
    );

});

test("classifies captured unsolicited server activity as events", () => {

    for (const line of [
        STATUS_LINE,
        ENTITY_LINE,
        SAVE_LINE,
        SAVED_LINE,
        DECO_LINE,
        CHAT_LINE
    ]) {
        assert.equal(
            classifier.classify(line),
            SevenDaysToDieConsoleLineType.EVENT
        );
    }

});

test("keeps verified command output as response lines", () => {

    const responseLines = [
        "2026-07-27T22:12:19 3109.544 INF Executing command 'gettime' " +
            "by Telnet from 127.0.0.1:65290",
        "Day 1, 11:40",
        "0. id=171, TestPlayer, health=86, level=1",
        "Total of 1 in the game",
        "*** Command(s): say ***",
        "No detailed help available.",
        "Description: Sends a message to all connected clients",
        "",
        "*** ERROR: unknown command 'thiscommanddoesnotexist'"
    ];

    for (const line of responseLines) {
        assert.equal(
            classifier.classify(line, { command: "gettime" }),
            SevenDaysToDieConsoleLineType.RESPONSE
        );
    }

});

test("keeps only the matching say chat event with the command response", () => {

    assert.equal(
        classifier.classify(CHAT_LINE, {
            command: "say \"RSF command-response test\""
        }),
        SevenDaysToDieConsoleLineType.RESPONSE
    );

    assert.equal(
        classifier.classify(CHAT_LINE, {
            command: "say \"different message\""
        }),
        SevenDaysToDieConsoleLineType.EVENT
    );

});

test("separates response and event lines into frozen defensive arrays", () => {

    const lines = [
        "Day 1, 11:40",
        STATUS_LINE,
        ENTITY_LINE,
        "Total of 1 in the game"
    ];
    const separated = classifier.separate(lines, {
        command: "listplayers"
    });

    lines.push("mutated");

    assert.equal(Object.isFrozen(separated), true);
    assert.equal(Object.isFrozen(separated.responseLines), true);
    assert.equal(Object.isFrozen(separated.eventLines), true);
    assert.deepEqual(separated.responseLines, [
        "Day 1, 11:40",
        "Total of 1 in the game"
    ]);
    assert.deepEqual(separated.eventLines, [STATUS_LINE, ENTITY_LINE]);

});

test("rejects invalid lines and command context", () => {

    assert.throws(
        () => classifier.classify(null),
        /console line must be a string/
    );
    assert.throws(
        () => classifier.separate(["valid", null]),
        /console lines must be an array of strings/
    );
    assert.throws(
        () => classifier.classify("line", { command: " gettime " }),
        /console command must be null or a non-empty single trimmed line/
    );

});
