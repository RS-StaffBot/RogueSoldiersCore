const { EventEmitter } = require("node:events");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const ApplicationProcess = require(
    "../../src/app/ApplicationProcess"
);

function createDeferred() {

    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });

    return {
        promise,
        resolve,
        reject
    };

}

function createProcessBoundary() {

    const processRef = new EventEmitter();
    processRef.exitCode = undefined;
    return processRef;

}

function createLogger() {

    const entries = [];

    return {
        entries,
        info(message) {
            entries.push({ level: "info", message });
        },
        error(message) {
            entries.push({ level: "error", message });
        }
    };

}

test("run waits for successful application startup", async () => {

    const startup = createDeferred();
    let startCalls = 0;
    const application = {
        start() {
            startCalls += 1;
            return startup.promise;
        },
        stop() {}
    };
    const processRef = createProcessBoundary();
    const runner = new ApplicationProcess({
        application,
        logger: createLogger(),
        processRef
    });

    const running = runner.run();

    assert.strictEqual(startCalls, 0);
    await Promise.resolve();
    assert.strictEqual(startCalls, 1);

    startup.resolve();
    await running;

    assert.strictEqual(runner.startupSucceeded, true);
    assert.strictEqual(processRef.exitCode, undefined);

});

test("startup failure sets a nonzero process exit code", async () => {

    const startupError = new Error("startup failed");
    const logger = createLogger();
    const processRef = createProcessBoundary();
    const runner = new ApplicationProcess({
        application: {
            async start() {
                throw startupError;
            },
            stop() {}
        },
        logger,
        processRef
    });

    await runner.run();

    assert.strictEqual(runner.startupSucceeded, false);
    assert.strictEqual(processRef.exitCode, 1);
    assert.deepStrictEqual(logger.entries, [
        {
            level: "error",
            message: "Framework startup failed."
        },
        {
            level: "error",
            message: startupError.stack
        }
    ]);

});

test("SIGINT triggers one graceful shutdown", async () => {

    let stopCalls = 0;
    const logger = createLogger();
    const processRef = createProcessBoundary();
    const runner = new ApplicationProcess({
        application: {
            async start() {},
            async stop() {
                stopCalls += 1;
            }
        },
        logger,
        processRef
    });

    await runner.run();
    processRef.emit("SIGINT");
    await runner.shutdownPromise;

    assert.strictEqual(stopCalls, 1);
    assert.deepStrictEqual(logger.entries, [
        {
            level: "info",
            message: "Received SIGINT; stopping framework."
        }
    ]);

});

test("SIGTERM triggers one graceful shutdown", async () => {

    let stopCalls = 0;
    const processRef = createProcessBoundary();
    const runner = new ApplicationProcess({
        application: {
            async start() {},
            async stop() {
                stopCalls += 1;
            }
        },
        logger: createLogger(),
        processRef
    });

    await runner.run();
    processRef.emit("SIGTERM");
    await runner.shutdownPromise;

    assert.strictEqual(stopCalls, 1);

});

test("repeated signals share one shutdown operation", async () => {

    const shutdown = createDeferred();
    let stopCalls = 0;
    const processRef = createProcessBoundary();
    const runner = new ApplicationProcess({
        application: {
            async start() {},
            stop() {
                stopCalls += 1;
                return shutdown.promise;
            }
        },
        logger: createLogger(),
        processRef
    });

    await runner.run();
    processRef.emit("SIGINT");
    processRef.emit("SIGTERM");
    await Promise.resolve();

    assert.strictEqual(stopCalls, 1);

    shutdown.resolve();
    await runner.shutdownPromise;
    assert.strictEqual(stopCalls, 1);

});

test("a signal during startup waits before stopping", async () => {

    const startup = createDeferred();
    let stopCalls = 0;
    const processRef = createProcessBoundary();
    const runner = new ApplicationProcess({
        application: {
            start() {
                return startup.promise;
            },
            async stop() {
                stopCalls += 1;
            }
        },
        logger: createLogger(),
        processRef
    });

    runner.run();
    await Promise.resolve();
    processRef.emit("SIGTERM");
    await Promise.resolve();

    assert.strictEqual(stopCalls, 0);

    startup.resolve();
    await runner.shutdownPromise;

    assert.strictEqual(stopCalls, 1);

});

test("failed startup does not call application stop", async () => {

    const startup = createDeferred();
    let stopCalls = 0;
    const processRef = createProcessBoundary();
    const runner = new ApplicationProcess({
        application: {
            start() {
                return startup.promise;
            },
            async stop() {
                stopCalls += 1;
            }
        },
        logger: createLogger(),
        processRef
    });

    runner.run();
    await Promise.resolve();
    processRef.emit("SIGINT");
    startup.reject(new Error("startup failed"));
    await runner.shutdownPromise;

    assert.strictEqual(stopCalls, 0);
    assert.strictEqual(processRef.exitCode, 1);

});

test("shutdown failure sets a nonzero process exit code", async () => {

    const shutdownError = new Error("shutdown failed");
    const logger = createLogger();
    const processRef = createProcessBoundary();
    const runner = new ApplicationProcess({
        application: {
            async start() {},
            async stop() {
                throw shutdownError;
            }
        },
        logger,
        processRef
    });

    await runner.run();
    processRef.emit("SIGTERM");
    await runner.shutdownPromise;

    assert.strictEqual(processRef.exitCode, 1);
    assert.deepStrictEqual(logger.entries, [
        {
            level: "info",
            message: "Received SIGTERM; stopping framework."
        },
        {
            level: "error",
            message: "Framework shutdown failed."
        },
        {
            level: "error",
            message: shutdownError.stack
        }
    ]);

});
