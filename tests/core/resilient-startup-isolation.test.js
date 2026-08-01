const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ComponentState = require(
    "../../src/core/ComponentState"
);
const Logger = require("../../src/core/Logger");
const ProviderManager = require(
    "../../src/providers/core/ProviderManager"
);
const ModuleManager = require(
    "../../src/modules/core/ModuleManager"
);

const RESULT_MARKER = "__RSF_RESULT__";

function createComponent({
    failInitialize = false,
    failStart = false,
    name
}) {
    return {
        name,
        state: ComponentState.CREATED,
        initialize() {
            this.state = ComponentState.INITIALIZING;
            if (failInitialize) {
                throw new Error(
                    "private initialization detail at D:\\private\\file.js"
                );
            }
            this.state = ComponentState.READY;
        },
        start() {
            this.state = ComponentState.STARTING;
            if (failStart) {
                throw new Error(
                    "private startup detail at D:\\private\\file.js"
                );
            }
            this.state = ComponentState.RUNNING;
        },
        stop() {
            this.state = ComponentState.STOPPED;
        },
        setError() {
            this.state = ComponentState.ERROR;
        }
    };
}

async function withCapturedErrors(action) {
    const originalError = Logger.error;
    const errors = [];
    Logger.error = message => errors.push(String(message));
    try {
        return {
            errors,
            result: await action()
        };
    } finally {
        Logger.error = originalError;
    }
}

function parseChildResult(child) {
    assert.strictEqual(child.status, 0, child.stderr);
    const markerIndex = child.stdout.lastIndexOf(RESULT_MARKER);
    assert.notStrictEqual(markerIndex, -1, child.stdout);
    return JSON.parse(
        child.stdout.slice(markerIndex + RESULT_MARKER.length)
    );
}

test("Provider lifecycle failures are isolated and summarized safely", async () => {

    ProviderManager.providers.clear();
    const healthy = createComponent({ name: "Discord" });
    const failed = createComponent({
        failStart: true,
        name: "7 Days to Die"
    });
    ProviderManager.register(healthy);
    ProviderManager.register(failed);

    const initialization = await ProviderManager.initializeAll();
    const captured = await withCapturedErrors(
        () => ProviderManager.startAll()
    );
    const startup = captured.result;

    assert.strictEqual(initialization.failed, 0);
    assert.strictEqual(startup.processed, 2);
    assert.strictEqual(startup.succeeded, 1);
    assert.strictEqual(startup.failed, 1);
    assert.strictEqual(healthy.state, ComponentState.RUNNING);
    assert.strictEqual(failed.state, ComponentState.ERROR);
    assert.ok(Object.isFrozen(startup));
    assert.ok(Object.isFrozen(startup.results));
    assert.ok(startup.results.every(Object.isFrozen));
    assert.strictEqual(
        JSON.stringify(startup).includes("private startup detail"),
        false
    );
    assert.ok(
        captured.errors.some(
            message => message.includes("failed to start")
        )
    );
    assert.strictEqual(
        captured.errors.some(
            message => message.includes("private startup detail")
        ),
        false
    );
    assert.strictEqual(
        captured.errors.some(message => message.includes("D:\\private")),
        false
    );

    ProviderManager.providers.clear();

});

test("Module lifecycle failures do not stop unrelated Modules", async () => {

    ModuleManager.modules.clear();
    const failed = createComponent({
        failInitialize: true,
        name: "Broken Module"
    });
    const healthy = createComponent({ name: "Identity" });
    ModuleManager.register(failed);
    ModuleManager.register(healthy);

    const captured = await withCapturedErrors(
        () => ModuleManager.initializeAll()
    );
    const initialization = captured.result;
    const startup = await ModuleManager.startAll();

    assert.strictEqual(initialization.failed, 1);
    assert.strictEqual(initialization.succeeded, 1);
    assert.strictEqual(failed.state, ComponentState.ERROR);
    assert.strictEqual(healthy.state, ComponentState.RUNNING);
    assert.strictEqual(startup.succeeded, 1);
    assert.strictEqual(startup.failed, 1);
    assert.strictEqual(
        JSON.stringify(initialization).includes(
            "private initialization detail"
        ),
        false
    );
    assert.strictEqual(
        captured.errors.some(
            message => message.includes("private initialization detail")
        ),
        false
    );
    assert.strictEqual(
        captured.errors.some(message => message.includes("D:\\private")),
        false
    );

    ModuleManager.modules.clear();

});

test("degraded startup preserves healthy layers and reports outcome", () => {

    const repositoryRoot = path.resolve(__dirname, "../..");
    const script = String.raw`
        const ComponentState = require('./src/core/ComponentState');
        const Logger = require('./src/core/Logger');
        const Registry = require('./src/core/Registry');
        const Configuration = require(
            './src/configuration/ConfigurationManager'
        );
        const DatabaseService = require(
            './src/core/database/DatabaseService'
        );
        const ModuleLoader = require(
            './src/modules/core/ModuleLoader'
        );
        const ProviderLoader = require(
            './src/providers/core/ProviderLoader'
        );
        const ModuleManager = require(
            './src/modules/core/ModuleManager'
        );
        const ProviderManager = require(
            './src/providers/core/ProviderManager'
        );

        const messages = [];
        Logger.info = message => messages.push(['info', message]);
        Logger.warn = message => messages.push(['warn', message]);
        Logger.error = message => messages.push(['error', message]);
        Configuration.load = () => {};
        Configuration.get = key => key === 'core.app.name'
            ? 'Test Framework'
            : '1.4.0';
        Registry.services.clear();
        ModuleManager.modules.clear();
        ProviderManager.providers.clear();

        DatabaseService.prototype.initialize = function () {
            this.state = ComponentState.READY;
        };
        DatabaseService.prototype.start = async function () {
            this.state = ComponentState.RUNNING;
        };
        DatabaseService.prototype.stop = async function () {
            this.state = ComponentState.STOPPED;
        };
        DatabaseService.prototype.checkHealth = () => true;

        function component(name, failStart = false) {
            return {
                name,
                state: ComponentState.CREATED,
                initialize() {
                    this.state = ComponentState.READY;
                },
                start() {
                    if (failStart) {
                        throw new Error(
                            'private external detail at D:\\private\\file.js'
                        );
                    }
                    this.state = ComponentState.RUNNING;
                },
                stop() {
                    this.state = ComponentState.STOPPED;
                },
                setError() {
                    this.state = ComponentState.ERROR;
                }
            };
        }

        ModuleLoader.load = () => [component('Identity')];
        ProviderLoader.load = () => [
            component('Discord'),
            component('7 Days to Die', true)
        ];

        const Bootstrap = require('./src/bootstrap/Bootstrap');

        Bootstrap.start().then(async result => {
            const database = Registry.get('database');
            const beforeStop = database.state;
            const providerStates = ProviderManager.list().map(name => ({
                name,
                state: ProviderManager.get(name).state
            }));
            const moduleStates = ModuleManager.list().map(name => ({
                name,
                state: ModuleManager.get(name).state
            }));
            await Bootstrap.stop();
            process.stdout.write(
                '${RESULT_MARKER}' + JSON.stringify({
                    beforeStop,
                    databaseAfterStop: database.state,
                    messages,
                    moduleStates,
                    outcome: result.outcome,
                    providerStates
                })
            );
        }).catch(error => {
            process.stderr.write(error.stack || error.message);
            process.exitCode = 1;
        });
    `;

    const child = spawnSync(
        process.execPath,
        ["-e", script],
        {
            cwd: repositoryRoot,
            encoding: "utf8"
        }
    );

    const result = parseChildResult(child);
    assert.strictEqual(result.outcome, "STARTED_DEGRADED");
    assert.strictEqual(result.beforeStop, ComponentState.RUNNING);
    assert.strictEqual(
        result.databaseAfterStop,
        ComponentState.STOPPED
    );
    assert.deepStrictEqual(result.providerStates, [
        { name: "Discord", state: ComponentState.RUNNING },
        { name: "7 Days to Die", state: ComponentState.ERROR }
    ]);
    assert.deepStrictEqual(result.moduleStates, [
        { name: "Identity", state: ComponentState.RUNNING }
    ]);
    assert.ok(
        result.messages.some(
            entry =>
                entry[0] === "warn" &&
                entry[1] === "Framework started in degraded mode."
        )
    );
    assert.strictEqual(
        JSON.stringify(result.messages).includes("private external detail"),
        false
    );
    assert.strictEqual(
        JSON.stringify(result.messages).includes("D:\\private"),
        false
    );

});

test("Database startup failure remains fatal", () => {

    const repositoryRoot = path.resolve(__dirname, "../..");
    const script = String.raw`
        const ComponentState = require('./src/core/ComponentState');
        const Logger = require('./src/core/Logger');
        const Registry = require('./src/core/Registry');
        const Configuration = require(
            './src/configuration/ConfigurationManager'
        );
        const DatabaseService = require(
            './src/core/database/DatabaseService'
        );
        const ModuleLoader = require(
            './src/modules/core/ModuleLoader'
        );

        Logger.info = () => {};
        Logger.warn = () => {};
        Logger.error = () => {};
        Configuration.load = () => {};
        Configuration.get = () => 'test';
        Registry.services.clear();
        let modulesLoaded = false;
        ModuleLoader.load = () => {
            modulesLoaded = true;
            return [];
        };
        DatabaseService.prototype.initialize = function () {
            this.state = ComponentState.READY;
        };
        DatabaseService.prototype.start = async function () {
            throw new Error('database unavailable');
        };
        DatabaseService.prototype.stop = async function () {
            this.state = ComponentState.STOPPED;
        };

        const Bootstrap = require('./src/bootstrap/Bootstrap');
        Bootstrap.start().then(() => {
            process.exitCode = 1;
        }).catch(error => {
            process.stdout.write(
                '${RESULT_MARKER}' + JSON.stringify({
                    message: error.message,
                    modulesLoaded
                })
            );
        });
    `;

    const child = spawnSync(
        process.execPath,
        ["-e", script],
        {
            cwd: repositoryRoot,
            encoding: "utf8"
        }
    );

    const result = parseChildResult(child);
    assert.strictEqual(result.message, "database unavailable");
    assert.strictEqual(result.modulesLoaded, false);

});
