const BaseProvider = require("../core/BaseProvider");
const Logger = require("../../core/Logger");

const {
    Client,
    GatewayIntentBits,
    Collection,
    REST,
    Routes
} = require("discord.js");

const CommandLoader = require("./commands/CommandLoader");
const CommandRegistry = require("./services/CommandRegistry");
const InteractionHandler = require("./handlers/InteractionHandler");

class DiscordProvider extends BaseProvider {

    constructor() {

        super("Discord");

        this.client = null;
        this.commands = new Collection();

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

            await this.registerSlashCommands();

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
        this.commands.clear();

        const commands = CommandLoader.load();

        for (const command of commands) {

            CommandRegistry.register(command);

            this.commands.set(
                command.data.name,
                command
            );

        }

        Logger.info(
            `Loaded ${CommandRegistry.getAll().length} Discord command(s).`
        );

    }

    async registerSlashCommands() {

        const token = process.env.DISCORD_TOKEN;
        const clientId = process.env.DISCORD_CLIENT_ID;

        if (!clientId) {

            Logger.error(
                "DISCORD_CLIENT_ID is missing from the .env file."
            );

            return;

        }

        const rest = new REST({
            version: "10"
        }).setToken(token);

        const commandData = [];

        for (const command of this.commands.values()) {
            commandData.push(command.data.toJSON());
        }

        try {

            Logger.info("Registering slash commands...");

            await rest.put(
                Routes.applicationCommands(clientId),
                {
                    body: commandData
                }
            );

            Logger.info("Slash commands registered.");

        } catch (error) {

            Logger.error(
                "Failed to register slash commands."
            );

            Logger.error(
                error.stack || error.message
            );

        }

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