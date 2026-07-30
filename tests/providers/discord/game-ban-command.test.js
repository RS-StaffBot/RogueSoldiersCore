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

function createInteraction(values = {}) {
    const deferred = [];
    const edits = [];
    const replies = [];
    const defaults = {
        "display-name": "TestPlayer",
        duration: 3,
        reason: "Rule violation",
        unit: "minutes",
        "user-id": "Steam_76561198324839127"
    };
    const resolved = { ...defaults, ...values };

    return {
        guild: { id: "guild-1" },
        memberPermissions: { has: () => true },
        options: {
            getSubcommand(required) {
                assert.equal(required, true);
                return "ban";
            },
            getInteger(name, required) {
                assert.equal(name, "duration");
                assert.equal(required, true);
                return resolved[name];
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

test("defines the required game ban options and duration units", () => {
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createResolver(async () => ({}))
    });
    const ban = command.data.toJSON().options.find(
        option => option.name === "ban"
    );

    assert.ok(ban);
    assert.deepEqual(
        ban.options.map(option => option.name),
        ["user-id", "duration", "unit", "reason", "display-name"]
    );
    assert.deepEqual(
        ban.options.find(option => option.name === "unit")
            .choices.map(choice => choice.value),
        ["minutes", "hours", "days", "weeks", "months", "years"]
    );
});

test("executes the fixed ban command and formats success", async () => {
    const executions = [];
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createResolver(async remoteCommand => {
            executions.push(remoteCommand);
            return {
                status: "SUCCESS",
                responseLines: [
                    "EOS_0002c60901644d5dbbe98aa9575f6d65 banned until " +
                    "2026-07-29 22:31:50, reason: Rule violation."
                ]
            };
        })
    });
    const interaction = createInteraction();

    await command.execute(interaction);

    assert.deepEqual(executions, [
        "ban add Steam_76561198324839127 3 minutes " +
        "\"Rule violation\" \"TestPlayer\""
    ]);
    assert.deepEqual(interaction.replies, []);
    assert.deepEqual(interaction.deferred, [{
        flags: MessageFlags.Ephemeral
    }]);
    assert.deepEqual(interaction.edits, [{
        content: "Banned TestPlayer from the game server for 3 minutes."
    }]);
});

test("formats an invalid durable target without exposing raw identifiers", async () => {
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createResolver(async () => ({
            status: "SUCCESS",
            responseLines: [
                "\"Steam_76561198324839127\" is not a valid entity id, " +
                "player name or user id."
            ]
        }))
    });
    const interaction = createInteraction();

    await command.execute(interaction);

    assert.deepEqual(interaction.edits, [{
        content: "That durable player ID could not be found."
    }]);
    assert.equal(
        interaction.edits[0].content.includes("76561198324839127"),
        false
    );
});

test("rejects unsafe ban input before Provider resolution", async () => {
    const inputs = [
        { "user-id": "Steam 76561198324839127" },
        { duration: 0 },
        { unit: "forever" },
        { reason: "contains \"quotes\"" },
        { "display-name": "Bad\\Name" }
    ];

    for (const values of inputs) {
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
        const interaction = createInteraction(values);

        await command.execute(interaction);

        assert.equal(resolutions, 0);
        assert.equal(interaction.replies.length, 1);
        assert.deepEqual(interaction.deferred, []);
        assert.deepEqual(interaction.edits, []);
    }
});

test("uses shared safe timeout formatting for ban", async () => {
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createResolver(async () => ({
            status: "TIMEOUT",
            responseLines: ["private raw output"]
        }))
    });
    const interaction = createInteraction();

    await command.execute(interaction);

    assert.deepEqual(interaction.edits, [{
        content: "The game server did not respond in time."
    }]);
});
