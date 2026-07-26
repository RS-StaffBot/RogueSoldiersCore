const { EventEmitter } = require("node:events");
const { test } = require("node:test");
const assert = require("node:assert/strict");

const ComponentState = require(
    "../../../src/core/ComponentState"
);
const DiscordProvider = require(
    "../../../src/providers/discord/DiscordProvider"
);

class FakeDiscordClient extends EventEmitter {

    constructor({
        login = null,
        destroy = null
    } = {}) {

        super();

        this.loginImplementation = login;
        this.destroyImplementation = destroy;
        this.loginTokens = [];
        this.destroyCount = 0;
        this.ready = false;
        this.user = {
            tag: "TestBot"
        };
        this.guilds = {
            cache: {
                size: 1
            }
        };

    }

    async login(token) {

        this.loginTokens.push(token);

        if (this.loginImplementation) {
            return this.loginImplementation(this);
        }

        this.ready = true;
        this.emit("clientReady");

        return token;

    }

    isReady() {
        return this.ready;
    }

    async destroy() {

        this.destroyCount += 1;

        if (this.destroyImplementation) {
            await this.destroyImplementation();
        }

        this.ready = false;

    }

}

function createHarness({
    client = new FakeDiscordClient(),
    environment = {
        DISCORD_CLIENT_ID: "application-1",
        DISCORD_TOKEN: "token-1"
    },
    register = null
} = {}) {

    const registeredCommands = [];
    const registrarCalls = [];
    const interactionClients = [];
    const command = {
        data: {
            name: "test"
        },
        execute() {}
    };
    const provider = new DiscordProvider({
        commandLoader: {
            load() {
                return [command];
            }
        },
        commandRegistrar: {
            async register(options) {
                registrarCalls.push(options);

                if (register) {
                    return register(options);
                }

                return undefined;
            }
        },
        commandRegistry: {
            clear() {
                registeredCommands.length = 0;
            },
            register(registeredCommand) {
                registeredCommands.push(
                    registeredCommand
                );
            },
            getAll() {
                return [...registeredCommands];
            }
        },
        createClient() {
            return client;
        },
        environment,
        interactionHandler: {
            register(registeredClient) {
                interactionClients.push(
                    registeredClient
                );
            }
        },
        logger: {
            error() {},
            info() {}
        }
    });

    return {
        client,
        interactionClients,
        provider,
        registrarCalls,
        registeredCommands
    };

}

test("initializes the client, commands, and interaction handler", () => {

    const harness = createHarness();

    harness.provider.initialize();

    assert.strictEqual(
        harness.provider.client,
        harness.client
    );
    assert.strictEqual(
        harness.provider.state,
        ComponentState.READY
    );
    assert.deepStrictEqual(
        harness.registeredCommands.map(
            command => command.data.name
        ),
        ["test"]
    );
    assert.deepStrictEqual(
        harness.interactionClients,
        [harness.client]
    );

});

test("reports RUNNING only after readiness and registration", async () => {

    let reportLogin;
    let finishLogin;
    const loginCalled = new Promise(resolve => {
        reportLogin = resolve;
    });
    const client = new FakeDiscordClient({
        login(currentClient) {

            reportLogin();

            return new Promise(resolve => {
                finishLogin = () => {
                    currentClient.ready = true;
                    currentClient.emit("clientReady");
                    resolve("token-1");
                };
            });

        }
    });
    const harness = createHarness({
        client
    });

    harness.provider.initialize();

    assert.strictEqual(
        harness.provider.client,
        harness.client
    );

    const startup = harness.provider.start();

    await loginCalled;

    assert.strictEqual(
        harness.provider.state,
        ComponentState.STARTING
    );
    assert.deepStrictEqual(
        harness.registrarCalls,
        []
    );

    finishLogin();
    await startup;

    assert.strictEqual(
        harness.provider.state,
        ComponentState.RUNNING
    );
    assert.deepStrictEqual(
        harness.client.loginTokens,
        ["token-1"]
    );
    assert.deepStrictEqual(
        harness.registrarCalls,
        [
            {
                applicationId: "application-1",
                token: "token-1"
            }
        ]
    );
    assert.strictEqual(
        harness.client.listenerCount("clientReady"),
        0
    );

});

test("rejects missing Discord configuration", async () => {

    const harness = createHarness({
        environment: {}
    });

    harness.provider.initialize();

    assert.strictEqual(
        harness.provider.client,
        harness.client
    );

    await assert.rejects(
        harness.provider.start(),
        {
            message:
                "Discord token and application ID are required."
        }
    );
    assert.strictEqual(
        harness.provider.state,
        ComponentState.ERROR
    );
    assert.deepStrictEqual(
        harness.client.loginTokens,
        []
    );

});

test("propagates login failure and removes readiness listeners", async () => {

    const loginError = new Error("Login failed.");
    const client = new FakeDiscordClient({
        login() {
            throw loginError;
        }
    });
    const harness = createHarness({
        client
    });

    harness.provider.initialize();

    assert.strictEqual(
        harness.provider.client,
        harness.client
    );

    await assert.rejects(
        harness.provider.start(),
        error => error === loginError
    );
    assert.strictEqual(
        harness.provider.state,
        ComponentState.ERROR
    );
    assert.strictEqual(
        harness.client.listenerCount("clientReady"),
        0
    );
    assert.deepStrictEqual(
        harness.registrarCalls,
        []
    );

});

test("propagates command registration failure", async () => {

    const registrationError = new Error(
        "Registration failed."
    );
    const harness = createHarness({
        register() {
            throw registrationError;
        }
    });

    harness.provider.initialize();

    assert.strictEqual(
        harness.provider.client,
        harness.client
    );

    await assert.rejects(
        harness.provider.start(),
        error => error === registrationError
    );
    assert.strictEqual(
        harness.provider.state,
        ComponentState.ERROR
    );

});

test("safely stops an initialized client and awaits destruction", async () => {

    let finishDestruction;
    const client = new FakeDiscordClient({
        destroy() {
            return new Promise(resolve => {
                finishDestruction = resolve;
            });
        }
    });
    const harness = createHarness({
        client
    });

    harness.provider.initialize();

    assert.strictEqual(
        harness.provider.client,
        harness.client
    );

    const shutdown = harness.provider.stop();

    assert.strictEqual(
        harness.provider.state,
        ComponentState.STOPPING
    );

    finishDestruction();
    await shutdown;

    assert.strictEqual(
        harness.provider.state,
        ComponentState.STOPPED
    );
    assert.strictEqual(harness.provider.client, null);
    assert.strictEqual(harness.client.destroyCount, 1);

    await harness.provider.stop();

    assert.strictEqual(harness.client.destroyCount, 1);

});

test("reports ERROR when client destruction fails", async () => {

    const destructionError = new Error(
        "Destruction failed."
    );
    const client = new FakeDiscordClient({
        destroy() {
            throw destructionError;
        }
    });
    const harness = createHarness({
        client
    });

    harness.provider.initialize();

    assert.strictEqual(
        harness.provider.client,
        harness.client
    );

    await assert.rejects(
        harness.provider.stop(),
        error => error === destructionError
    );
    assert.strictEqual(
        harness.provider.state,
        ComponentState.ERROR
    );

});
