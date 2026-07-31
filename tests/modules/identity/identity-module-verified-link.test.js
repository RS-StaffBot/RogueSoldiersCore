const { test } = require("node:test");
const assert = require("node:assert/strict");

const IdentityModule = require(
    "../../../src/modules/identity/IdentityModule"
);
const IdentityLinkStatus = require(
    "../../../src/modules/identity/IdentityLinkStatus"
);
const InMemoryIdentityStore = require(
    "../../../src/modules/identity/persistence/" +
    "InMemoryIdentityStore"
);

const VERIFIED_PROOF = Object.freeze({
    verified: true,
    outcome: "VERIFIED"
});

test("records a first verified self-link after exact proof", () => {

    const store = new InMemoryIdentityStore();
    const identity = new IdentityModule({ store });
    const verifiedAt = new Date("2026-07-31T02:40:00.000Z");

    const link = identity.recordVerifiedSelfLink({
        discordUserId: "123456789012345678",
        gameUserId: "Steam_76561198324839127",
        verification: VERIFIED_PROOF,
        verifiedAt
    });

    assert.strictEqual(link.id, "identity-link-1");
    assert.strictEqual(
        link.discordUserId,
        "123456789012345678"
    );
    assert.strictEqual(
        link.gameUserId,
        "Steam_76561198324839127"
    );
    assert.strictEqual(link.status, IdentityLinkStatus.VERIFIED);
    assert.strictEqual(link.createdAt, verifiedAt.toISOString());
    assert.strictEqual(link.verifiedAt, verifiedAt.toISOString());
    assert.strictEqual(link.revokedAt, null);
    assert.strictEqual(Object.isFrozen(link), true);

});

test("rejects unverified, ambiguous, and expanded proof results", () => {

    const identity = new IdentityModule();
    const base = {
        discordUserId: "123456789012345678",
        gameUserId: "EOS_0002c60901644d5dbbe98aa9575f6d65"
    };

    const invalidProofs = [
        null,
        { verified: false, outcome: "NOT_VERIFIED" },
        { verified: false, outcome: "AMBIGUOUS" },
        {
            verified: true,
            outcome: "VERIFIED",
            gameUserId: base.gameUserId
        }
    ];

    invalidProofs.forEach(verification => {
        assert.throws(
            () => identity.recordVerifiedSelfLink({
                ...base,
                verification
            }),
            /Verified identity proof is required/u
        );
    });

    assert.deepStrictEqual(identity.store.listLinks(), []);

});

test("preserves active Discord and game identity uniqueness", () => {

    const identity = new IdentityModule();

    identity.recordVerifiedSelfLink({
        discordUserId: "123456789012345678",
        gameUserId: "Steam_76561198324839127",
        verification: VERIFIED_PROOF
    });

    assert.throws(
        () => identity.recordVerifiedSelfLink({
            discordUserId: "123456789012345678",
            gameUserId: "EOS_0002c60901644d5dbbe98aa9575f6d65",
            verification: VERIFIED_PROOF
        }),
        /already has an active identity link/u
    );

    assert.throws(
        () => identity.recordVerifiedSelfLink({
            discordUserId: "987654321098765432",
            gameUserId: "Steam_76561198324839127",
            verification: VERIFIED_PROOF
        }),
        /already has an active identity link/u
    );

    assert.strictEqual(identity.store.listLinks().length, 1);

});

test("rejects malformed identity and verification dates", () => {

    const identity = new IdentityModule();

    assert.throws(
        () => identity.recordVerifiedSelfLink({
            discordUserId: " ",
            gameUserId: "Steam_76561198324839127",
            verification: VERIFIED_PROOF
        }),
        /Discord user ID is required/u
    );

    assert.throws(
        () => identity.recordVerifiedSelfLink({
            discordUserId: "123456789012345678",
            gameUserId: "unsafe",
            verification: VERIFIED_PROOF
        }),
        /supported durable prefix/u
    );

    assert.throws(
        () => identity.recordVerifiedSelfLink({
            discordUserId: "123456789012345678",
            gameUserId: "Steam_76561198324839127",
            verification: VERIFIED_PROOF,
            verifiedAt: new Date("invalid")
        }),
        /verification date is invalid/u
    );

    assert.deepStrictEqual(identity.store.listLinks(), []);

});
