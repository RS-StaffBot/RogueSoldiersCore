const assert = require("node:assert/strict");
const test = require("node:test");

const LifecycleCommand = require(
    "../../../src/providers/discord/commands/LifecycleCommand"
);
const DiscordLifecycleService = require(
    "../../../src/providers/discord/services/DiscordLifecycleService"
);

function createAuthorizer(authorized = true) {
    return {
        getRequiredPermission: () => 32n,
        isAuthorized: () => authorized
    };
}

function createInteraction({
    authorized = true,
    subcommand = "status"
} = {}) {
    const replies = [];
    const deferred = [];
    const edits = [];

    return {
        deferred,
        edits,
        guild: {},
        memberPermissions: {
            has: () => authorized
        },
        options: {
            getSubcommand: () => subcommand
        },
        replies,
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

test("exposes only the fixed 7DTD lifecycle boundary", async () => {
    const calls = [];
    const manager = {
        getProviderStatus(name) {
            calls.push(["status", name]);
            return Object.freeze({ name, state: "RUNNING" });
        },
        restartProvider(name) {
            calls.push(["restart", name]);
            return Promise.resolve({ succeeded: true });
        },
        replaceProvider(name, factory) {
            calls.push(["reload", name]);
            return Promise.resolve(factory()).then(() => ({ succeeded: true }));
        }
    };
    const service = new DiscordLifecycleService({
        createReplacement: () => ({ name: "candidate" }),
        providerManager: manager
    }).asBoundary();

    assert.deepEqual(Object.keys(service).sort(), [
        "getStatus",
        "reload",
        "restart"
    ]);
    assert.equal(Object.isFrozen(service), true);

    service.getStatus();
    await service.restart();
    await service.reload();

    assert.deepEqual(calls, [
        ["status", "7 Days to Die"],
        ["restart", "7 Days to Die"],
        ["reload", "7 Days to Die"]
    ]);
});

test("registers a guild-only ManageGuild lifecycle command", () => {
    const command = new LifecycleCommand({
        authorizer: createAuthorizer(),
        lifecycleService: {
            getStatus() {},
            reload() {},
            restart() {}
        }
    });
    const definition = command.data.toJSON();

    assert.equal(definition.name, "lifecycle");
    assert.equal(definition.dm_permission, false);
    assert.equal(definition.default_member_permissions, "32");
    assert.deepEqual(
        definition.options.map(option => option.name),
        ["status", "restart", "reload"]
    );
});

test("denies unauthorized lifecycle requests ephemerally", async () => {
    const interaction = createInteraction({ authorized: false });
    const command = new LifecycleCommand({
        authorizer: createAuthorizer(false),
        lifecycleService: {
            getStatus() {
                throw new Error("must not run");
            },
            reload() {
                throw new Error("must not run");
            },
            restart() {
                throw new Error("must not run");
            }
        }
    });

    await command.execute(interaction);

    assert.equal(interaction.replies.length, 1);
    assert.match(interaction.replies[0].content, /do not have permission/u);
    assert.equal(interaction.deferred.length, 0);
});

test("reports private lifecycle status without internal details", async () => {
    const interaction = createInteraction();
    const command = new LifecycleCommand({
        authorizer: createAuthorizer(),
        lifecycleService: {
            getStatus: () => Object.freeze({
                componentType: "PROVIDER",
                initialized: true,
                name: "7 Days to Die",
                operational: true,
                state: "RUNNING"
            }),
            reload() {},
            restart() {}
        }
    });

    await command.execute(interaction);

    assert.equal(interaction.replies.length, 1);
    assert.match(interaction.replies[0].content, /RUNNING/u);
    assert.doesNotMatch(
        interaction.replies[0].content,
        /password|host|port|socket|stack/iu
    );
});

test("executes restart privately and sanitizes failures", async () => {
    const success = createInteraction({ subcommand: "restart" });
    const failed = createInteraction({ subcommand: "reload" });
    const command = new LifecycleCommand({
        authorizer: createAuthorizer(),
        lifecycleService: {
            getStatus() {},
            reload: async () => Object.freeze({
                outcome: "FAILED",
                state: "ERROR",
                privateError: "password host socket stack"
            }),
            restart: async () => Object.freeze({
                outcome: "SUCCEEDED",
                state: "RUNNING",
                succeeded: true
            })
        }
    });

    await command.execute(success);
    await command.execute(failed);

    assert.equal(success.deferred.length, 1);
    assert.match(success.edits[0].content, /completed successfully/u);
    assert.equal(failed.deferred.length, 1);
    assert.match(failed.edits[0].content, /did not complete/u);
    assert.doesNotMatch(
        failed.edits[0].content,
        /password|host|socket|stack/iu
    );
});
