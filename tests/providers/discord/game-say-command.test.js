const assert = require("node:assert/strict");
const test = require("node:test");

const {
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

const GameCommand = require(
    "../../../src/providers/discord/commands/GameCommand"
);
const DiscordGameServerProviderResolver = require(
    "../../../src/providers/discord/services/DiscordGameServerProviderResolver"
);

function createAuthorizer() {
    return {
        getRequiredPermission() {
            return PermissionFlagsBits.ManageGuild;
        },
        isAuthorized() {
            return true;
        }
    };
}

function createInteraction(message = "Server restart in ten minutes.") {
    const deferred = [];
    const edits = [];
    const replies = [];

    return {
        guild: { id: "guild-1" },
        memberPermissions: { has: () => true },
        options: {
            getSubcommand(required) {
                assert.equal(required, true);
                return "say";
            },
            getString(name, required) {
                assert.equal(name, "message");
                assert.equal(required, true);
                return message;
            }
        },
        deferred,
        edits,
        replies,
        async deferReply(payload) {
            deferred.push(payload);
        },
        async editReply(payload) {
            edits.push(payload);
        },
        async reply(payload) {
            replies.push(payload);
        }
    };
}

function createAvailableResolver(executeCommand) {
    return {
        resolve() {
            return {
                available: true,
                service: { executeCommand },
                status:
                    DiscordGameServerProviderResolver.Status.AVAILABLE
            };
        }
    };
}

test("defines the required bounded game say message option", () => {
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createAvailableResolver(async () => ({}))
    });

    const data = command.data.toJSON();
    const say = data.options.find(option => option.name === "say");

    assert.ok(say);
    assert.equal(say.options.length, 1);
    assert.equal(say.options[0].name, "message");
    assert.equal(say.options[0].required, true);
    assert.equal(say.options[0].min_length, 1);
    assert.equal(say.options[0].max_length, 200);
});

test("executes only the fixed quoted say command", async () => {
    const commands = [];
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createAvailableResolver(
            async remoteCommand => {
                commands.push(remoteCommand);
                return { status: "SUCCESS" };
            }
        )
    });
    const interaction = createInteraction("Welcome to Rogue Soldiers!");

    await command.execute(interaction);

    assert.deepEqual(commands, [
        "say \"Welcome to Rogue Soldiers!\""
    ]);
    assert.deepEqual(interaction.replies, []);
    assert.deepEqual(interaction.deferred, [{
        flags: MessageFlags.Ephemeral
    }]);
    assert.deepEqual(interaction.edits, [{
        content: "The message was sent to the 7 Days to Die server."
    }]);
});

test("rejects unsafe messages before Provider resolution", async () => {
    const unsafeMessages = [
        "",
        " leading",
        "trailing ",
        "contains \"quotes\"",
        "contains\\backslash",
        "line\nbreak",
        "a".repeat(201)
    ];

    for (const message of unsafeMessages) {
        let resolutions = 0;
        const command = new GameCommand({
            gameCommandAuthorizer: createAuthorizer(),
            gameServerProviderResolver: {
                resolve() {
                    resolutions += 1;
                    return null;
                }
            }
        });
        const interaction = createInteraction(message);

        await command.execute(interaction);

        assert.equal(resolutions, 0);
        assert.deepEqual(interaction.deferred, []);
        assert.equal(interaction.replies.length, 1);
        assert.match(
            interaction.replies[0].content,
            /must be 1-200 characters/
        );
        assert.equal(
            interaction.replies[0].flags,
            MessageFlags.Ephemeral
        );
    }
});

test("does not execute say when the Provider is unavailable", async () => {
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: {
            resolve() {
                return {
                    available: false,
                    status:
                        DiscordGameServerProviderResolver.Status.PROVIDER_UNAVAILABLE
                };
            }
        }
    });
    const interaction = createInteraction();

    await command.execute(interaction);

    assert.deepEqual(interaction.deferred, []);
    assert.deepEqual(interaction.edits, []);
    assert.deepEqual(interaction.replies, [{
        content: "7 Days to Die server control is unavailable.",
        flags: MessageFlags.Ephemeral
    }]);
});

test("reports a safe failure when the say result is not successful", async () => {
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createAvailableResolver(
            async () => ({ status: "TIMEOUT" })
        )
    });
    const interaction = createInteraction();

    await command.execute(interaction);

    assert.deepEqual(interaction.edits, [{
        content: "Unable to send the message to the 7 Days to Die server."
    }]);
});
