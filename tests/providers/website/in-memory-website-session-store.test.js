const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");

const InMemoryWebsiteSessionStore = require(
    "../../../src/providers/website/" +
    "InMemoryWebsiteSessionStore"
);

function createIdentity() {
    return {
        actorId: "123456789012345678",
        displayName: "Rogue",
        permissions: []
    };
}

function createHarness({
    absoluteLifetimeMs = 1000,
    idleLifetimeMs = 100,
    maximumSessions = 10000
} = {}) {

    let now = 1000;
    let tokenSequence = 0;
    const store = new InMemoryWebsiteSessionStore({
        absoluteLifetimeMs,
        clock: () => now,
        idleLifetimeMs,
        maximumSessions,
        randomBytesSource(length) {
            tokenSequence += 1;

            return Buffer.alloc(length, tokenSequence);
        }
    });

    return {
        advance(milliseconds) {
            now += milliseconds;
        },
        store
    };

}

test("stores only a digest and returns frozen snapshots", () => {

    const harness = createHarness();
    const identity = createIdentity();
    const created = harness.store.create(identity);
    const tokenKey = createHash("sha256")
        .update(created.token)
        .digest("hex");

    identity.displayName = "Changed";

    assert.strictEqual(
        harness.store.sessions.has(created.token),
        false
    );
    assert.strictEqual(
        harness.store.sessions.has(tokenKey),
        true
    );
    assert.strictEqual(
        JSON.stringify([...harness.store.sessions.values()])
            .includes(created.token),
        false
    );
    assert.strictEqual(Object.isFrozen(created), true);
    assert.strictEqual(
        Object.isFrozen(created.identity),
        true
    );
    assert.strictEqual(
        Object.isFrozen(created.identity.permissions),
        true
    );

    const resolved = harness.store.resolve(created.token);

    assert.deepStrictEqual(resolved, createIdentity());
    assert.notStrictEqual(resolved, created.identity);
    assert.strictEqual(Object.isFrozen(resolved), true);

});

test("refreshes idle activity without extending absolute life", () => {

    const harness = createHarness({
        absoluteLifetimeMs: 250,
        idleLifetimeMs: 100
    });
    const session = harness.store.create(createIdentity());

    harness.advance(90);
    assert.notStrictEqual(
        harness.store.resolve(session.token),
        null
    );
    harness.advance(90);
    assert.notStrictEqual(
        harness.store.resolve(session.token),
        null
    );
    harness.advance(70);

    assert.strictEqual(
        harness.store.resolve(session.token),
        null
    );

});

test("expires idle sessions", () => {

    const harness = createHarness();
    const session = harness.store.create(createIdentity());

    harness.advance(100);

    assert.strictEqual(
        harness.store.resolve(session.token),
        null
    );
    assert.strictEqual(harness.store.count(), 0);

});

test("revocation is idempotent and unknown sessions are absent", () => {

    const harness = createHarness();
    const session = harness.store.create(createIdentity());

    assert.strictEqual(
        harness.store.revoke(session.token),
        true
    );
    assert.strictEqual(
        harness.store.revoke(session.token),
        false
    );
    assert.strictEqual(
        harness.store.resolve(session.token),
        null
    );
    assert.strictEqual(
        harness.store.resolve("unknown-token"),
        null
    );

});

test("enforces capacity without evicting active sessions", () => {

    const harness = createHarness({
        maximumSessions: 2
    });
    const first =
        harness.store.create(createIdentity());
    const second =
        harness.store.create(createIdentity());

    assert.throws(
        () => harness.store.create(createIdentity()),
        {
            message:
                "Website session capacity is exhausted."
        }
    );
    assert.strictEqual(harness.store.count(), 2);
    assert.notStrictEqual(
        harness.store.resolve(first.token),
        null
    );
    assert.notStrictEqual(
        harness.store.resolve(second.token),
        null
    );

});

test("cleans expired sessions before capacity and clears all", () => {

    const harness = createHarness({
        idleLifetimeMs: 10,
        maximumSessions: 1
    });

    harness.store.create(createIdentity());
    harness.advance(10);

    assert.doesNotThrow(() => {
        harness.store.create(createIdentity());
    });

    harness.store.clear();

    assert.strictEqual(harness.store.count(), 0);
    assert.strictEqual(
        createHarness().store.maximumSessions,
        10000
    );

});
