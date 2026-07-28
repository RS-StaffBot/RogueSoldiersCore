const BaseProvider = require("../core/BaseProvider");
const ComponentState = require("../../core/ComponentState");
const SevenDaysToDieCommandService = require(
    "./SevenDaysToDieCommandService"
);

class SevenDaysToDieProvider extends BaseProvider {

    constructor({
        client,
        commandService = null,
        configuration,
        environment = process.env
    } = {}) {

        super("7 Days to Die");

        this.client = client;
        this.commandService = commandService;
        this.configuration = configuration;
        this.environment = environment;
        this.connectionAttempted = false;
        this.connectionOptions = null;

    }

    initialize() {

        this.state = ComponentState.INITIALIZING;

        try {

            this.validateClient();
            this.connectionOptions =
                this.createConnectionOptions();

            if (this.commandService === null) {
                this.commandService = new SevenDaysToDieCommandService({
                    client: this.client,
                    commandTimeoutMs:
                        this.configuration.commandTimeoutMs ?? 5000,
                    inactivityTimeoutMs:
                        this.configuration.inactivityTimeoutMs ?? 250,
                    maximumLines:
                        this.configuration.maximumCommandLines ?? 10000
                });
            }

            this.validateCommandService();
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
                "7 Days to Die Provider must be ready before startup."
            );
        }

        this.state = ComponentState.STARTING;
        this.connectionAttempted = true;

        let startupConnectionLossError = null;

        try {

            await this.client.connect(
                this.connectionOptions,
                error => {

                    const wasStarting =
                        this.state ===
                        ComponentState.STARTING;
                    const connectionLossError =
                        this.handleUnexpectedConnectionLoss(
                            error
                        );

                    if (wasStarting) {
                        startupConnectionLossError =
                            connectionLossError;
                    }

                }
            );

            if (startupConnectionLossError) {
                throw startupConnectionLossError;
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

            if (this.connectionAttempted) {
                await this.client.disconnect();
                this.connectionAttempted = false;
            }

            super.stop();
            return this.getStatus();

        } catch (error) {
            this.setError();
            throw error;
        }

    }

    executeCommand(command, options = {}) {

        if (this.state !== ComponentState.RUNNING) {
            return Promise.reject(new Error(
                "7 Days to Die Provider must be running before command execution."
            ));
        }

        return this.commandService.executeCommand(command, options);

    }

    handleUnexpectedConnectionLoss(error) {

        if (
            this.state === ComponentState.STOPPING ||
            this.state === ComponentState.STOPPED ||
            this.state === ComponentState.ERROR
        ) {
            return null;
        }

        const connectionLossError =
            error instanceof Error
                ? error
                : new Error(
                    "7 Days to Die connection was lost."
                );

        this.setError();

        return connectionLossError;

    }

    validateClient() {

        if (
            !this.client ||
            typeof this.client.connect !== "function" ||
            typeof this.client.disconnect !== "function"
        ) {
            throw new Error(
                "7 Days to Die client must provide connect and " +
                "disconnect operations."
            );
        }

    }

    validateCommandService() {

        if (
            !this.commandService ||
            typeof this.commandService.executeCommand !== "function"
        ) {
            throw new Error(
                "7 Days to Die command service must provide execution."
            );
        }

    }

    createConnectionOptions() {

        const configuration = this.configuration;

        if (
            !configuration ||
            typeof configuration !== "object" ||
            Array.isArray(configuration)
        ) {
            throw new Error(
                "7 Days to Die Provider configuration is required."
            );
        }

        if (configuration.enabled !== true) {
            throw new Error(
                "7 Days to Die Provider configuration must be enabled."
            );
        }

        const host = configuration.host;
        const port = configuration.port;
        const connectionTimeoutMs =
            configuration.connectionTimeoutMs;
        const password =
            this.environment.SEVEN_DAYS_TO_DIE_TELNET_PASSWORD;

        if (
            typeof host !== "string" ||
            host.trim().length === 0
        ) {
            throw new Error(
                "7 Days to Die host must be a non-empty string."
            );
        }

        if (
            !Number.isInteger(port) ||
            port < 1 ||
            port > 65535
        ) {
            throw new Error(
                "7 Days to Die port must be an integer from 1 " +
                "through 65535."
            );
        }

        if (
            !Number.isInteger(connectionTimeoutMs) ||
            connectionTimeoutMs < 1
        ) {
            throw new Error(
                "7 Days to Die connection timeout must be a " +
                "positive integer."
            );
        }

        if (
            typeof password !== "string" ||
            password.length === 0
        ) {
            throw new Error(
                "7 Days to Die Telnet password is required."
            );
        }

        return {
            connectionTimeoutMs,
            host: host.trim(),
            password,
            port
        };

    }

}

module.exports = SevenDaysToDieProvider;
