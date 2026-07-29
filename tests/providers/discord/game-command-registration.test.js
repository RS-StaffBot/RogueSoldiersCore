const assert = require("node:assert/strict");
const test = require("node:test");

const {
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

const CommandLoader = require(
    "../../../src/providers/discord/commands/CommandLoader"
);
const CommandRegistry = require(
    "../../../src/providers/discord/services/CommandRegistry"
);
const InteractionHandler = require(
    "../../../src/providers/discord/handlers/InteractionHandler"
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

function createResolver(executions) {
    return {
        resolve() {
            return {
                available: true,
                service: {
                    async executeCommand(command) {
                        executions.push(command);

                        if (command === "gettime") {
                            return {
                                status: "SUCCESS",
                                responseLines: ["Day 12, 09:45"]
                            };
                        }

                        if (command === "listplayers") {
                            return {
                                status: "SUCCESS",
                                responseLines: [
                                    "0. id=1, TestPlayer, pos=(0, 0, 0),",
                                    "Total of 1 in the game"
                                ]
                            };
                        }

                        return {
                            status: "SUCCESS",
                            responseLines: []
                        };
                    }
                },
                status: "AVAILABLE"
            };
        }
    };
}

function registerHandler() {
    let interactionListener;
    InteractionHandler.register({
        on(eventName, listener) {
            assert.equal(eventName, "interactionCreate");
            interactionListener = listener;
        }
    });

    return interactionListener;
}

function createInteraction(subcommand, message = null) {
    const replies = [];
    const deferred = [];
    const edits = [];

    return {
        commandName: "game",
        guild: { id: "guild-1" },
        memberPermissions: { has: () => true },
        options: {
            getSubcommand(required) {
                assert.equal(required, true);
                return subcommand;
            },
            getString(name, required) {
                assert.equal(name, "message");
                assert.equal(required, true);
                return message;
            }
        },
        replies,
        deferred,
        edits,
        isChatInputCommand() {
            return true;
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
}

test.afterEach(() => {
    CommandRegistry.clear();
});

test("registers the complete guild-only game command definition", () => {
    const commands = CommandLoader.load({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createResolver([])
    });
    const gameCommand = commands.find(command => command.data.name === "game");

    assert.ok(gameCommand);
    CommandRegistry.register(gameCommand);

    const definition = CommandRegistry.getDefinitions()[0];

    assert.equal(definition.name, "game");
    assert.equal(definition.dm_permission, false);
    assert.equal(
        definition.default_member_permissions,
        PermissionFlagsBits.ManageGuild.toString()
    );
    assert.deepEqual(
        definition.options.map(option => option.name),
        ["status", "time", "players", "say"]
    );

    const say = definition.options.find(option => option.name === "say");
    assert.deepEqual(
        say.options.map(option => ({
            maxLength: option.max_length,
            minLength: option.min_length,
            name: option.name,
            required: option.required
        })),
        [{
            maxLength: 200,
            minLength: 1,
            name: "message",
            required: true
        }]
    );
});

test("dispatches every game subcommand through the registered command", async () => {
    const executions = [];
    const commands = CommandLoader.load({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createResolver(executions)
    });
    const gameCommand = commands.find(command => command.data.name === "game");

    CommandRegistry.register(gameCommand);
    const dispatchInteraction = registerHandler();

    const status = createInteraction("status");
    await dispatchInteraction(status);
    assert.deepEqual(status.replies, [{
        content: "7 Days to Die server control is available.",
        flags: MessageFlags.Ephemeral
    }]);

    const time = createInteraction("time");
    await dispatchInteraction(time);
    assert.deepEqual(time.deferred, [{ flags: MessageFlags.Ephemeral }]);
    assert.deepEqual(time.edits, [{
        content: "7 Days to Die time: Day 12, 09:45."
    }]);

    const players = createInteraction("players");
    await dispatchInteraction(players);
    assert.deepEqual(players.deferred, [{ flags: MessageFlags.Ephemeral }]);
    assert.deepEqual(players.edits, [{
        content: "Players online (1): TestPlayer"
    }]);

    const say = createInteraction("say", "Welcome to Rogue Soldiers!");
    await dispatchInteraction(say);
    assert.deepEqual(say.deferred, [{ flags: MessageFlags.Ephemeral }]);
    assert.deepEqual(say.edits, [{
        content: "The message was sent to the 7 Days to Die server."
    }]);

    assert.deepEqual(executions, [
        "gettime",
        "listplayers",
        "say \"Welcome to Rogue Soldiers!\""
    ]);
});
