const assert = require("node:assert/strict");
const test = require("node:test");

const AuditedGameCommand = require(
    "../../../../src/providers/discord/commands/AuditedGameCommand"
);

function createCommand({
    allowed = true,
    auditService,
    executeCommand = async () => ({
        status: "SUCCESS",
        responseLines: []
    })
} = {}) {
    return new AuditedGameCommand({
        auditService,
        gameCommandAuthorizer: {
            getRequiredPermission() {
                return 32n;
            },
            isAuthorized() {
                return allowed;
            }
        },
        gameServerProviderResolver: {
            resolve() {
                return {
                    available: true,
                    service: { executeCommand },
                    status: "AVAILABLE"
                };
            }
        }
    });
}

function createInteraction({
    group = null,
    strings = {},
    subcommand
}) {
    const responses = [];

    return {
        interaction: {
            async deferReply() {},
            async editReply(payload) {
                responses.push(payload.content);
            },
            guild: { id: "987654321098765432" },
            memberPermissions: {},
            options: {
                getInteger(name) {
                    return name === "duration" ? 2 : null;
                },
                getString(name) {
                    return strings[name];
                },
                getSubcommand() {
                    return subcommand;
                },
                getSubcommandGroup() {
                    return group;
                }
            },
            async reply(payload) {
                responses.push(payload.content);
            },
            user: {
                id: "123456789012345678"
            }
        },
        responses
    };
}

test("audits a verified hosted-player kick success", async () => {
    const records = [];
    const command = createCommand({
        auditService: {
            recordAttempt(record) {
                records.push(record);
            }
        },
        executeCommand: async () => ({
            status: "SUCCESS",
            responseLines: [
                "Kicking Player Bob: staff reason"
            ]
        })
    });
    const { interaction, responses } = createInteraction({
        strings: {
            "entity-id": "42",
            reason: "staff reason"
        },
        subcommand: "kick"
    });

    await command.execute(interaction);

    assert.deepStrictEqual(responses, [
        "Kicked Bob from the game server."
    ]);
    assert.deepStrictEqual(records, [{
        action: "kick",
        actorId: "123456789012345678",
        outcome: "SUCCESS",
        status: "succeeded",
        targetId: "42"
    }]);
});

test("audits denied hosted-player administration", async () => {
    const records = [];
    const command = createCommand({
        allowed: false,
        auditService: {
            recordAttempt(record) {
                records.push(record);
            }
        }
    });
    const { interaction, responses } = createInteraction({
        strings: {
            "user-id": "Steam_123456789"
        },
        subcommand: "ban"
    });

    await command.execute(interaction);

    assert.deepStrictEqual(responses, [
        "You do not have permission to manage the game server."
    ]);
    assert.equal(records.length, 1);
    assert.equal(records[0].outcome, "DENIED");
    assert.equal(records[0].status, "permission-denied");
});

test("does not audit read-only game commands", async () => {
    let auditCalls = 0;
    const command = createCommand({
        auditService: {
            recordAttempt() {
                auditCalls += 1;
            }
        }
    });
    const { interaction, responses } = createInteraction({
        subcommand: "status"
    });

    await command.execute(interaction);

    assert.deepStrictEqual(responses, [
        "7 Days to Die server control is available."
    ]);
    assert.equal(auditCalls, 0);
});

test("audit failure does not change hosted-player behavior", async () => {
    const command = createCommand({
        auditService: {
            recordAttempt() {
                throw new Error("private audit failure");
            }
        },
        executeCommand: async () => ({
            status: "SUCCESS",
            responseLines: [
                "Steam_123456789 added to whitelist."
            ]
        })
    });
    const { interaction, responses } = createInteraction({
        group: "whitelist",
        strings: {
            "display-name": "Bob",
            "user-id": "Steam_123456789"
        },
        subcommand: "add"
    });

    await command.execute(interaction);

    assert.deepStrictEqual(responses, [
        "Added Bob to the game server whitelist."
    ]);
});

test("validates the optional audit boundary", () => {
    assert.throws(
        () => createCommand({ auditService: {} }),
        {
            message: "Discord hosted-player audit boundary is invalid."
        }
    );
});
