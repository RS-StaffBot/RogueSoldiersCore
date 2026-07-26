const BaseProvider = require("../core/BaseProvider");
const ComponentState = require("../../core/ComponentState");
const Logger = require("../../core/Logger");

const {
    Client,
    GatewayIntentBits
} = require("discord.js");

const CommandLoader = require("./commands/CommandLoader");
const InteractionHandler = require("./handlers/InteractionHandler");
const CommandRegistrar = require("./services/CommandRegistrar");
const CommandRegistry = require("./services/CommandRegistry");

class DiscordProvider extends BaseProvider {

    constructor({
        commandLoader = CommandLoader,
        commandRegistrar = CommandRegistrar,
        commandRegistry = CommandRegistry,
        createClient = options => new Client(options),
        environment = process.env,
        interactionHandler = InteractionHandler,
        logger = Logger
    } = {}) {

        super("Discord");

        this.commandLoader = commandLoader;
        this.commandRegistrar = commandRegistrar;
        this.commandRegistry = commandRegistry;
        this.createClient = createClient;
        this.environment = environment;
        this.interactionHandler = interactionHandler;
        this.logger = logger;
        this.client = null;

    }

    initialize() {

        this.state = ComponentState.INITIALIZING;

        try {

            this.client = this.createClient({
                intents: [
                    GatewayIntentBits.Guilds
                ]
            });

            this.loadCommands();

            this.interactionHandler.register(this.client);

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
                "Discord Provider must be ready before startup."
            );
        }

        this.state = ComponentState.STARTING;

        let cleanupReadyListener = () => {};

        try {

            const token = this.environment.DISCORD_TOKEN;
            const applicationId =
                this.environment.DISCORD_CLIENT_ID;

            if (
                typeof token !== "string" ||
                token.length === 0 ||
                typeof applicationId !== "string" ||
                applicationId.length === 0
            ) {
                throw new Error(
                    "Discord token and application ID are required."
                );
            }

            const readiness = this.waitForReadiness();

            cleanupReadyListener = readiness.cleanup;

            await this.client.login(token);
            await readiness.promise;

            this.logger.info("");
            this.logger.info(
                "========================================"
            );
            this.logger.info("Discord Connected");
            this.logger.info(
                "========================================"
            );
            this.logger.info(
                `Logged in as ${this.client.user.tag}`
            );
            this.logger.info(
                `Connected to ${this.client.guilds.cache.size} ` +
                "server(s)."
            );
            this.logger.info("");

            await this.commandRegistrar.register({
                applicationId,
                token
            });

            super.start();

            return this.getStatus();

        } catch (error) {
            this.setError();
            throw error;
        } finally {
            cleanupReadyListener();
        }

    }

    waitForReadiness() {

        if (
            typeof this.client.isReady === "function" &&
            this.client.isReady()
        ) {
            return {
                promise: Promise.resolve(),
                cleanup() {}
            };
        }

        let readyListener;
        const promise = new Promise(resolve => {

            readyListener = () => {
                resolve();
            };

            this.client.once(
                "clientReady",
                readyListener
            );

        });

        return {
            promise,
            cleanup: () => {
                this.client.removeListener(
                    "clientReady",
                    readyListener
                );
            }
        };

    }

    loadCommands() {

        this.commandRegistry.clear();

        const commands = this.commandLoader.load();

        for (const command of commands) {
            this.commandRegistry.register(command);
        }

        this.logger.info(
            `Loaded ${this.commandRegistry.getAll().length} ` +
            "Discord command(s)."
        );

    }

    async stop() {

        if (this.state === ComponentState.STOPPED) {
            return this.getStatus();
        }

        this.state = ComponentState.STOPPING;

        try {

            if (this.client) {
                await this.client.destroy();
                this.client = null;
            }

            super.stop();

            return this.getStatus();

        } catch (error) {
            this.setError();
            throw error;
        }

    }

}

module.exports = DiscordProvider;
