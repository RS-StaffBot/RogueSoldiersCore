const assert = require("node:assert/strict");
const test = require("node:test");

const AuditCommand = require(
    "../../../src/providers/discord/commands/AuditCommand"
);

function createAuthorizer(authorized = true) {
    return {
        getRequiredPermission: () => 32n,
        isAuthorized: () => authorized
    };
}

function createLogger() {
    const errors = [];

    return {
        errors,
        error(message) {
            errors.push(message);
        }
    };
}

function createInteraction({
    guild = {},
    options = {},
    subcommand = "recent"
} = {}) {

    const replies = [];

    return {
        guild,
        memberPermissions: {},
        options: {
            getSubcommand: () => subcommand,
            getInteger: name =>
                options[name] ?? null,
            getString: name =>
                options[name] ?? null
        },
        replies,
        async reply(payload) {
            replies.push(payload);
        }
    };

}

function createRecord(overrides = {}) {
    return {
        id: "audit-12",
        actorType: "discord-user",
        actorId: "123456789",
        source: "discord",
        action: "discord.moderation.ban",
        targetType: "discord-user",
        targetId: "987654321",
        outcome: "success",
        metadata: {
            status: "completed",
            referenceId: "moderation-4"
        },
        createdAt: "2026-08-01T20:00:00.000Z",
        ...overrides
    };
}

function createCommand({
    authorized = true,
    logger = createLogger(),
    queryBoundary = {
        getById() {
            return null;
        },
        list() {
            return {
                records: [],
                nextCursor: null
            };
        }
    }
} = {}) {

    return new AuditCommand({
        authorizer: createAuthorizer(authorized),
        logger,
        queryBoundary
    });

}

test("registers private ManageGuild recent and record lookups", () => {

    const command = createCommand();
    const definition = command.data.toJSON();

    assert.equal(definition.name, "audit");
    assert.equal(definition.dm_permission, false);
    assert.equal(
        definition.default_member_permissions,
        "32"
    );
    assert.deepEqual(
        definition.options.map(option => option.name),
        ["recent", "record"]
    );
    assert.deepEqual(
        definition.options[0].options.map(
            option => option.name
        ),
        [
            "limit",
            "cursor",
            "actor-type",
            "source",
            "outcome",
            "action",
            "target-type"
        ]
    );

});

test("denies unauthorized lookup without querying", async () => {

    let queried = false;
    const interaction = createInteraction();
    const command = createCommand({
        authorized: false,
        queryBoundary: {
            getById() {
                queried = true;
            },
            list() {
                queried = true;
            }
        }
    });

    await command.execute(interaction);

    assert.equal(queried, false);
    assert.match(
        interaction.replies[0].content,
        /do not have permission/u
    );
    assert.notEqual(
        interaction.replies[0].flags,
        undefined
    );
    assert.deepEqual(
        interaction.replies[0].allowedMentions,
        { parse: [] }
    );

});

test("rejects direct-message use privately", async () => {

    const interaction = createInteraction({
        guild: null
    });
    const command = createCommand();

    await command.execute(interaction);

    assert.match(
        interaction.replies[0].content,
        /only be used in a server/u
    );
    assert.notEqual(
        interaction.replies[0].flags,
        undefined
    );

});

test("translates supported recent filters and cursor", async () => {

    const received = [];
    const interaction = createInteraction({
        options: {
            limit: 7,
            cursor: "opaque-cursor",
            "actor-type": "discord-user",
            source: "discord",
            outcome: "success",
            action: "discord.moderation.ban",
            "target-type": "discord-user"
        }
    });
    const command = createCommand({
        queryBoundary: {
            getById() {
                return null;
            },
            list(query) {
                received.push(query);
                return {
                    records: [],
                    nextCursor: null
                };
            }
        }
    });

    await command.execute(interaction);

    assert.deepEqual(received, [{
        limit: 7,
        cursor: "opaque-cursor",
        filters: {
            actorType: "discord-user",
            source: "discord",
            outcome: "success",
            action: "discord.moderation.ban",
            targetType: "discord-user"
        }
    }]);

});

test("uses the Discord default recent limit", async () => {

    const received = [];
    const interaction = createInteraction();
    const command = createCommand({
        queryBoundary: {
            getById() {
                return null;
            },
            list(query) {
                received.push(query);
                return {
                    records: [],
                    nextCursor: null
                };
            }
        }
    });

    await command.execute(interaction);

    assert.equal(received[0].limit, 5);

});

test("rejects invalid enum and bounded-string input", async () => {

    const invalidCases = [
        { "actor-type": "unknown" },
        { source: "database" },
        { outcome: "maybe" },
        { action: "" },
        { action: "a".repeat(65) },
        { "target-type": " " },
        { "target-type": "t".repeat(65) },
        { cursor: "c".repeat(129) },
        { limit: 11 }
    ];

    for (const options of invalidCases) {
        let queried = false;
        const interaction = createInteraction({ options });
        const command = createCommand({
            queryBoundary: {
                getById() {
                    queried = true;
                },
                list() {
                    queried = true;
                }
            }
        });

        await command.execute(interaction);

        assert.equal(queried, false);
        assert.equal(
            interaction.replies[0].content,
            "Audit lookup input is invalid."
        );
    }

});

test("returns a private empty-result response", async () => {

    const interaction = createInteraction();
    const command = createCommand();

    await command.execute(interaction);

    assert.equal(
        interaction.replies[0].content,
        "No Audit records matched the requested filters."
    );
    assert.notEqual(
        interaction.replies[0].flags,
        undefined
    );

});

test("formats bounded recent records and opaque cursor", async () => {

    const interaction = createInteraction();
    const command = createCommand({
        queryBoundary: {
            getById() {
                return null;
            },
            list() {
                return {
                    records: [
                        createRecord(),
                        createRecord({
                            id: "audit-11",
                            action: "provider.lifecycle.reload"
                        })
                    ],
                    nextCursor: "opaque-next-cursor"
                };
            }
        }
    });

    await command.execute(interaction);

    const content = interaction.replies[0].content;

    assert.match(content, /audit-12/u);
    assert.match(content, /audit-11/u);
    assert.match(content, /opaque-next-cursor/u);
    assert.match(content, /<t:\d+:f>/u);
    assert.equal(content.length <= 1900, true);

});

test("renders identifiers as inert text and blocks mentions", async () => {

    const interaction = createInteraction();
    const command = createCommand({
        queryBoundary: {
            getById() {
                return null;
            },
            list() {
                return {
                    records: [
                        createRecord({
                            actorId: "<@123456789>",
                            targetId: "@everyone"
                        })
                    ],
                    nextCursor: null
                };
            }
        }
    });

    await command.execute(interaction);

    const reply = interaction.replies[0];

    assert.doesNotMatch(reply.content, /<@/u);
    assert.doesNotMatch(reply.content, /@everyone/u);
    assert.match(reply.content, /＠everyone/u);
    assert.deepEqual(
        reply.allowedMentions,
        { parse: [] }
    );

});

test("shows only allowlisted metadata fields", async () => {

    const interaction = createInteraction();
    const command = createCommand({
        queryBoundary: {
            getById() {
                return null;
            },
            list() {
                return {
                    records: [
                        createRecord({
                            metadata: {
                                status: "completed",
                                referenceId: "case-4",
                                password: "secret",
                                sql: "SELECT *"
                            }
                        })
                    ],
                    nextCursor: null
                };
            }
        }
    });

    await command.execute(interaction);

    const content = interaction.replies[0].content;

    assert.match(content, /status=completed/u);
    assert.match(content, /referenceId=case-4/u);
    assert.doesNotMatch(
        content,
        /password|secret|SELECT/u
    );

});

test("looks up one record by Audit ID", async () => {

    const received = [];
    const interaction = createInteraction({
        subcommand: "record",
        options: {
            id: "audit-12"
        }
    });
    const command = createCommand({
        queryBoundary: {
            getById(id) {
                received.push(id);
                return createRecord();
            },
            list() {
                throw new Error("must not list");
            }
        }
    });

    await command.execute(interaction);

    assert.deepEqual(received, ["audit-12"]);
    assert.match(
        interaction.replies[0].content,
        /Audit record:/u
    );
    assert.match(
        interaction.replies[0].content,
        /audit-12/u
    );

});

test("rejects malformed record IDs without querying", async () => {

    let queried = false;
    const interaction = createInteraction({
        subcommand: "record",
        options: {
            id: "record-12"
        }
    });
    const command = createCommand({
        queryBoundary: {
            getById() {
                queried = true;
            },
            list() {
                queried = true;
            }
        }
    });

    await command.execute(interaction);

    assert.equal(queried, false);
    assert.equal(
        interaction.replies[0].content,
        "Audit lookup input is invalid."
    );

});

test("returns a private not-found record response", async () => {

    const interaction = createInteraction({
        subcommand: "record",
        options: {
            id: "audit-999"
        }
    });
    const command = createCommand();

    await command.execute(interaction);

    assert.equal(
        interaction.replies[0].content,
        "No Audit record was found with that ID."
    );

});

test("sanitizes query failures and logs no raw exception", async () => {

    const logger = createLogger();
    const interaction = createInteraction();
    const command = createCommand({
        logger,
        queryBoundary: {
            getById() {
                throw new Error(
                    "password SQL database path stack"
                );
            },
            list() {
                throw new Error(
                    "password SQL database path stack"
                );
            }
        }
    });

    await command.execute(interaction);

    assert.equal(
        interaction.replies[0].content,
        "Audit records could not be retrieved."
    );
    assert.deepEqual(
        logger.errors,
        ["Discord Audit lookup failed."]
    );
    assert.doesNotMatch(
        JSON.stringify(interaction.replies),
        /password|SQL|database path|stack/iu
    );

});

test("prevents oversized Discord responses", async () => {

    const records = Array.from(
        { length: 10 },
        (_, index) => createRecord({
            id: `audit-${20 - index}`,
            actorId: "a".repeat(128),
            targetId: "t".repeat(128),
            action: "x".repeat(64),
            metadata: {
                status: "s".repeat(128),
                referenceId: "r".repeat(128),
                previousState: "p".repeat(128),
                currentState: "c".repeat(128)
            }
        })
    );
    const interaction = createInteraction();
    const command = createCommand({
        queryBoundary: {
            getById() {
                return null;
            },
            list() {
                return {
                    records,
                    nextCursor: "opaque-next-cursor"
                };
            }
        }
    });

    await command.execute(interaction);

    assert.equal(
        interaction.replies[0].content.length <= 1900,
        true
    );
    assert.match(
        interaction.replies[0].content,
        /omitted/u
    );

});