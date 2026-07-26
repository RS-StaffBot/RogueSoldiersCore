const { test } = require("node:test");
const assert = require("node:assert/strict");

function createHarness({
    providerStart = null,
    providerStop = null,
    moduleStop = null,
    databaseStop = null
} = {}) {

    const events = [];
    const logs = [];
    const errors = [];
    const database = {
        name: "Database",
        state: "RUNNING",
        initialize() {
            events.push("database:initialize");
        },
        start() {
            events.push("database:start");
        },
        stop() {
            events.push("database:stop");

            if (databaseStop) {
                return databaseStop();
            }

            return undefined;
        },
        checkHealth() {
            return true;
        }
    };
    const module = {
        name: "TestModule",
        state: "RUNNING"
    };
    const provider = {
        name: "TestProvider",
        state: "RUNNING"
    };
    const fakes = {
        Logger: {
            info(message) {
                logs.push(message);
            },
            error(message) {
                errors.push(message);
            }
        },
        Registry: {
            register(name) {
                events.push(`registry:${name}`);
            }
        },
        EventBus: {},
        DatabaseService: class {
            constructor() {
                return database;
            }
        },
        DatabaseMigrationLoader: {
            load() {
                return [];
            }
        },
        Configuration: {
            load() {
                events.push("configuration:load");
            },
            get(key) {
                return key === "core.app.name"
                    ? "Test Framework"
                    : "0.8.0";
            }
        },
        ModuleManager: {
            register(registeredModule) {
                assert.strictEqual(
                    registeredModule,
                    module
                );
                events.push("module:register");
            },
            async initializeAll() {
                events.push("module:initialize");
            },
            async startAll() {
                events.push("module:start");
            },
            async stopAll() {
                events.push("module:stop");

                if (moduleStop) {
                    return moduleStop();
                }

                return undefined;
            },
            list() {
                return [module.name];
            },
            get() {
                return module;
            }
        },
        ModuleLoader: {
            load({ database: receivedDatabase }) {
                assert.strictEqual(
                    receivedDatabase,
                    database
                );
                events.push("module:load");

                return [module];
            }
        },
        ProviderManager: {
            register(registeredProvider) {
                assert.strictEqual(
                    registeredProvider,
                    provider
                );
                events.push("provider:register");
            },
            async initializeAll() {
                events.push("provider:initialize");
            },
            async startAll() {
                events.push("provider:start");

                if (providerStart) {
                    return providerStart();
                }

                return undefined;
            },
            async stopAll() {
                events.push("provider:stop");

                if (providerStop) {
                    return providerStop();
                }

                return undefined;
            },
            list() {
                return [provider.name];
            },
            get() {
                return provider;
            }
        },
        ProviderLoader: {
            load() {
                events.push("provider:load");

                return [provider];
            }
        }
    };

    return {
        database,
        errors,
        events,
        fakes,
        logs
    };

}

function loadBootstrap(fakes) {

    const bootstrapPath = require.resolve(
        "../../src/bootstrap/Bootstrap"
    );
    const replacements = new Map([
        ["../../src/core/Logger", fakes.Logger],
        ["../../src/core/Registry", fakes.Registry],
        ["../../src/core/EventBus", fakes.EventBus],
        [
            "../../src/core/database/DatabaseService",
            fakes.DatabaseService
        ],
        [
            "../../src/core/database/DatabaseMigrationLoader",
            fakes.DatabaseMigrationLoader
        ],
        [
            "../../src/configuration/ConfigurationManager",
            fakes.Configuration
        ],
        [
            "../../src/providers/core/ProviderManager",
            fakes.ProviderManager
        ],
        [
            "../../src/providers/core/ProviderLoader",
            fakes.ProviderLoader
        ],
        [
            "../../src/modules/core/ModuleManager",
            fakes.ModuleManager
        ],
        [
            "../../src/modules/core/ModuleLoader",
            fakes.ModuleLoader
        ]
    ]);
    const previousEntries = new Map();

    for (const [request, replacement] of replacements) {

        const resolvedPath = require.resolve(request);

        previousEntries.set(
            resolvedPath,
            require.cache[resolvedPath]
        );
        require.cache[resolvedPath] = {
            id: resolvedPath,
            filename: resolvedPath,
            loaded: true,
            exports: replacement,
            children: [],
            paths: []
        };

    }

    delete require.cache[bootstrapPath];

    const Bootstrap = require(bootstrapPath);

    return {
        Bootstrap,
        restore() {

            delete require.cache[bootstrapPath];

            for (
                const [resolvedPath, previousEntry]
                of previousEntries
            ) {

                if (previousEntry) {
                    require.cache[resolvedPath] =
                        previousEntry;
                } else {
                    delete require.cache[resolvedPath];
                }

            }

        }
    };

}

test("starts dependencies in the required order", async () => {

    const harness = createHarness();
    const loaded = loadBootstrap(harness.fakes);

    try {

        await loaded.Bootstrap.start();

        assert.deepStrictEqual(
            harness.events,
            [
                "configuration:load",
                "registry:logger",
                "registry:config",
                "registry:eventBus",
                "registry:database",
                "registry:providers",
                "registry:modules",
                "database:initialize",
                "database:start",
                "module:load",
                "module:register",
                "module:initialize",
                "module:start",
                "provider:load",
                "provider:register",
                "provider:initialize",
                "provider:start"
            ]
        );

    } finally {
        loaded.restore();
    }

});

test("waits for Provider startup before reporting success", async () => {

    let finishProviderStart;
    let reportProviderStart;
    const providerStartCalled = new Promise(resolve => {
        reportProviderStart = resolve;
    });
    const providerStart = () => {

        reportProviderStart();

        return new Promise(resolve => {
            finishProviderStart = resolve;
        });

    };
    const harness = createHarness({
        providerStart
    });
    const loaded = loadBootstrap(harness.fakes);

    try {

        const startup = loaded.Bootstrap.start();

        await providerStartCalled;

        assert.strictEqual(
            harness.logs.includes(
                "Framework started successfully."
            ),
            false
        );

        finishProviderStart();
        await startup;

        assert.strictEqual(
            harness.logs.includes(
                "Framework started successfully."
            ),
            true
        );

    } finally {
        loaded.restore();
    }

});

test("rolls back startup and preserves the original error", async () => {

    const startupError = new Error(
        "Provider startup failed."
    );
    const providerStart = () => {
        throw startupError;
    };
    const providerStop = () => {
        throw new Error("Provider cleanup failed.");
    };
    const harness = createHarness({
        providerStart,
        providerStop
    });
    const loaded = loadBootstrap(harness.fakes);

    try {

        await assert.rejects(
            loaded.Bootstrap.start(),
            error => error === startupError
        );
        assert.deepStrictEqual(
            harness.events.slice(-4),
            [
                "provider:start",
                "provider:stop",
                "module:stop",
                "database:stop"
            ]
        );
        assert.strictEqual(
            harness.errors.some(message =>
                message.includes(
                    "Provider cleanup failed."
                )
            ),
            true
        );
        assert.strictEqual(
            harness.logs.includes(
                "Framework started successfully."
            ),
            false
        );

    } finally {
        loaded.restore();
    }

});

test("stops every dependency layer in reverse order", async () => {

    const providerStop = () => {
        throw new Error("Provider shutdown failed.");
    };
    const harness = createHarness({
        providerStop
    });
    const loaded = loadBootstrap(harness.fakes);

    try {

        await assert.rejects(
            loaded.Bootstrap.stop(),
            {
                message:
                    "Framework shutdown encountered errors."
            }
        );
        assert.deepStrictEqual(
            harness.events,
            [
                "provider:stop",
                "module:stop",
                "database:stop"
            ]
        );
        assert.strictEqual(
            harness.logs.includes(
                "Framework stopped successfully."
            ),
            false
        );

    } finally {
        loaded.restore();
    }

});
