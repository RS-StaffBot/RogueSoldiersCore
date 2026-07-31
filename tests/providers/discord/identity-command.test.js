const { test } = require("node:test");
const assert = require("node:assert/strict");

const IdentityCommand = require(
    "../../../src/providers/discord/commands/IdentityCommand"
);

function createInteraction({
    guild = {},
    status = { linked: false },
    userId = "123456789012345678"
} = {}) {
    const replies = [];
    return {
        interaction: {
            guild,
            options: {
                getSubcommand() {
                    return "status";
                }
            },
            async reply(payload) {
                replies.push(payload);
            },
            user: { id: userId }
        },
        replies,
        resolver: {
            resolve() {
                return {
                    available: true,
                    service: {
                        getOwnStatus(discordUserId) {
                            assert.strictEqual(discordUserId, userId);
                            return status;
                        },
                        recordVerifiedSelfLink() {
                            throw new Error(
                                "Status must not create identity links."
                            );
                        }
                    }
                };
            }
        }
    };
}

test("defines guild-only private identity commands", () => {

    const setup = createInteraction();
    const command = new IdentityCommand({
        identityModuleResolver: setup.resolver
    });
    const definition = command.data.toJSON();

    assert.strictEqual(definition.name, "identity");
    assert.strictEqual(definition.dm_permission, false);
    assert.deepStrictEqual(
        definition.options.map(option => option.name),
        ["status", "link"]
    );
    const link = definition.options.find(
        option => option.name === "link"
    );
    assert.deepStrictEqual(
        link.options.map(option => option.name),
        ["user-id"]
    );
    assert.strictEqual(link.options[0].required, true);

});

test("returns private unlinked and verified owner status", async () => {

    for (const entry of [
        {
            status: { linked: false },
            expected: "You do not currently have a linked game identity."
        },
        {
            status: { linked: true, status: "VERIFIED" },
            expected: "Your game identity is verified and linked."
        },
        {
            status: { linked: true, status: "PENDING" },
            expected: "Your game identity link is pending verification."
        }
    ]) {
        const setup = createInteraction({ status: entry.status });
        const command = new IdentityCommand({
            identityModuleResolver: setup.resolver
        });

        await command.execute(setup.interaction);

        assert.strictEqual(setup.replies.length, 1);
        assert.strictEqual(setup.replies[0].content, entry.expected);
        assert.ok(setup.replies[0].flags);
        assert.strictEqual(
            setup.replies[0].content.includes("Steam_"),
            false
        );
        assert.strictEqual(
            setup.replies[0].content.includes("EOS_"),
            false
        );
    }

});

test("fails privately for unavailable and malformed status", async () => {

    const unavailableReplies = [];
    const unavailable = new IdentityCommand({
        identityModuleResolver: {
            resolve() {
                return { available: false };
            }
        }
    });
    await unavailable.execute({
        guild: {},
        options: { getSubcommand: () => "status" },
        reply: async payload => unavailableReplies.push(payload),
        user: { id: "123456789012345678" }
    });
    assert.match(unavailableReplies[0].content, /currently unavailable/u);
    assert.ok(unavailableReplies[0].flags);

    const malformed = createInteraction({ status: { secret: true } });
    const command = new IdentityCommand({
        identityModuleResolver: malformed.resolver
    });
    await command.execute(malformed.interaction);
    assert.strictEqual(
        malformed.replies[0].content,
        "Unable to read your identity-link status right now."
    );

});

test("rejects direct messages and invalid boundaries", async () => {

    const setup = createInteraction({ guild: null });
    const command = new IdentityCommand({
        identityModuleResolver: setup.resolver
    });

    await command.execute(setup.interaction);
    assert.strictEqual(
        setup.replies[0].content,
        "This command can only be used in a server."
    );
    assert.ok(setup.replies[0].flags);

    assert.throws(
        () => new IdentityCommand(),
        /resolver boundary is invalid/u
    );

});
