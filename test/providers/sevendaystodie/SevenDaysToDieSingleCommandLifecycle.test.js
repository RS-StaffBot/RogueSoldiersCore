const test = require("node:test");
const assert = require("node:assert/strict");

const SevenDaysToDieSingleCommandLifecycle = require(
    "../../../src/providers/sevendaystodie/" +
    "SevenDaysToDieSingleCommandLifecycle"
);

function createHarness({ ready = true } = {}) {

    const writes = [];
    const timers = [];
    const clearedTimers = [];

    const lifecycle = new SevenDaysToDieSingleCommandLifecycle({
        clearCommandTimeout: timer => {
            clearedTimers.push(timer);
        },
        isReady: () => ready,
        setCommandTimeout: (callback, delay) => {
            const timer = { callback, delay };
            timers.push(timer);
            return timer;
        },
        write: value => {
            writes.push(value);
        }
    });

    return {
        clearedTimers,
        lifecycle,
        timers,
        writes
    };

}

test("rejects command execution before readiness", async () => {

    const { lifecycle, writes } = createHarness({ ready: false });

    await assert.rejects(
        lifecycle.execute("gettime", {
            completionDecider: () => ({ completed: false }),
            timeoutMs: 1000
        }),
        /must be ready before command execution/
    );

    assert.deepEqual(writes, []);
    assert.equal(lifecycle.hasActiveCommand(), false);

});

test("writes one command and completes through the decider", async () => {

    const {
        clearedTimers,
        lifecycle,
        timers,
        writes
    } = createHarness();

    const resultPromise = lifecycle.execute("gettime", {
        completionDecider: ({ latestLine }) => ({
            completed: latestLine === "Day 1, 11:40",
            result: "matched"
        }),
        timeoutMs: 1500
    });

    assert.deepEqual(writes, ["gettime\r\n"]);
    assert.equal(timers[0].delay, 1500);
    assert.equal(lifecycle.hasActiveCommand(), true);

    assert.deepEqual(
        lifecycle.acceptLines([
            "2026-07-27 INF Executing command 'gettime' by Telnet",
            "Day 1, 11:40"
        ]),
        []
    );

    assert.equal(await resultPromise, "matched");
    assert.equal(lifecycle.hasActiveCommand(), false);
    assert.deepEqual(clearedTimers, [timers[0]]);

});

test("prevents a second simultaneous command", async () => {

    const { lifecycle } = createHarness();

    const first = lifecycle.execute("gettime", {
        completionDecider: ({ latestLine }) => ({
            completed: latestLine === "done"
        }),
        timeoutMs: 1000
    });

    await assert.rejects(
        lifecycle.execute("listplayers", {
            completionDecider: () => ({ completed: false }),
            timeoutMs: 1000
        }),
        /already has a command in progress/
    );

    lifecycle.acceptLines(["done"]);
    assert.deepEqual(await first, ["done"]);

});

test("returns lines received after completion as unconsumed", async () => {

    const { lifecycle } = createHarness();

    const resultPromise = lifecycle.execute("gettime", {
        completionDecider: ({ latestLine }) => ({
            completed: latestLine === "Day 1, 11:40"
        }),
        timeoutMs: 1000
    });

    const unconsumed = lifecycle.acceptLines([
        "Day 1, 11:40",
        "2026-07-27 INF Time: 51.86m FPS: 20.00"
    ]);

    assert.deepEqual(await resultPromise, ["Day 1, 11:40"]);
    assert.deepEqual(unconsumed, [
        "2026-07-27 INF Time: 51.86m FPS: 20.00"
    ]);
    assert.equal(Object.isFrozen(unconsumed), true);

});

test("fails and clears active state on timeout", async () => {

    const {
        clearedTimers,
        lifecycle,
        timers
    } = createHarness();

    const resultPromise = lifecycle.execute("gettime", {
        completionDecider: () => ({ completed: false }),
        timeoutMs: 1000
    });

    timers[0].callback();

    await assert.rejects(resultPromise, /command timed out/);
    assert.equal(lifecycle.hasActiveCommand(), false);
    assert.deepEqual(clearedTimers, [timers[0]]);

});

test("fails safely on write, disconnect, and decision errors", async () => {

    const writeFailure = new SevenDaysToDieSingleCommandLifecycle({
        isReady: () => true,
        write: () => {
            throw new Error("private transport detail");
        }
    });

    await assert.rejects(
        writeFailure.execute("gettime", {
            completionDecider: () => ({ completed: false }),
            timeoutMs: 1000
        }),
        /command write failed/
    );

    const disconnectHarness = createHarness();
    const disconnected = disconnectHarness.lifecycle.execute("gettime", {
        completionDecider: () => ({ completed: false }),
        timeoutMs: 1000
    });

    disconnectHarness.lifecycle.handleDisconnect();
    await assert.rejects(disconnected, /disconnected during command execution/);

    const decisionHarness = createHarness();
    const failedDecision = decisionHarness.lifecycle.execute("gettime", {
        completionDecider: () => {
            throw new Error("private classifier detail");
        },
        timeoutMs: 1000
    });

    decisionHarness.lifecycle.acceptLines(["line"]);
    await assert.rejects(
        failedDecision,
        /command completion decision failed/
    );

});

test("validates construction, execution, and received lines", () => {

    assert.throws(
        () => new SevenDaysToDieSingleCommandLifecycle(),
        /readiness check must be a function/
    );

    const { lifecycle } = createHarness();

    assert.throws(
        () => lifecycle.execute(" gettime ", {
            completionDecider: () => ({ completed: false }),
            timeoutMs: 1000
        }),
        /non-empty single trimmed line/
    );
    assert.throws(
        () => lifecycle.execute("gettime\nshutdown", {
            completionDecider: () => ({ completed: false }),
            timeoutMs: 1000
        }),
        /non-empty single trimmed line/
    );
    assert.throws(
        () => lifecycle.execute("gettime", {
            completionDecider: null,
            timeoutMs: 1000
        }),
        /completion decider must be a function/
    );
    assert.throws(
        () => lifecycle.execute("gettime", {
            completionDecider: () => ({ completed: false }),
            timeoutMs: 0
        }),
        /timeout must be a positive safe integer/
    );
    assert.throws(
        () => lifecycle.acceptLines([null]),
        /must be an array of strings/
    );

});
