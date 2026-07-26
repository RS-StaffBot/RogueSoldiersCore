const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");

const InMemoryWebsiteOAuthStateStore = require(
    "../../../src/providers/website/" +
    "InMemoryWebsiteOAuthStateStore"
);

function createHarness({
    lifetimeMs = 600000,
    maximumAttempts = 1024
} = {}) {

    let now = 1000;
    const store = new InMemoryWebsiteOAuthStateStore({
        clock: () => now,
        lifetimeMs,
        maximumAttempts
    });

    return {
        advance(milliseconds) {
            now += milliseconds;
        },
        store
    };

}

test("stores digests and consumes one matching attempt", () => {

    const harness = createHarness();
    const state = "state-value";
    const browserBinding = "binding-value";

    const snapshot = harness.store.save({
        browserBinding,
        codeVerifier: "verifier-value",
        state
    });
    const key = createHash("sha256")
        .update(state)
        .digest("hex");
    const record = harness.store.attempts.get(key);

    assert.deepStrictEqual(snapshot, {
        createdAt: 1000,
        expiresAt: 601000
    });
    assert.strictEqual(Object.isFrozen(snapshot), true);
    assert.strictEqual(
        record.browserBindingDigest.equals(
            createHash("sha256")
                .update(browserBinding)
                .digest()
        ),
        true
    );
    assert.strictEqual(
        harness.store.attempts.has(state),
        false
    );
    assert.deepStrictEqual(
        harness.store.consume(state, browserBinding),
        {
            codeVerifier: "verifier-value",
            createdAt: 1000,
            expiresAt: 601000
        }
    );
    assert.strictEqual(harness.store.count(), 0);
    assert.strictEqual(
        harness.store.consume(state, browserBinding),
        null
    );

});

test("binding mismatch does not consume the attempt", () => {

    const harness = createHarness();

    harness.store.save({
        browserBinding: "correct-binding",
        codeVerifier: "verifier",
        state: "state"
    });

    assert.strictEqual(
        harness.store.consume("state", "wrong-binding"),
        null
    );
    assert.strictEqual(harness.store.count(), 1);
    assert.notStrictEqual(
        harness.store.consume("state", "correct-binding"),
        null
    );

});

test("expires attempts and rejects unknown state", () => {

    const harness = createHarness({
        lifetimeMs: 100
    });

    harness.store.save({
        browserBinding: "binding",
        codeVerifier: "verifier",
        state: "state"
    });
    harness.advance(100);

    assert.strictEqual(
        harness.store.consume("state", "binding"),
        null
    );
    assert.strictEqual(
        harness.store.consume("unknown", "binding"),
        null
    );
    assert.strictEqual(harness.store.count(), 0);

});

test("enforces capacity without evicting valid attempts", () => {

    const harness = createHarness({
        maximumAttempts: 2
    });

    for (let index = 1; index <= 2; index += 1) {
        harness.store.save({
            browserBinding: `binding-${index}`,
            codeVerifier: `verifier-${index}`,
            state: `state-${index}`
        });
    }

    assert.throws(
        () => harness.store.save({
            browserBinding: "binding-3",
            codeVerifier: "verifier-3",
            state: "state-3"
        }),
        {
            message:
                "Website OAuth state capacity is exhausted."
        }
    );
    assert.strictEqual(harness.store.count(), 2);
    assert.notStrictEqual(
        harness.store.consume("state-1", "binding-1"),
        null
    );

});

test("cleans expired attempts before capacity and clears all", () => {

    const harness = createHarness({
        lifetimeMs: 10,
        maximumAttempts: 1
    });

    harness.store.save({
        browserBinding: "binding-1",
        codeVerifier: "verifier-1",
        state: "state-1"
    });
    harness.advance(10);

    assert.doesNotThrow(() => {
        harness.store.save({
            browserBinding: "binding-2",
            codeVerifier: "verifier-2",
            state: "state-2"
        });
    });

    harness.store.clear();

    assert.strictEqual(harness.store.count(), 0);
    assert.strictEqual(
        new InMemoryWebsiteOAuthStateStore({
            lifetimeMs: 1
        }).maximumAttempts,
        1024
    );

});
