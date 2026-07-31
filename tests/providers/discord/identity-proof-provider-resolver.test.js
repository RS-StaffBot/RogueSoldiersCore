const { test } = require("node:test");
const assert = require("node:assert/strict");

const DiscordIdentityProofProviderResolver = require(
    "../../../src/providers/discord/services/" +
    "DiscordIdentityProofProviderResolver"
);

function createProvider(overrides = {}) {
    return {
        collectIdentityProof() {
            return Promise.resolve([]);
        },
        name: "7 Days to Die",
        state: "RUNNING",
        ...overrides
    };
}

test("resolves one running proof Provider through a narrow boundary", async () => {

    const provider = createProvider({
        collectIdentityProof(request) {
            return Promise.resolve([request]);
        },
        secret: "must-not-cross"
    });
    const resolver = new DiscordIdentityProofProviderResolver({
        resolveProvider(name) {
            assert.strictEqual(name, "7 Days to Die");
            return provider;
        }
    });

    const resolution = resolver.resolve();

    assert.strictEqual(resolution.available, true);
    assert.deepStrictEqual(
        Object.keys(resolution.service),
        ["collectIdentityProof"]
    );
    assert.strictEqual(
        Object.hasOwn(resolution.service, "secret"),
        false
    );
    assert.deepStrictEqual(
        await resolution.service.collectIdentityProof({ challenge: "test" }),
        [{ challenge: "test" }]
    );
    assert.strictEqual(Object.isFrozen(resolution), true);
    assert.strictEqual(Object.isFrozen(resolution.service), true);

});

test("fails safely for missing, stopped, and invalid Providers", () => {

    for (const provider of [
        undefined,
        createProvider({ state: "READY" }),
        createProvider({ collectIdentityProof: null }),
        { name: "Wrong", state: "RUNNING" }
    ]) {
        const resolver = new DiscordIdentityProofProviderResolver({
            resolveProvider: () => provider
        });
        const resolution = resolver.resolve();

        assert.strictEqual(resolution.available, false);
        assert.strictEqual(
            Object.hasOwn(resolution, "service"),
            false
        );
        assert.strictEqual(Object.isFrozen(resolution), true);
    }

    const throwing = new DiscordIdentityProofProviderResolver({
        resolveProvider() {
            throw new Error("private Provider failure");
        }
    });
    assert.strictEqual(throwing.resolve().available, false);

    assert.throws(
        () => new DiscordIdentityProofProviderResolver(),
        /resolver must be a function/u
    );

});
