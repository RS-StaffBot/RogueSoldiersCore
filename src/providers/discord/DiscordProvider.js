const BaseProvider = require("../core/BaseProvider");
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

    constructor() {

        super("Discord");

        this.client = null;

    }

    start() {

        super.start();

        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds
            ]
        });

        this.loadCommands();

        InteractionHandler.register(this.client);

        this.client.once("clientReady", async () => {

            Logger.info("");
            Logger.info("========================================");
            Logger.info("Discord Connected");
            Logger.info("========================================");
            Logger.info(`Logged in as ${this.client.user.tag}`);
            Logger.info(
                `Connected to ${this.client.guilds.cache.size} server(s).`
            );
            Logger.info("");

            try {

                await CommandRegistrar.register({
                    applicationId: process.env.DISCORD_CLIENT_ID,
                    token: process.env.DISCORD_TOKEN
                });

            } catch (error) {

                Logger.error(
                    "Discord command registration did not complete."
                );

            }

        });

        const token = process.env.DISCORD_TOKEN;

        if (!token) {

            Logger.error(
                "DISCORD_TOKEN is missing from the .env file."
            );

            return;

        }

        this.client.login(token).catch(error => {

            Logger.error("Failed to log into Discord.");

            Logger.error(
                error.stack || error.message
            );

        });

    }

    loadCommands() {

        CommandRegistry.clear();

        const commands = CommandLoader.load();

        for (const command of commands) {
            CommandRegistry.register(command);
        }

        Logger.info(
            `Loaded ${CommandRegistry.getAll().length} Discord command(s).`
        );

    }

    stop() {

        if (this.client) {

            this.client.destroy();
            this.client = null;

        }

        super.stop();

    }

}

module.exports = DiscordProvider;