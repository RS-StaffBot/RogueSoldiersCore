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
                return "players";
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

test("executes listplayers through the resolved Provider service", async () => {
    const commands = [];
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createAvailableResolver(
            async remoteCommand => {
                commands.push(remoteCommand);
                return {
                    responseLines: [
                        "listplayers",
                        "0. id=171, TestPlayer, pos=(-133.4, 73.0, 495.7), remote=True, health=86, ip=192.0.2.10",
                        "Total of 1 in the game"
                    ]
                };
            }
        )
    });
    const interaction = createInteraction();

    await command.execute(interaction);

    assert.deepEqual(commands, ["listplayers"]);
    assert.deepEqual(interaction.replies, []);
    assert.deepEqual(interaction.deferred, [{
        flags: MessageFlags.Ephemeral
    }]);
    assert.deepEqual(interaction.edits, [{
        content: "Players online (1): TestPlayer"
    }]);
});

test("reports an empty server without exposing raw output", async () => {
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createAvailableResolver(
            async () => ({
                responseLines: [
                    "listplayers",
                    "Total of 0 in the game"
                ]
            })
        )
    });
    const interaction = createInteraction();

    await command.execute(interaction);

    assert.deepEqual(interaction.edits, [{
        content: "No players are currently in the 7 Days to Die server."
    }]);
});

test("does not execute listplayers when the Provider is unavailable", async () => {
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

test("reports malformed player output safely", async () => {
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createAvailableResolver(
            async () => ({
                responseLines: [
                    "0. id=171, TestPlayer, ip=192.0.2.10",
                    "Total of 2 in the game"
                ]
            })
        )
    });
    const interaction = createInteraction();

    await command.execute(interaction);

    assert.deepEqual(interaction.edits, [{
        content: "Unable to read the current 7 Days to Die player list."
    }]);
});

test("parses only player names and verified totals", () => {
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createAvailableResolver(async () => ({}))
    });

    assert.deepEqual(
        command.parsePlayers({
            responseLines: [
                "0. id=171, Alpha, pos=(0, 0, 0), ip=192.0.2.10",
                "1. id=172, Bravo, pos=(1, 1, 1), ip=192.0.2.11",
                "Total of 2 in the game"
            ]
        }),
        {
            names: ["Alpha", "Bravo"],
            total: 2
        }
    );
    assert.equal(
        command.parsePlayers({
            responseLines: ["unexpected output"]
        }),
        null
    );
    assert.equal(command.parsePlayers(null), null);
});
