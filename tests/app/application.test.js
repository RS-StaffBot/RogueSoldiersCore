const { test } = require("node:test");
const assert = require("node:assert/strict");

function loadApplication(bootstrap) {

    const applicationPath = require.resolve(
        "../../src/app/Application"
    );
    const bootstrapPath = require.resolve(
        "../../src/bootstrap/Bootstrap"
    );
    const previousBootstrap =
        require.cache[bootstrapPath];

    require.cache[bootstrapPath] = {
        id: bootstrapPath,
        filename: bootstrapPath,
        loaded: true,
        exports: bootstrap,
        children: [],
        paths: []
    };
    delete require.cache[applicationPath];

    const Application = require(applicationPath);

    return {
        Application,
        restore() {

            delete require.cache[applicationPath];

            if (previousBootstrap) {
                require.cache[bootstrapPath] =
                    previousBootstrap;
            } else {
                delete require.cache[bootstrapPath];
            }

        }
    };

}

test("start waits for Bootstrap startup", async () => {

    let finishStartup;
    let startupFinished = false;
    const bootstrap = {
        start() {
            return new Promise(resolve => {
                finishStartup = () => {
                    startupFinished = true;
                    resolve();
                };
            });
        },
        stop() {}
    };
    const loaded = loadApplication(bootstrap);

    try {

        const application = new loaded.Application();
        const startup = application.start();

        assert.strictEqual(startupFinished, false);

        finishStartup();
        await startup;

        assert.strictEqual(startupFinished, true);

    } finally {
        loaded.restore();
    }

});

test("start propagates Bootstrap startup rejection", async () => {

    const startupError = new Error(
        "Bootstrap startup failed."
    );
    const bootstrap = {
        async start() {
            throw startupError;
        },
        stop() {}
    };
    const loaded = loadApplication(bootstrap);

    try {

        const application = new loaded.Application();

        await assert.rejects(
            application.start(),
            error => error === startupError
        );

    } finally {
        loaded.restore();
    }

});

test("stop waits for and propagates Bootstrap shutdown", async () => {

    let finishShutdown;
    const shutdownError = new Error(
        "Bootstrap shutdown failed."
    );
    const bootstrap = {
        start() {},
        stop() {
            return new Promise((resolve, reject) => {
                finishShutdown = () => {
                    reject(shutdownError);
                };
            });
        }
    };
    const loaded = loadApplication(bootstrap);

    try {

        const application = new loaded.Application();
        const shutdown = application.stop();

        finishShutdown();

        await assert.rejects(
            shutdown,
            error => error === shutdownError
        );

    } finally {
        loaded.restore();
    }

});
