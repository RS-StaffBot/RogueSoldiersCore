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

const STORED_ID = "EOS_0002c60901644d5dbbe98aa9575f6d65";

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
    let banListCalls = 0;

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

                        if (command.startsWith("kick ")) {
                            return {
                                status: "SUCCESS",
                                responseLines: [
                                    "Kicking Player TestPlayer: Rule violation"
                                ]
                            };
                        }

                        if (command.startsWith("ban add ")) {
                            return {
                                status: "SUCCESS",
                                responseLines: [
                                    "Steam_76561198324839127 banned until " +
                                    "2026-07-30 18:00:00, reason: Rule violation."
                                ]
                            };
                        }

                        if (command === "ban list") {
                            banListCalls += 1;
                            return {
                                status: "SUCCESS",
                                responseLines: [
                                    "Ban list entries:",
                                    "  Banned until - UserID (name) - Reason",
                                    ...(banListCalls === 1
                                        ? [
                                            "  2026-07-30 18:00:00 - " +
                                            STORED_ID +
                                            " (TestPlayer) - Rule violation"
                                        ]
                                        : [])
                                ]
                            };
                        }

                        if (command.startsWith("ban remove ")) {
                            return {
                                status: "SUCCESS",
                                responseLines: [
                                    `${STORED_ID} removed from ban list.`
                                ]
                            };
                        }

                        if (command.startsWith("whitelist add ")) {
                            return {
                                status: "SUCCESS",
                                responseLines: [
                                    `${STORED_ID} added to whitelist.`
                                ]
                            };
                        }

                        if (command.startsWith("whitelist remove ")) {
                            return {
                                status: "SUCCESS",
                                responseLines: [
                                    `${STORED_ID} removed from the whitelist.`
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

function createInteraction(subcommand, values = {}, subcommandGroup = null) {
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
            getSubcommandGroup(required) {
                assert.equal(required, false);
                return subcommandGroup;
            },
            getInteger(name, required) {
                assert.equal(required, true);
                return values[name];
            },
            getString(name, required) {
                assert.equal(required, true);
                return values[name];
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
        [
            "status",
            "time",
            "players",
            "say",
            "kick",
            "ban",
            "unban",
            "whitelist"
        ]
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

    const kick = definition.options.find(option => option.name === "kick");
    assert.deepEqual(
        kick.options.map(option => option.name),
        ["entity-id", "reason"]
    );

    const ban = definition.options.find(option => option.name === "ban");
    assert.deepEqual(
        ban.options.map(option => option.name),
        ["user-id", "duration", "unit", "reason", "display-name"]
    );

    const unban = definition.options.find(option => option.name === "unban");
    assert.deepEqual(
        unban.options.map(option => option.name),
        ["display-name"]
    );

    const whitelist = definition.options.find(
        option => option.name === "whitelist"
    );
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

    const say = createInteraction("say", {
        message: "Welcome to Rogue Soldiers!"
    });
    await dispatchInteraction(say);
    assert.deepEqual(say.edits, [{
        content: "The message was sent to the 7 Days to Die server."
    }]);

    const kick = createInteraction("kick", {
        "entity-id": "171",
        reason: "Rule violation"
    });
    await dispatchInteraction(kick);
    assert.deepEqual(kick.edits, [{
        content: "Kicked TestPlayer from the game server."
    }]);

    const ban = createInteraction("ban", {
        "display-name": "TestPlayer",
        duration: 3,
        reason: "Rule violation",
        unit: "minutes",
        "user-id": "Steam_76561198324839127"
    });
    await dispatchInteraction(ban);
    assert.deepEqual(ban.edits, [{
        content: "Banned TestPlayer from the game server for 3 minutes."
    }]);

    const unban = createInteraction("unban", {
        "display-name": "TestPlayer"
    });
    await dispatchInteraction(unban);
    assert.deepEqual(unban.edits, [{
        content: "Unbanned TestPlayer from the game server."
    }]);

    const whitelistAdd = createInteraction("add", {
        "display-name": "TestPlayer",
        "user-id": STORED_ID
    }, "whitelist");
    await dispatchInteraction(whitelistAdd);
    assert.deepEqual(whitelistAdd.edits, [{
        content: "Added TestPlayer to the game server whitelist."
    }]);

    const whitelistRemove = createInteraction("remove", {
        "display-name": "TestPlayer",
        "user-id": STORED_ID
    }, "whitelist");
    await dispatchInteraction(whitelistRemove);
    assert.deepEqual(whitelistRemove.edits, [{
        content: "Removed TestPlayer from the game server whitelist."
    }]);

    assert.deepEqual(executions, [
        "gettime",
        "listplayers",
        "say \"Welcome to Rogue Soldiers!\"",
        "kick 171 \"Rule violation\"",
        "ban add Steam_76561198324839127 3 minutes " +
        "\"Rule violation\" \"TestPlayer\"",
        "ban list",
        `ban remove ${STORED_ID}`,
        "ban list",
        `whitelist add ${STORED_ID} TestPlayer`,
        `whitelist remove ${STORED_ID}`
    ]);
});
