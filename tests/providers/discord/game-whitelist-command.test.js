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

const TEST_USER_ID = "EOS_0002c60901644d5dbbe98aa9575f6d65";

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

function createResolver(executeCommand) {
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

function createInteraction(action, values = {}) {
    const deferred = [];
    const edits = [];
    const replies = [];
    const defaults = {
        "display-name": "TestPlayer",
        "user-id": TEST_USER_ID
    };
    const resolved = { ...defaults, ...values };

    return {
        guild: { id: "guild-1" },
        memberPermissions: { has: () => true },
        options: {
            getSubcommand(required) {
                assert.equal(required, true);
                return action;
            },
            getSubcommandGroup(required) {
                assert.equal(required, false);
                return "whitelist";
            },
            getString(name, required) {
                assert.equal(required, true);
                return resolved[name];
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

test("defines the whitelist add and remove subcommands", () => {
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createResolver(async () => ({}))
    });
    const whitelist = command.data.toJSON().options.find(
        option => option.name === "whitelist"
    );

    assert.ok(whitelist);
    assert.deepEqual(
        whitelist.options.map(option => option.name),
        ["add", "remove"]
    );

    for (const action of whitelist.options) {
        assert.deepEqual(
            action.options.map(option => option.name),
            ["user-id", "display-name"]
        );
    }
});

test("executes the fixed whitelist add command and formats success", async () => {
    const executions = [];
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createResolver(async remoteCommand => {
            executions.push(remoteCommand);
            return {
                status: "SUCCESS",
                responseLines: [
                    `${TEST_USER_ID} added to whitelist.`,
                    "Whitelist only mode has been ACTIVATED!",
                    "private-ip=192.0.2.10"
                ]
            };
        })
    });
    const interaction = createInteraction("add");

    await command.execute(interaction);

    assert.deepEqual(executions, [
        `whitelist add ${TEST_USER_ID} TestPlayer`
    ]);
    assert.deepEqual(interaction.replies, []);
    assert.deepEqual(interaction.deferred, [{
        flags: MessageFlags.Ephemeral
    }]);
    assert.deepEqual(interaction.edits, [{
        content: "Added TestPlayer to the game server whitelist."
    }]);
    assert.equal(interaction.edits[0].content.includes(TEST_USER_ID), false);
    assert.equal(interaction.edits[0].content.includes("192.0.2.10"), false);
});

test("executes the fixed whitelist remove command and formats success", async () => {
    const executions = [];
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createResolver(async remoteCommand => {
            executions.push(remoteCommand);
            return {
                status: "SUCCESS",
                responseLines: [
                    "Whitelist only mode has been DISABLED!",
                    `${TEST_USER_ID} removed from the whitelist.`,
                    "private-ip=192.0.2.10"
                ]
            };
        })
    });
    const interaction = createInteraction("remove");

    await command.execute(interaction);

    assert.deepEqual(executions, [
        `whitelist remove ${TEST_USER_ID}`
    ]);
    assert.deepEqual(interaction.edits, [{
        content: "Removed TestPlayer from the game server whitelist."
    }]);
    assert.equal(interaction.edits[0].content.includes(TEST_USER_ID), false);
    assert.equal(interaction.edits[0].content.includes("192.0.2.10"), false);
});

test("formats a missing whitelist removal without exposing the user ID", async () => {
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createResolver(async () => ({
            status: "SUCCESS",
            responseLines: [
                `${TEST_USER_ID} was not on the whitelist.`
            ]
        }))
    });
    const interaction = createInteraction("remove");

    await command.execute(interaction);

    assert.deepEqual(interaction.edits, [{
        content: "TestPlayer is not on the game server whitelist."
    }]);
    assert.equal(interaction.edits[0].content.includes(TEST_USER_ID), false);
});

test("rejects unsafe whitelist input before Provider resolution", async () => {
    const cases = [
        { action: "add", values: { "user-id": "EOS_bad\nwhitelist list" } },
        { action: "add", values: { "display-name": "Bad\\Name" } },
        { action: "remove", values: { "user-id": "Steam_0" } },
        { action: "remove", values: { "display-name": " trailing" } }
    ];

    for (const testCase of cases) {
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
        const interaction = createInteraction(
            testCase.action,
            testCase.values
        );

        await command.execute(interaction);

        assert.equal(resolutions, 0);
        assert.equal(interaction.replies.length, 1);
        assert.deepEqual(interaction.deferred, []);
        assert.deepEqual(interaction.edits, []);
    }
});

test("uses shared safe timeout formatting for whitelist operations", async () => {
    for (const action of ["add", "remove"]) {
        const command = new GameCommand({
            gameCommandAuthorizer: createAuthorizer(),
            gameServerProviderResolver: createResolver(async () => ({
                status: "TIMEOUT",
                responseLines: ["private raw output"]
            }))
        });
        const interaction = createInteraction(action);

        await command.execute(interaction);

        assert.deepEqual(interaction.edits, [{
            content: "The game server did not respond in time."
        }]);
        assert.equal(
            interaction.edits[0].content.includes("private raw output"),
            false
        );
    }
});
