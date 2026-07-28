const assert = require("node:assert/strict");
const test = require("node:test");

const ComponentState = require(
    "../../../src/core/ComponentState"
);
const DiscordGameServerProviderResolver = require(
    "../../../src/providers/discord/services/DiscordGameServerProviderResolver"
);

const Status = DiscordGameServerProviderResolver.Status;

function createProvider(overrides = {}) {
    return {
        client: { password: "secret", socket: {} },
        configuration: { host: "127.0.0.1", port: 8081 },
        environment: {
            SEVEN_DAYS_TO_DIE_TELNET_PASSWORD: "secret"
        },
        executeCommand(command, options) {
            return {
                command,
                context: this.name,
                options
            };
        },
        name: "7 Days to Die",
        state: ComponentState.RUNNING,
        ...overrides
    };
}

test("resolves a running 7 Days to Die Provider through a narrow boundary", () => {

    const provider = createProvider();
    const resolver = new DiscordGameServerProviderResolver({
        resolveProvider(name) {
            assert.equal(name, "7 Days to Die");
            return provider;
        }
    });

    const result = resolver.resolve();

    assert.equal(result.available, true);
    assert.equal(result.status, Status.AVAILABLE);
    assert.deepEqual(Object.keys(result.service), [
        "executeCommand"
    ]);
    assert.deepEqual(
        result.service.executeCommand("gettime", {
            timeoutMs: 1000
        }),
        {
            command: "gettime",
            context: "7 Days to Die",
            options: {
                timeoutMs: 1000
            }
        }
    );
    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.service), true);

});

test("reports a missing or disabled Provider as unavailable", () => {

    for (const provider of [undefined, null]) {
        const resolver = new DiscordGameServerProviderResolver({
            resolveProvider() {
                return provider;
            }
        });

        assert.deepEqual(
            resolver.resolve(),
            {
                available: false,
                status: Status.PROVIDER_UNAVAILABLE
            }
        );
    }

});

test("normalizes Provider Manager resolution failures", () => {

    const resolver = new DiscordGameServerProviderResolver({
        resolveProvider() {
            throw new Error("internal Provider Manager detail");
        }
    });

    assert.deepEqual(
        resolver.resolve(),
        {
            available: false,
            status: Status.PROVIDER_UNAVAILABLE
        }
    );

});

test("reports every non-running lifecycle state as not ready", () => {

    const nonRunningStates = Object.values(ComponentState).filter(
        state => state !== ComponentState.RUNNING
    );

    for (const state of nonRunningStates) {
        const resolver = new DiscordGameServerProviderResolver({
            resolveProvider() {
                return createProvider({ state });
            }
        });

        assert.deepEqual(
            resolver.resolve(),
            {
                available: false,
                status: Status.PROVIDER_NOT_READY
            }
        );
    }

});

test("rejects invalid Provider identities and structures", () => {

    const invalidProviders = [
        "7 Days to Die",
        [],
        {},
        createProvider({ name: "Other Provider" })
    ];

    for (const provider of invalidProviders) {
        const resolver = new DiscordGameServerProviderResolver({
            resolveProvider() {
                return provider;
            }
        });

        assert.deepEqual(
            resolver.resolve(),
            {
                available: false,
                status: Status.INVALID_PROVIDER_BOUNDARY
            }
        );
    }

});

test("rejects missing and non-function executeCommand boundaries", () => {

    for (const executeCommand of [undefined, null, true, {}]) {
        const resolver = new DiscordGameServerProviderResolver({
            resolveProvider() {
                return createProvider({ executeCommand });
            }
        });

        assert.deepEqual(
            resolver.resolve(),
            {
                available: false,
                status: Status.INVALID_PROVIDER_BOUNDARY
            }
        );
    }

});

test("does not expose Provider internals or Telnet secrets", () => {

    const resolver = new DiscordGameServerProviderResolver({
        resolveProvider() {
            return createProvider();
        }
    });

    const result = resolver.resolve();
    const serialized = JSON.stringify(result);

    assert.deepEqual(Object.keys(result), [
        "available",
        "service",
        "status"
    ]);
    assert.equal(serialized.includes("password"), false);
    assert.equal(serialized.includes("configuration"), false);
    assert.equal(serialized.includes("client"), false);
    assert.equal(serialized.includes("socket"), false);
    assert.equal(serialized.includes("registry"), false);
    assert.equal(serialized.includes("providerManager"), false);
    assert.equal(serialized.includes("secret"), false);

});

test("requires an injected Provider resolver", () => {

    for (const resolveProvider of [
        undefined,
        null,
        true,
        {}
    ]) {
        assert.throws(
            () => new DiscordGameServerProviderResolver({
                resolveProvider
            }),
            /Provider resolver must be a function/
        );
    }

});
