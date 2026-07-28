const test = require("node:test");
const assert = require("node:assert/strict");

const SevenDaysToDieCommandCompletionReason = require(
    "../../../src/providers/sevendaystodie/" +
    "SevenDaysToDieCommandCompletionReason"
);
const SevenDaysToDieCommandFailureResultFactory = require(
    "../../../src/providers/sevendaystodie/" +
    "SevenDaysToDieCommandFailureResultFactory"
);
const SevenDaysToDieCommandFailureType = require(
    "../../../src/providers/sevendaystodie/" +
    "SevenDaysToDieCommandFailureType"
);
const SevenDaysToDieCommandStatus = require(
    "../../../src/providers/sevendaystodie/" +
    "SevenDaysToDieCommandStatus"
);

function createFailure(failureType, overrides = {}) {
    return new SevenDaysToDieCommandFailureResultFactory().create({
        command: "gettime",
        failureType,
        responseLines: ["partial response"],
        eventLines: ["INF Time: 51.86m FPS: 20.00"],
        startedAt: "2026-07-27T22:12:19.000Z",
        completedAt: "2026-07-27T22:12:20.000Z",
        ...overrides
    });
}

test("maps timeout failures to timeout results", () => {
    const result = createFailure(SevenDaysToDieCommandFailureType.TIMEOUT);
    assert.equal(result.status, SevenDaysToDieCommandStatus.TIMEOUT);
    assert.equal(
        result.completionReason,
        SevenDaysToDieCommandCompletionReason.TIMEOUT
    );
    assert.deepEqual(result.responseLines, ["partial response"]);
    assert.deepEqual(result.eventLines, ["INF Time: 51.86m FPS: 20.00"]);
});

test("maps disconnect failures to disconnected results", () => {
    const result = createFailure(
        SevenDaysToDieCommandFailureType.DISCONNECTED
    );
    assert.equal(result.status, SevenDaysToDieCommandStatus.DISCONNECTED);
    assert.equal(
        result.completionReason,
        SevenDaysToDieCommandCompletionReason.DISCONNECTED
    );
});

test("maps write and completion failures to execution errors", () => {
    for (const failureType of [
        SevenDaysToDieCommandFailureType.WRITE_ERROR,
        SevenDaysToDieCommandFailureType.COMPLETION_ERROR
    ]) {
        const result = createFailure(failureType);
        assert.equal(result.status, SevenDaysToDieCommandStatus.ERROR);
        assert.equal(
            result.completionReason,
            SevenDaysToDieCommandCompletionReason.EXECUTION_ERROR
        );
    }
});

test("marks size-limit failures as truncated", () => {
    const result = createFailure(
        SevenDaysToDieCommandFailureType.SIZE_LIMIT
    );
    assert.equal(result.status, SevenDaysToDieCommandStatus.ERROR);
    assert.equal(
        result.completionReason,
        SevenDaysToDieCommandCompletionReason.SIZE_LIMIT
    );
    assert.equal(result.truncated, true);
});

test("preserves explicit truncation for other failures", () => {
    const result = createFailure(
        SevenDaysToDieCommandFailureType.DISCONNECTED,
        { truncated: true }
    );
    assert.equal(result.truncated, true);
});

test("exports frozen failure types and rejects unknown failures", () => {
    assert.equal(Object.isFrozen(SevenDaysToDieCommandFailureType), true);
    assert.throws(
        () => createFailure("UNKNOWN"),
        /command failure type is invalid/
    );
});
