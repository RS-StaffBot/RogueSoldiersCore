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

function createInteraction() {
    const deferred = [];
    const edits = [];
    const replies = [];

    return {
        guild: { id: "guild-1" },
        memberPermissions: { has: () => true },
        options: {
            getSubcommand(required) {
                assert.equal(required, true);
                return "time";
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

test("defines the game time subcommand", () => {
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createAvailableResolver(async () => ({}))
    });

    const data = command.data.toJSON();

    assert.deepEqual(
        data.options.map(option => option.name),
        ["status", "time"]
    );
});

test("executes gettime through the resolved Provider service", async () => {
    const commands = [];
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createAvailableResolver(
            async remoteCommand => {
                commands.push(remoteCommand);
                return {
                    responseLines: [
                        "gettime",
                        "Day 8, 14:25"
                    ]
                };
            }
        )
    });
    const interaction = createInteraction();

    await command.execute(interaction);

    assert.deepEqual(commands, ["gettime"]);
    assert.deepEqual(interaction.replies, []);
    assert.deepEqual(interaction.deferred, [{
        flags: MessageFlags.Ephemeral
    }]);
    assert.deepEqual(interaction.edits, [{
        content: "7 Days to Die time: Day 8, 14:25."
    }]);
});

test("does not execute gettime when the Provider is unavailable", async () => {
    let executions = 0;
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

    assert.equal(executions, 0);
    assert.deepEqual(interaction.deferred, []);
    assert.deepEqual(interaction.edits, []);
    assert.deepEqual(interaction.replies, [{
        content: "7 Days to Die server control is unavailable.",
        flags: MessageFlags.Ephemeral
    }]);
});

test("reports a safe message when gettime has no verified time line", async () => {
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createAvailableResolver(
            async () => ({
                responseLines: ["gettime", "unexpected output"]
            })
        )
    });
    const interaction = createInteraction();

    await command.execute(interaction);

    assert.deepEqual(interaction.edits, [{
        content: "Unable to read the current 7 Days to Die time."
    }]);
});

test("accepts only the verified Day N, HH:MM response format", () => {
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createAvailableResolver(async () => ({}))
    });

    assert.equal(
        command.findTimeLine({
            responseLines: ["Day 1, 00:05"]
        }),
        "Day 1, 00:05"
    );
    assert.equal(
        command.findTimeLine({
            responseLines: ["Day one, midnight"]
        }),
        null
    );
    assert.equal(command.findTimeLine(null), null);
});
