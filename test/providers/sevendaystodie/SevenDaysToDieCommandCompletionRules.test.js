const test = require("node:test");
const assert = require("node:assert/strict");

const SevenDaysToDieCommandCompletionReason = require(
    "../../../src/providers/sevendaystodie/" +
    "SevenDaysToDieCommandCompletionReason"
);
const SevenDaysToDieCommandCompletionRules = require(
    "../../../src/providers/sevendaystodie/" +
    "SevenDaysToDieCommandCompletionRules"
);

function decide(command, lines) {

    const rules = new SevenDaysToDieCommandCompletionRules();
    const decider = rules.createDecider(command);
    let decision = null;

    for (const latestLine of lines) {
        decision = decider({ latestLine, lines });
    }

    return decision;
}

test("completes gettime only on its verified response line", () => {

    const pending = decide("gettime", [
        "2026-07-27T22:12:19 INF Executing command 'gettime' by Telnet"
    ]);
    const complete = decide("gettime", [
        "2026-07-27T22:12:19 INF Executing command 'gettime' by Telnet",
        "Day 1, 11:40"
    ]);

    assert.deepEqual(pending, { completed: false });
    assert.deepEqual(complete, {
        completed: true,
        completionReason:
            SevenDaysToDieCommandCompletionReason.MATCHED_RULE
    });

});

test("completes listplayers and lp on the total line", () => {

    for (const command of ["listplayers", "lp"]) {
        const complete = decide(command, [
            "0. id=171, TestPlayer, health=86, level=1",
            "Total of 1 in the game"
        ]);

        assert.deepEqual(complete, {
            completed: true,
            completionReason:
                SevenDaysToDieCommandCompletionReason.MATCHED_RULE
        });
    }

});

test("completes kick on the verified success line", () => {

    const pending = decide(
        "kick 171 \"RSF evidence test\"",
        [
            "2026-07-29T19:44:15 INF Executing command " +
            "'kick 171 \"RSF evidence test\"' by Terminal Window"
        ]
    );
    const complete = decide(
        "kick 171 \"RSF evidence test\"",
        ["Kicking Player TestPlayer: RSF evidence test"]
    );

    assert.deepEqual(pending, { completed: false });
    assert.deepEqual(complete, {
        completed: true,
        completionReason:
            SevenDaysToDieCommandCompletionReason.MATCHED_RULE
    });

});

test("completes kick on the verified invalid-target rejection", () => {

    const complete = decide(
        "kick 171 \"RSF stale entity evidence test\"",
        ["\"171\" is not a valid entity id, player name or user id."]
    );

    assert.deepEqual(complete, {
        completed: true,
        completionReason:
            SevenDaysToDieCommandCompletionReason.MATCHED_RULE
    });

});

test("does not complete kick on later disconnect cleanup noise", () => {

    const pending = decide(
        "kick 171 \"RSF evidence test\"",
        [
            "2026-07-29T19:44:15 INF PlayerDisconnected EntityID=171",
            "2026-07-29T19:44:16 WRN DisconnectClient: Player not found",
            "UnityEngine.StackTraceUtility:ExtractStackTrace ()"
        ]
    );

    assert.deepEqual(pending, { completed: false });

});

test("completes ban add on verified Steam or EOS success lines", () => {

    for (const responseLine of [
        "Steam_76561198324839127 banned until " +
            "2026-07-29 22:31:50, reason: RSF evidence test.",
        "EOS_0002c60901644d5dbbe98aa9575f6d65 banned until " +
            "2026-07-29 21:49:54, reason: RSF evidence test."
    ]) {
        const complete = decide(
            "ban add Steam_76561198324839127 3 minutes " +
                "\"RSF evidence test\" \"RubbaDuckie\"",
            [responseLine]
        );

        assert.deepEqual(complete, {
            completed: true,
            completionReason:
                SevenDaysToDieCommandCompletionReason.MATCHED_RULE
        });
    }

});

test("completes ban add on verified invalid-target rejection", () => {

    const complete = decide(
        "ban add MissingPlayer 3 minutes \"RSF evidence test\"",
        [
            "\"MissingPlayer\" is not a valid entity id, player name or " +
            "user id."
        ]
    );

    assert.deepEqual(complete, {
        completed: true,
        completionReason:
            SevenDaysToDieCommandCompletionReason.MATCHED_RULE
    });

});

test("does not complete ban add on kick, reload, or disconnect noise", () => {

    const pending = decide(
        "ban add Steam_76561198324839127 3 minutes " +
            "\"RSF evidence test\" \"RubbaDuckie\"",
        [
            "Kicking player (Banned until: 2026-07-29 22:31:50, " +
                "reason: RSF evidence test): EntityID=171",
            "2026-07-29T22:28:50 INF Reloading serveradmin.xml",
            "2026-07-29T22:28:50 INF PlayerDisconnected EntityID=171",
            "UnityEngine.StackTraceUtility:ExtractStackTrace ()"
        ]
    );

    assert.deepEqual(pending, { completed: false });

});

test("does not apply ban add completion rules to ban remove", () => {

    const pending = decide(
        "ban remove Steam_76561198324839127",
        [
            "Steam_76561198324839127 banned until " +
            "2026-07-29 22:31:50, reason: RSF evidence test."
        ]
    );

    assert.deepEqual(pending, { completed: false });

});

test("completes say only on the matching non-player chat event", () => {

    const rules = new SevenDaysToDieCommandCompletionRules();
    const decider = rules.createDecider(
        "say \"RSF command-response test\""
    );

    assert.deepEqual(decider({
        latestLine:
            "2026-07-27T22:13:43 INF Chat (from '-non-player-', " +
            "entity id '-1', to 'Global'): different message"
    }), { completed: false });
    assert.deepEqual(decider({
        latestLine:
            "2026-07-27T22:13:43 INF Chat (from '-non-player-', " +
            "entity id '-1', to 'Global'): RSF command-response test"
    }), {
        completed: true,
        completionReason:
            SevenDaysToDieCommandCompletionReason.MATCHED_RULE
    });

});

test("completes help after description and the following blank line", () => {

    const rules = new SevenDaysToDieCommandCompletionRules();
    const decider = rules.createDecider("help say");

    assert.deepEqual(decider({
        latestLine: "*** Command(s): say ***"
    }), { completed: false });
    assert.deepEqual(decider({
        latestLine: "No detailed help available."
    }), { completed: false });
    assert.deepEqual(decider({
        latestLine: "Description: Sends a message to all connected clients"
    }), { completed: false });
    assert.deepEqual(decider({ latestLine: "" }), {
        completed: true,
        completionReason:
            SevenDaysToDieCommandCompletionReason.MATCHED_RULE
    });

});

test("completes every command immediately on verified unknown command", () => {

    const complete = decide("thiscommanddoesnotexist", [
        "*** ERROR: unknown command 'thiscommanddoesnotexist'"
    ]);

    assert.deepEqual(complete, {
        completed: true,
        completionReason:
            SevenDaysToDieCommandCompletionReason.INVALID_COMMAND
    });

});

test("does not treat unrelated server events as command completion", () => {

    const pending = decide("gettime", [
        "2026-07-27T22:12:24 INF Time: 51.86m FPS: 20.00",
        "2026-07-27T22:14:05 INF Entity animalRabbit killed by zombieBowler",
        "2026-07-27T22:15:19 INF VehicleManager saving 0 (0 + 0)"
    ]);

    assert.deepEqual(pending, { completed: false });

});

test("returns frozen decisions and validates command and line input", () => {

    const rules = new SevenDaysToDieCommandCompletionRules();
    const decider = rules.createDecider("gettime");
    const decision = decider({ latestLine: "Day 1, 11:40" });

    assert.equal(Object.isFrozen(decision), true);
    assert.throws(
        () => rules.createDecider(" gettime "),
        /non-empty single trimmed line/
    );
    assert.throws(
        () => decider({ latestLine: null }),
        /completion line must be a string/
    );

});
