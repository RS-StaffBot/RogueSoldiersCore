const Application = require("./app/Application");
const Logger = require("./core/Logger");

if (require.main === module) {

    const app = new Application();
    let startupSucceeded = false;
    let shutdownPromise = null;

    const startupPromise = app.start()
        .then(() => {
            startupSucceeded = true;
        })
        .catch(error => {
            Logger.error("Framework startup failed.");
            Logger.error(error.stack || error.message);
            process.exitCode = 1;
        });

    function shutdown(signal) {

        if (shutdownPromise) {
            return shutdownPromise;
        }

        shutdownPromise = (async () => {

            await startupPromise;

            if (!startupSucceeded) {
                return;
            }

            Logger.info(
                `Received ${signal}; stopping framework.`
            );

            try {
                await app.stop();
            } catch (error) {
                Logger.error("Framework shutdown failed.");
                Logger.error(error.stack || error.message);
                process.exitCode = 1;
            }

        })();

        return shutdownPromise;

    }

    process.once("SIGINT", () => {
        shutdown("SIGINT");
    });

    process.once("SIGTERM", () => {
        shutdown("SIGTERM");
    });

}
