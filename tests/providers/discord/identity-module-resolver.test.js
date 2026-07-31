const { test } = require("node:test");
const assert = require("node:assert/strict");

const ComponentState = require(
    "../../../src/core/ComponentState"
);
const DiscordIdentityModuleResolver = require(
    "../../../src/providers/discord/services/" +
    "DiscordIdentityModuleResolver"
);

test("resolves a running Identity Module through a narrow boundary", () => {

    const calls = [];
    const identity = {
        name: "Identity",
        state: ComponentState.RUNNING,
        getOwnStatus(discordUserId) {
            calls.push(["status", discordUserId]);
            return { linked: false };
        },
        recordVerifiedSelfLink(input) {
            calls.push(["link", input]);
            return { status: "VERIFIED" };
        },
        store: { secret: true }
    };
    const resolver = new DiscordIdentityModuleResolver({
        resolveModule: name => {
            assert.strictEqual(name, "Identity");
            return identity;
        }
    });

    const resolution = resolver.resolve();

    assert.strictEqual(resolution.available, true);
    assert.strictEqual(
        resolution.status,
        DiscordIdentityModuleResolver.Status.AVAILABLE
    );
    assert.deepStrictEqual(
        Object.keys(resolution.service).sort(),
        ["getOwnStatus", "recordVerifiedSelfLink"]
    );
    assert.strictEqual("store" in resolution.service, false);
    assert.deepStrictEqual(
        resolution.service.getOwnStatus("123"),
        { linked: false }
    );
    resolution.service.recordVerifiedSelfLink({ proof: true });
    assert.deepStrictEqual(calls, [
        ["status", "123"],
        ["link", { proof: true }]
    ]);
    assert.strictEqual(Object.isFrozen(resolution), true);
    assert.strictEqual(Object.isFrozen(resolution.service), true);

});

test("fails safely for missing, stopped, and invalid Identity Modules", () => {

    const cases = [
        {
            module: undefined,
            status: DiscordIdentityModuleResolver.Status.MODULE_UNAVAILABLE
        },
        {
            module: {
                name: "Identity",
                state: ComponentState.READY,
                getOwnStatus() {},
                recordVerifiedSelfLink() {}
            },
            status: DiscordIdentityModuleResolver.Status.MODULE_NOT_READY
        },
        {
            module: {
                name: "Wrong",
                state: ComponentState.RUNNING,
                getOwnStatus() {},
                recordVerifiedSelfLink() {}
            },
            status:
                DiscordIdentityModuleResolver.Status.INVALID_MODULE_BOUNDARY
        },
        {
            module: {
                name: "Identity",
                state: ComponentState.RUNNING,
                getOwnStatus() {}
            },
            status:
                DiscordIdentityModuleResolver.Status.INVALID_MODULE_BOUNDARY
        }
    ];

    for (const entry of cases) {
        const resolver = new DiscordIdentityModuleResolver({
            resolveModule: () => entry.module
        });
        assert.deepStrictEqual(
            resolver.resolve(),
            Object.freeze({
                available: false,
                status: entry.status
            })
        );
    }

    const throwing = new DiscordIdentityModuleResolver({
        resolveModule: () => {
            throw new Error("private failure");
        }
    });
    assert.strictEqual(
        throwing.resolve().status,
        DiscordIdentityModuleResolver.Status.MODULE_UNAVAILABLE
    );

    assert.throws(
        () => new DiscordIdentityModuleResolver(),
        /resolver must be a function/u
    );

});
