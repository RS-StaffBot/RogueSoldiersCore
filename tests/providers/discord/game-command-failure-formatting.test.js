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

function createCommand(executeCommand) {
    return new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: {
            resolve() {
                return {
                    available: true,
                    service: { executeCommand },
                    status:
                        DiscordGameServerProviderResolver.Status.AVAILABLE
                };
            }
        }
    });
}

function createTimeInteraction() {
    const deferred = [];
    const edits = [];

    return {
        guild: { id: "guild-1" },
        memberPermissions: { has: () => true },
        options: {
            getSubcommand() {
                return "time";
            }
        },
        deferred,
        edits,
        async deferReply(payload) {
            deferred.push(payload);
        },
        async editReply(payload) {
            edits.push(payload);
        }
    };
}

async function expectTimeFailure(resultOrError, expectedMessage) {
    const command = createCommand(async () => {
        if (resultOrError instanceof Error) {
            throw resultOrError;
        }
        return resultOrError;
    });
    const interaction = createTimeInteraction();

    await command.execute(interaction);

    assert.deepEqual(interaction.deferred, [{
        flags: MessageFlags.Ephemeral
    }]);
    assert.deepEqual(interaction.edits, [{
        content: expectedMessage
    }]);
}

test("formats command timeout results safely", async () => {
    await expectTimeFailure(
        { status: "TIMEOUT", secret: "must-not-leak" },
        "The game server did not respond in time."
    );
});

test("formats disconnected command results safely", async () => {
    await expectTimeFailure(
        { status: "DISCONNECTED", socket: "must-not-leak" },
        "The game server connection was lost."
    );
});

test("formats generic command failures safely", async () => {
    await expectTimeFailure(
        { status: "ERROR", responseLines: ["private raw output"] },
        "The game server could not complete the command."
    );
});

test("formats thrown command errors safely", async () => {
    await expectTimeFailure(
        new Error("private Telnet failure details"),
        "The game server command could not be completed."
    );
});

test("formats malformed command results safely", async () => {
    await expectTimeFailure(
        null,
        "The game server returned an invalid response."
    );
});

test("does not expose raw Provider failure details", async () => {
    const privateValues = [
        "192.0.2.10",
        "telnet-password",
        "private raw output",
        "private Telnet failure details"
    ];

    for (const value of privateValues) {
        const result = await createCommand(async () => ({
            status: "ERROR",
            responseLines: [value],
            password: value
        })).executeRemoteCommand(
            { executeCommand: async () => ({ status: "ERROR", value }) },
            "gettime"
        );

        assert.equal(result.success, false);
        assert.equal(result.message.includes(value), false);
        assert.equal(Object.hasOwn(result, "error"), false);
    }
});
