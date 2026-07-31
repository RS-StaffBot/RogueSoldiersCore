const { test } = require("node:test");
const assert = require("node:assert/strict");

const IdentityCommand = require(
    "../../../src/providers/discord/commands/IdentityCommand"
);

const DISCORD_USER_ID = "123456789012345678";
const GAME_USER_ID = "Steam_76561198324839127";
const CHALLENGE = "RS-LINK-1234567890ABCDEF12345678";
const EVALUATED_AT = 1785467100000;

function createSetup({
    currentStatus = { linked: false },
    evidence = [{
        challenge: CHALLENGE,
        gameUserId: GAME_USER_ID,
        observedAt: EVALUATED_AT
    }],
    verification = {
        outcome: "VERIFIED",
        verified: true
    }
} = {}) {

    const replies = [];
    const deferred = [];
    const edits = [];
    const records = [];
    const proofRequests = [];

    const command = new IdentityCommand({
        challengeGenerator: () => CHALLENGE,
        clock: () => EVALUATED_AT,
        identityModuleResolver: {
            resolve() {
                return {
                    available: true,
                    service: {
                        getOwnStatus(discordUserId) {
                            assert.strictEqual(
                                discordUserId,
                                DISCORD_USER_ID
                            );
                            return currentStatus;
                        },
                        recordVerifiedSelfLink(input) {
                            records.push(input);
                            return { status: "VERIFIED" };
                        }
                    }
                };
            }
        },
        identityProofEvaluator: {
            evaluate(input) {
                assert.deepStrictEqual(input, {
                    challenge: CHALLENGE,
                    evidence,
                    evaluatedAt: EVALUATED_AT,
                    gameUserId: GAME_USER_ID
                });
                return verification;
            }
        },
        identityProofProviderResolver: {
            resolve() {
                return {
                    available: true,
                    service: {
                        async collectIdentityProof(input) {
                            proofRequests.push(input);
                            return evidence;
                        }
                    }
                };
            }
        }
    });

    const interaction = {
        guild: { id: "guild-1" },
        user: { id: DISCORD_USER_ID },
        options: {
            getSubcommand(required) {
                assert.strictEqual(required, true);
                return "link";
            },
            getString(name, required) {
                assert.strictEqual(name, "user-id");
                assert.strictEqual(required, true);
                return GAME_USER_ID;
            }
        },
        async reply(payload) {
            replies.push(payload);
        },
        async deferReply(payload) {
            deferred.push(payload);
        },
        async editReply(payload) {
            edits.push(payload);
        }
    };

    return {
        command,
        deferred,
        edits,
        interaction,
        proofRequests,
        records,
        replies
    };

}

test("verifies and records one private self-link", async () => {

    const setup = createSetup();

    await setup.command.execute(setup.interaction);

    assert.strictEqual(setup.replies.length, 0);
    assert.strictEqual(setup.deferred.length, 1);
    assert.ok(setup.deferred[0].flags);
    assert.strictEqual(setup.edits.length, 2);
    assert.match(setup.edits[0].content, new RegExp(CHALLENGE, "u"));
    assert.strictEqual(
        setup.edits[0].content.includes(GAME_USER_ID),
        false
    );
    assert.strictEqual(
        setup.edits[1].content,
        "Your game identity was verified and linked successfully."
    );
    assert.deepStrictEqual(setup.proofRequests, [{
        challenge: CHALLENGE,
        gameUserId: GAME_USER_ID
    }]);
    assert.strictEqual(setup.records.length, 1);
    assert.strictEqual(
        setup.records[0].discordUserId,
        DISCORD_USER_ID
    );
    assert.strictEqual(setup.records[0].gameUserId, GAME_USER_ID);
    assert.deepStrictEqual(
        setup.records[0].verification,
        { outcome: "VERIFIED", verified: true }
    );
    assert.strictEqual(
        setup.records[0].verifiedAt.toISOString(),
        new Date(EVALUATED_AT).toISOString()
    );

});

test("does not create a link without exact verified proof", async () => {

    const setup = createSetup({
        evidence: [],
        verification: {
            outcome: "NOT_VERIFIED",
            verified: false
        }
    });

    await setup.command.execute(setup.interaction);

    assert.strictEqual(setup.records.length, 0);
    assert.strictEqual(
        setup.edits.at(-1).content,
        "Identity verification was not completed. No link was created."
    );

});

test("rejects an existing link before proof collection", async () => {

    const setup = createSetup({
        currentStatus: {
            linked: true,
            status: "VERIFIED"
        }
    });

    await setup.command.execute(setup.interaction);

    assert.strictEqual(setup.proofRequests.length, 0);
    assert.strictEqual(setup.records.length, 0);
    assert.strictEqual(
        setup.replies[0].content,
        "You already have an active game identity link."
    );
    assert.ok(setup.replies[0].flags);

});

test("fails privately for unsafe IDs and unavailable proof", async () => {

    const setup = createSetup();
    setup.interaction.options.getString = () => "unsafe";

    await setup.command.execute(setup.interaction);

    assert.match(setup.replies[0].content, /Steam_ or EOS_/u);
    assert.ok(setup.replies[0].flags);
    assert.strictEqual(setup.proofRequests.length, 0);

    const unavailable = createSetup();
    unavailable.command.identityProofProviderResolver = {
        resolve() {
            return { available: false };
        }
    };

    await unavailable.command.execute(unavailable.interaction);

    assert.match(
        unavailable.replies[0].content,
        /currently unavailable/u
    );
    assert.strictEqual(unavailable.proofRequests.length, 0);

});

test("does not expose platform IDs when collection throws", async () => {

    const setup = createSetup();
    setup.command.identityProofProviderResolver = {
        resolve() {
            return {
                available: true,
                service: {
                    async collectIdentityProof() {
                        throw new Error(
                            `Raw failure for ${GAME_USER_ID}`
                        );
                    }
                }
            };
        }
    };

    await setup.command.execute(setup.interaction);

    const finalMessage = setup.edits.at(-1).content;
    assert.match(finalMessage, /could not be completed/u);
    assert.strictEqual(finalMessage.includes("Steam_"), false);
    assert.strictEqual(finalMessage.includes("EOS_"), false);
    assert.strictEqual(setup.records.length, 0);

});
