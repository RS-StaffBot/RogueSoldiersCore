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

function createInteraction(displayName = "TestPlayer") {
    const deferred = [];
    const edits = [];
    const replies = [];

    return {
        guild: { id: "guild-1" },
        memberPermissions: { has: () => true },
        options: {
            getSubcommand(required) {
                assert.equal(required, true);
                return "unban";
            },
            getString(name, required) {
                assert.equal(name, "display-name");
                assert.equal(required, true);
                return displayName;
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

function activeList(entries) {
    return {
        status: "SUCCESS",
        responseLines: [
            "Ban list entries:",
            "  Banned until - UserID (name) - Reason",
            ...entries
        ]
    };
}

function activeRow(name = "TestPlayer", userId = STORED_ID) {
    return "  2026-07-30 22:31:50 - " + userId +
        ` (${name}) - Rule violation`;
}

test("defines the exact display-name unban option", () => {
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createResolver(async () => ({}))
    });
    const unban = command.data.toJSON().options.find(
        option => option.name === "unban"
    );

    assert.ok(unban);
    assert.deepEqual(
        unban.options.map(option => ({
            maxLength: option.max_length,
            minLength: option.min_length,
            name: option.name,
            required: option.required
        })),
        [{
            maxLength: 40,
            minLength: 1,
            name: "display-name",
            required: true
        }]
    );
});

test("resolves, removes, and verifies one exact active ban", async () => {
    const executions = [];
    const responses = [
        activeList([activeRow()]),
        {
            status: "SUCCESS",
            responseLines: [`${STORED_ID} removed from ban list.`]
        },
        activeList([])
    ];
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createResolver(async remoteCommand => {
            executions.push(remoteCommand);
            return responses.shift();
        })
    });
    const interaction = createInteraction();

    await command.execute(interaction);

    assert.deepEqual(executions, [
        "ban list",
        `ban remove ${STORED_ID}`,
        "ban list"
    ]);
    assert.deepEqual(interaction.replies, []);
    assert.deepEqual(interaction.deferred, [{
        flags: MessageFlags.Ephemeral
    }]);
    assert.deepEqual(interaction.edits, [{
        content: "Unbanned TestPlayer from the game server."
    }]);
    assert.equal(interaction.edits[0].content.includes("EOS_"), false);
});

test("does not remove a missing or ambiguous display name", async () => {
    const cases = [
        {
            entries: [],
            expected: "No active ban was found for that exact display name."
        },
        {
            entries: [activeRow(), activeRow("TestPlayer", "Steam_1")],
            expected:
                "More than one active ban uses that display name. " +
                "Resolve it through the server console."
        }
    ];

    for (const testCase of cases) {
        const executions = [];
        const command = new GameCommand({
            gameCommandAuthorizer: createAuthorizer(),
            gameServerProviderResolver: createResolver(async remoteCommand => {
                executions.push(remoteCommand);
                return activeList(testCase.entries);
            })
        });
        const interaction = createInteraction();

        await command.execute(interaction);

        assert.deepEqual(executions, ["ban list"]);
        assert.deepEqual(interaction.edits, [{
            content: testCase.expected
        }]);
    }
});

test("rejects unsafe display names before Provider resolution", async () => {
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
    const interaction = createInteraction("Bad\\Name");

    await command.execute(interaction);

    assert.equal(resolutions, 0);
    assert.equal(interaction.replies.length, 1);
    assert.deepEqual(interaction.deferred, []);
});

test("does not trust the removal response without verification", async () => {
    const responses = [
        activeList([activeRow()]),
        {
            status: "SUCCESS",
            responseLines: [`${STORED_ID} removed from ban list.`]
        },
        activeList([activeRow()])
    ];
    const command = new GameCommand({
        gameCommandAuthorizer: createAuthorizer(),
        gameServerProviderResolver: createResolver(
            async () => responses.shift()
        )
    });
    const interaction = createInteraction();

    await command.execute(interaction);

    assert.deepEqual(interaction.edits, [{
        content: "The game server did not verify that the ban was removed."
    }]);
});

test("fails safely when either ban list is malformed", async () => {
    const cases = [
        [
            { status: "SUCCESS", responseLines: ["private raw output"] },
            "The game server returned an invalid ban list."
        ],
        [
            activeList([activeRow()]),
            {
                status: "SUCCESS",
                responseLines: [`${STORED_ID} removed from ban list.`]
            },
            { status: "SUCCESS", responseLines: ["private raw output"] },
            "The game server could not verify the unban."
        ]
    ];

    for (const testCase of cases) {
        const expected = testCase.pop();
        const responses = [...testCase];
        const command = new GameCommand({
            gameCommandAuthorizer: createAuthorizer(),
            gameServerProviderResolver: createResolver(
                async () => responses.shift()
            )
        });
        const interaction = createInteraction();

        await command.execute(interaction);

        assert.deepEqual(interaction.edits, [{ content: expected }]);
        assert.equal(
            interaction.edits[0].content.includes("private raw output"),
            false
        );
    }
});
