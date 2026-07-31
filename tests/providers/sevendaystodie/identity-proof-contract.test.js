const assert = require("node:assert/strict");
const test = require("node:test");

const SevenDaysToDieIdentityProofContract = require(
    "../../../src/providers/sevendaystodie/identity/" +
    "SevenDaysToDieIdentityProofContract"
);
const SevenDaysToDieIdentityProofEvaluator = require(
    "../../../src/providers/sevendaystodie/identity/" +
    "SevenDaysToDieIdentityProofEvaluator"
);

const evaluatedAt = Date.parse("2026-07-31T02:00:00.000Z");
const challenge = "RSF_identity_AbC12345";

function createEvidence(overrides = {}) {
    return {
        gameUserId: "EOS_abc123",
        challenge,
        observedAt: evaluatedAt - 1000,
        ...overrides
    };
}

test("defines a frozen fail-closed challenge contract", () => {
    assert.equal(Object.isFrozen(SevenDaysToDieIdentityProofContract), true);
    assert.equal(
        SevenDaysToDieIdentityProofContract.method,
        "SHORT_LIVED_IN_GAME_CHALLENGE"
    );
    assert.equal(
        SevenDaysToDieIdentityProofContract
            .currentReadOnlyPlayerListsAreSufficient,
        false
    );
    assert.equal(
        SevenDaysToDieIdentityProofContract.displayNameIsProof,
        false
    );
    assert.equal(
        SevenDaysToDieIdentityProofContract.entityIdIsProof,
        false
    );
    assert.deepEqual(
        SevenDaysToDieIdentityProofContract.allowedEvidenceFields,
        ["gameUserId", "challenge", "observedAt"]
    );
    assert.equal(
        SevenDaysToDieIdentityProofContract
            .temporaryEvidenceRetention,
        "DISCARD_AFTER_EVALUATION"
    );
});

test("verifies exactly one fresh exact durable-ID challenge match", () => {
    const evaluator = new SevenDaysToDieIdentityProofEvaluator();
    const result = evaluator.evaluate({
        gameUserId: "EOS_abc123",
        challenge,
        evidence: [createEvidence()],
        evaluatedAt
    });

    assert.deepEqual(result, {
        verified: true,
        outcome:
            SevenDaysToDieIdentityProofEvaluator.Outcome.VERIFIED
    });
    assert.equal(Object.isFrozen(result), true);
});

test("fails closed for missing, stale, or non-matching evidence", () => {
    const evaluator = new SevenDaysToDieIdentityProofEvaluator();
    const requests = [
        [],
        [createEvidence({
            observedAt:
                evaluatedAt -
                SevenDaysToDieIdentityProofContract
                    .challengeLifetimeMilliseconds -
                1
        })],
        [createEvidence({ gameUserId: "Steam_123" })],
        [createEvidence({ challenge: "different_challenge_123" })]
    ];

    requests.forEach(evidence => {
        assert.deepEqual(
            evaluator.evaluate({
                gameUserId: "EOS_abc123",
                challenge,
                evidence,
                evaluatedAt
            }),
            {
                verified: false,
                outcome:
                    SevenDaysToDieIdentityProofEvaluator
                        .Outcome.NOT_VERIFIED
            }
        );
    });
});

test("rejects ambiguous duplicate proof evidence", () => {
    const evaluator = new SevenDaysToDieIdentityProofEvaluator();

    assert.deepEqual(
        evaluator.evaluate({
            gameUserId: "EOS_abc123",
            challenge,
            evidence: [createEvidence(), createEvidence()],
            evaluatedAt
        }),
        {
            verified: false,
            outcome:
                SevenDaysToDieIdentityProofEvaluator.Outcome.AMBIGUOUS
        }
    );
});

test("rejects unsanitized or future evidence", () => {
    const evaluator = new SevenDaysToDieIdentityProofEvaluator();
    const evidence = [
        {
            ...createEvidence(),
            displayName: "Player One"
        },
        createEvidence({ observedAt: evaluatedAt + 1 })
    ];

    assert.deepEqual(
        evaluator.evaluate({
            gameUserId: "EOS_abc123",
            challenge,
            evidence,
            evaluatedAt
        }),
        {
            verified: false,
            outcome:
                SevenDaysToDieIdentityProofEvaluator
                    .Outcome.NOT_VERIFIED
        }
    );
});

test("validates proof requests before evaluating evidence", () => {
    const evaluator = new SevenDaysToDieIdentityProofEvaluator();

    assert.throws(() => evaluator.evaluate({
        gameUserId: "Player One",
        challenge,
        evidence: [],
        evaluatedAt
    }));
    assert.throws(() => evaluator.evaluate({
        gameUserId: "EOS_abc123",
        challenge: "short",
        evidence: [],
        evaluatedAt
    }));
    assert.throws(() => evaluator.evaluate({
        gameUserId: "EOS_abc123",
        challenge,
        evidence: null,
        evaluatedAt
    }));
    assert.throws(() => evaluator.evaluate({
        gameUserId: "EOS_abc123",
        challenge,
        evidence: [],
        evaluatedAt: 0
    }));
});
