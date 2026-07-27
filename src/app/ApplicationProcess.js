const Application = require("./Application");
const Logger = require("../core/Logger");

class ApplicationProcess {

    constructor({
        application = new Application(),
        logger = Logger,
        processRef = process
    } = {}) {

        if (
            !application ||
            typeof application.start !== "function" ||
            typeof application.stop !== "function"
        ) {
            throw new TypeError(
                "ApplicationProcess requires an application with start and stop methods."
            );
        }

        if (
            !logger ||
            typeof logger.info !== "function" ||
            typeof logger.error !== "function"
        ) {
            throw new TypeError(
                "ApplicationProcess requires a logger with info and error methods."
            );
        }

        if (
            !processRef ||
            typeof processRef.once !== "function"
        ) {
            throw new TypeError(
                "ApplicationProcess requires a process boundary with a once method."
            );
        }

        this.application = application;
        this.logger = logger;
        this.processRef = processRef;
        this.startupSucceeded = false;
        this.startupPromise = null;
        this.shutdownPromise = null;

    }

    run() {

        if (this.startupPromise) {
            return this.startupPromise;
        }

        this.processRef.once("SIGINT", () => {
            this.shutdown("SIGINT");
        });

        this.processRef.once("SIGTERM", () => {
            this.shutdown("SIGTERM");
        });

        this.startupPromise = Promise.resolve()
            .then(() => this.application.start())
            .then(() => {
                this.startupSucceeded = true;
            })
            .catch(error => {
                this.logger.error("Framework startup failed.");
                this.logger.error(error.stack || error.message);
                this.processRef.exitCode = 1;
            });

        return this.startupPromise;

    }

    shutdown(signal) {

        if (this.shutdownPromise) {
            return this.shutdownPromise;
        }

        this.shutdownPromise = (async () => {

            if (this.startupPromise) {
                await this.startupPromise;
            }

            if (!this.startupSucceeded) {
                return;
            }

            this.logger.info(
                `Received ${signal}; stopping framework.`
            );

            try {
                await this.application.stop();
            } catch (error) {
                this.logger.error("Framework shutdown failed.");
                this.logger.error(error.stack || error.message);
                this.processRef.exitCode = 1;
            }

        })();

        return this.shutdownPromise;

    }

}

module.exports = ApplicationProcess;
