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

function createAuthorizer({ authorized = true } = {}) {
    return {
        getRequiredPermission() {
            return PermissionFlagsBits.ManageGuild;
        },
        isAuthorized() {
            return authorized;
        }
    };
}

function createResolver(status) {
    return {
        resolve() {
            return Object.freeze({
                available:
                    status ===
                    DiscordGameServerProviderResolver.Status.AVAILABLE,
                status
            });
        }
    };
}

function createInteraction({
    guild = { id: "guild-1" },
    memberPermissions = { has: () => true },
    subcommand = "status"
} = {}) {
    const replies = [];

    return {
        guild,
        memberPermissions,
        options: {
            getSubcommand(required) {
                assert.equal(required, true);
                return subcommand;
            }
        },
        replies,
        async reply(payload) {
            replies.push(payload);
        }
    };
}

test("defines the guild-only game command family", () => {
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createResolver(
            DiscordGameServerProviderResolver.Status.AVAILABLE
        )
    });

    const data = command.data.toJSON();

    assert.equal(data.name, "game");
    assert.equal(data.dm_permission, false);
    assert.equal(
        data.default_member_permissions,
        PermissionFlagsBits.ManageGuild.toString()
    );
    assert.deepEqual(
        data.options.map(option => option.name),
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
});

test("rejects direct-message execution", async () => {
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createResolver(
            DiscordGameServerProviderResolver.Status.AVAILABLE
        )
    });
    const interaction = createInteraction({ guild: null });

    await command.execute(interaction);

    assert.deepEqual(interaction.replies, [{
        content: "This command can only be used in a server.",
        flags: MessageFlags.Ephemeral
    }]);
});

test("rejects members without game command authorization", async () => {
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer({ authorized: false }),
        gameServerProviderResolver: createResolver(
            DiscordGameServerProviderResolver.Status.AVAILABLE
        )
    });
    const interaction = createInteraction();

    await command.execute(interaction);

    assert.deepEqual(interaction.replies, [{
        content: "You do not have permission to manage the game server.",
        flags: MessageFlags.Ephemeral
    }]);
});

test("reports available game server control without executing a command", async () => {
    let resolutions = 0;
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: {
            resolve() {
                resolutions += 1;
                return {
                    available: true,
                    status:
                        DiscordGameServerProviderResolver.Status.AVAILABLE
                };
            }
        }
    });
    const interaction = createInteraction();

    await command.execute(interaction);

    assert.equal(resolutions, 1);
    assert.deepEqual(interaction.replies, [{
        content: "7 Days to Die server control is available.",
        flags: MessageFlags.Ephemeral
    }]);
});

test("reports each unavailable Provider condition safely", async () => {
    const cases = [
        [
            DiscordGameServerProviderResolver.Status.PROVIDER_UNAVAILABLE,
            "7 Days to Die server control is unavailable."
        ],
        [
            DiscordGameServerProviderResolver.Status.PROVIDER_NOT_READY,
            "7 Days to Die server control is not ready."
        ],
        [
            DiscordGameServerProviderResolver.Status.INVALID_PROVIDER_BOUNDARY,
            "7 Days to Die server control is unavailable because its Provider boundary is invalid."
        ]
    ];

    for (const [status, expected] of cases) {
        const command = new GameCommand({
            gameCommandAuthorizer: createAuthorizer(),
            gameServerProviderResolver: createResolver(status)
        });
        const interaction = createInteraction();

        await command.execute(interaction);

        assert.equal(interaction.replies[0].content, expected);
        assert.equal(
            interaction.replies[0].flags,
            MessageFlags.Ephemeral
        );
    }
});

test("rejects unsupported game subcommands", async () => {
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createResolver(
            DiscordGameServerProviderResolver.Status.AVAILABLE
        )
    });
    const interaction = createInteraction({ subcommand: "unknown" });

    await assert.rejects(
        command.execute(interaction),
        /Unsupported game command subcommand: unknown/
    );
});

test("requires valid injected Phase 1 boundaries", () => {
    assert.throws(
        () => new GameCommand(),
        /authorizer boundary is invalid/
    );

    assert.throws(
        () => new GameCommand({
            gameCommandAuthorizer: createAuthorizer()
        }),
        /Provider resolver boundary is invalid/
    );
});
