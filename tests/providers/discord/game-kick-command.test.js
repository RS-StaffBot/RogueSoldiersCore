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

function createInteraction(entityId = "171", reason = "Rule violation") {
    const deferred = [];
    const edits = [];
    const replies = [];

    return {
        guild: { id: "guild-1" },
        memberPermissions: { has: () => true },
        options: {
            getSubcommand(required) {
                assert.equal(required, true);
                return "kick";
            },
            getString(name, required) {
                assert.equal(required, true);
                return name === "entity-id" ? entityId : reason;
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

test("defines the required game kick options", () => {
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createResolver(async () => ({}))
    });
    const kick = command.data.toJSON().options.find(
        option => option.name === "kick"
    );

    assert.ok(kick);
    assert.deepEqual(
        kick.options.map(option => ({
            maxLength: option.max_length,
            minLength: option.min_length,
            name: option.name,
            required: option.required
        })),
        [
            {
                maxLength: undefined,
                minLength: undefined,
                name: "entity-id",
                required: true
            },
            {
                maxLength: 200,
                minLength: 1,
                name: "reason",
                required: true
            }
        ]
    );
});

test("executes the fixed kick command and formats success", async () => {
    const executions = [];
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createResolver(async remoteCommand => {
            executions.push(remoteCommand);
            return {
                status: "SUCCESS",
                responseLines: [
                    "Kicking Player TestPlayer: Rule violation"
                ]
            };
        })
    });
    const interaction = createInteraction();

    await command.execute(interaction);

    assert.deepEqual(executions, [
        "kick 171 \"Rule violation\""
    ]);
    assert.deepEqual(interaction.replies, []);
    assert.deepEqual(interaction.deferred, [{
        flags: MessageFlags.Ephemeral
    }]);
    assert.deepEqual(interaction.edits, [{
        content: "Kicked TestPlayer from the game server."
    }]);
});

test("formats an offline player without raw output", async () => {
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createResolver(async () => ({
            status: "SUCCESS",
            responseLines: [
                "\"171\" is not a valid entity id, player name or user id."
            ]
        }))
    });
    const interaction = createInteraction();

    await command.execute(interaction);

    assert.deepEqual(interaction.edits, [{
        content: "That player is no longer online or could not be found."
    }]);
});

test("rejects unsafe kick input before Provider resolution", async () => {
    const inputs = [
        ["0", "Rule violation"],
        ["171;shutdown", "Rule violation"],
        ["171", "contains \"quotes\""]
    ];

    for (const [entityId, reason] of inputs) {
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
        const interaction = createInteraction(entityId, reason);

        await command.execute(interaction);

        assert.equal(resolutions, 0);
        assert.equal(interaction.replies.length, 1);
        assert.deepEqual(interaction.deferred, []);
        assert.deepEqual(interaction.edits, []);
    }
});

test("uses shared safe timeout formatting", async () => {
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
