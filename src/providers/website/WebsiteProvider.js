const BaseProvider = require("../core/BaseProvider");
const ComponentState = require("../../core/ComponentState");

class WebsiteProvider extends BaseProvider {

    constructor({
        configuration,
        server
    } = {}) {

        super("Website");

        this.configuration = configuration;
        this.server = server;
        this.serverOptions = null;
        this.serverStartAttempted = false;

    }

    initialize() {

        this.state = ComponentState.INITIALIZING;

        try {

            this.validateServer();
            this.serverOptions = this.createServerOptions();

            super.initialize();

            return this.getStatus();

        } catch (error) {
            this.setError();
            throw error;
        }

    }

    async start() {

        if (this.state !== ComponentState.READY) {
            throw new Error(
                "Website Provider must be ready before startup."
            );
        }

        this.state = ComponentState.STARTING;
        this.serverStartAttempted = true;

        let startupServerLossError = null;

        try {

            await this.server.start(
                this.serverOptions,
                error => {

                    const wasStarting =
                        this.state ===
                        ComponentState.STARTING;
                    const serverLossError =
                        this.handleUnexpectedServerLoss(
                            error
                        );

                    if (wasStarting) {
                        startupServerLossError =
                            serverLossError;
                    }

                }
            );

            if (startupServerLossError) {
                throw startupServerLossError;
            }

            super.start();

            return this.getStatus();

        } catch (error) {
            this.setError();
            throw error;
        }

    }

    async stop() {

        if (this.state === ComponentState.STOPPED) {
            return this.getStatus();
        }

        this.state = ComponentState.STOPPING;

        try {

            if (this.serverStartAttempted) {
                await this.server.stop();
                this.serverStartAttempted = false;
            }

            super.stop();

            return this.getStatus();

        } catch (error) {
            this.setError();
            throw error;
        }

    }

    handleUnexpectedServerLoss(error) {

        if (
            this.state === ComponentState.STOPPING ||
            this.state === ComponentState.STOPPED ||
            this.state === ComponentState.ERROR
        ) {
            return null;
        }

        const serverLossError =
            error instanceof Error
                ? error
                : new Error(
                    "Website server was lost."
                );

        this.setError();

        return serverLossError;

    }

    validateServer() {

        if (
            !this.server ||
            typeof this.server.start !== "function" ||
            typeof this.server.stop !== "function"
        ) {
            throw new Error(
                "Website server must provide start and stop operations."
            );
        }

    }

    createServerOptions() {

        const configuration = this.configuration;

        if (
            !configuration ||
            typeof configuration !== "object" ||
            Array.isArray(configuration)
        ) {
            throw new Error(
                "Website Provider configuration is required."
            );
        }

        if (configuration.enabled !== true) {
            throw new Error(
                "Website Provider configuration must be enabled."
            );
        }

        const host = configuration.host;
        const port = configuration.port;
        const requestTimeoutMs =
            configuration.requestTimeoutMs;
        const shutdownTimeoutMs =
            configuration.shutdownTimeoutMs;

        if (host !== "127.0.0.1") {
            throw new Error(
                "Website host must equal 127.0.0.1."
            );
        }

        if (
            !Number.isInteger(port) ||
            port < 1 ||
            port > 65535
        ) {
            throw new Error(
                "Website port must be an integer from 1 through 65535."
            );
        }

        if (
            !Number.isSafeInteger(requestTimeoutMs) ||
            requestTimeoutMs < 1
        ) {
            throw new Error(
                "Website request timeout must be a positive safe integer."
            );
        }

        if (
            !Number.isSafeInteger(shutdownTimeoutMs) ||
            shutdownTimeoutMs < 1
        ) {
            throw new Error(
                "Website shutdown timeout must be a positive safe integer."
            );
        }

        return {
            host,
            port,
            requestTimeoutMs,
            shutdownTimeoutMs
        };

    }

}

module.exports = WebsiteProvider;
