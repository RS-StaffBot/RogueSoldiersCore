const test = require("node:test");
const assert = require("node:assert/strict");

const SevenDaysToDieCommandCompletionReason = require(
    "../../../src/providers/sevendaystodie/" +
    "SevenDaysToDieCommandCompletionReason"
);
const SevenDaysToDieCommandFallbackCompletion = require(
    "../../../src/providers/sevendaystodie/" +
    "SevenDaysToDieCommandFallbackCompletion"
);

test("collects multiline output and completes after inactivity", () => {

    const fallback = new SevenDaysToDieCommandFallbackCompletion();
    const tracker = fallback.createTracker("version");

    assert.deepEqual(
        tracker.acceptLine("Game version: V3.1"),
        { completed: false, lineCount: 1 }
    );
    assert.deepEqual(
        tracker.acceptLine("Compatibility version: V3.1"),
        { completed: false, lineCount: 2 }
    );

    const decision = tracker.completeAfterInactivity();

    assert.equal(decision.completed, true);
    assert.equal(
        decision.completionReason,
        SevenDaysToDieCommandCompletionReason.INACTIVITY
    );
    assert.deepEqual(decision.responseLines, [
        "Game version: V3.1",
        "Compatibility version: V3.1"
    ]);
    assert.equal(Object.isFrozen(decision), true);
    assert.equal(Object.isFrozen(decision.responseLines), true);
    assert.equal(tracker.isSettled(), true);

});

test("preserves blank lines inside multiline output", () => {

    const fallback = new SevenDaysToDieCommandFallbackCompletion();
    const tracker = fallback.createTracker("help version");

    tracker.acceptLine("*** Command(s): version ***");
    tracker.acceptLine("");
    tracker.acceptLine("Description: Shows the game version");

    const decision = tracker.completeAfterInactivity();

    assert.deepEqual(decision.responseLines, [
        "*** Command(s): version ***",
        "",
        "Description: Shows the game version"
    ]);

});

test("does not complete from inactivity before meaningful output", () => {

    const fallback = new SevenDaysToDieCommandFallbackCompletion();
    const tracker = fallback.createTracker("version");

    assert.deepEqual(tracker.completeAfterInactivity(), {
        completed: false
    });

    tracker.acceptLine("");

    assert.deepEqual(tracker.completeAfterInactivity(), {
        completed: false
    });
    assert.equal(tracker.isSettled(), false);

});

test("returns defensive line snapshots", () => {

    const fallback = new SevenDaysToDieCommandFallbackCompletion();
    const tracker = fallback.createTracker("version");

    tracker.acceptLine("first");
    const snapshot = tracker.getLines();
    tracker.acceptLine("second");

    assert.deepEqual(snapshot, ["first"]);
    assert.deepEqual(tracker.getLines(), ["first", "second"]);
    assert.equal(Object.isFrozen(snapshot), true);

});

test("rejects invalid input and use after completion", () => {

    const fallback = new SevenDaysToDieCommandFallbackCompletion();

    assert.throws(
        () => fallback.createTracker(" version "),
        /must be a non-empty single trimmed line/
    );

    const tracker = fallback.createTracker("version");

    assert.throws(
        () => tracker.acceptLine(null),
        /fallback line must be a string/
    );

    tracker.acceptLine("Game version: V3.1");
    tracker.completeAfterInactivity();

    assert.throws(
        () => tracker.acceptLine("late"),
        /already settled/
    );
    assert.throws(
        () => tracker.completeAfterInactivity(),
        /already settled/
    );

});
