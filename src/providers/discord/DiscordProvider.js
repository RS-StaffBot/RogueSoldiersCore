const BaseProvider = require("../core/BaseProvider");
const Logger = require("../../core/Logger");

const { Client, GatewayIntentBits, Collection } = require("discord.js");

const CommandLoader = require("./commands/CommandLoader");
const CommandRegistry = require("./commands/CommandRegistry");

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

        this.client.once("clientReady", () => {

            Logger.info("");
            Logger.info("========================================");
            Logger.info("Discord Connected");
            Logger.info("========================================");
            Logger.info(`Logged in as ${this.client.user.tag}`);
            Logger.info(`Connected to ${this.client.guilds.cache.size} server(s).`);
            Logger.info("");

        });

        this.client.on("interactionCreate", async interaction => {

            if (!interaction.isChatInputCommand()) {
                return;
            }

            const command = this.commands.get(interaction.commandName);

            if (!command) {
                return;
            }

            try {

                await command.execute(interaction);

            } catch (error) {

                Logger.error(`Command '${interaction.commandName}' failed.`);
                Logger.error(error);

            }

        });

        const token = process.env.DISCORD_TOKEN;

        if (!token) {

            Logger.error("DISCORD_TOKEN is missing from the .env file.");

            return;

        }

        this.client.login(token).catch(error => {

            Logger.error("Failed to log into Discord.");
            Logger.error(error.message);

        });

    }

    loadCommands() {

        const commands = CommandLoader.load();

        for (const command of commands) {

            CommandRegistry.register(command);

            this.commands.set(command.data.name, command);

        }

        Logger.info(`Loaded ${this.commands.size} Discord command(s).`);

    }

    stop() {

        if (this.client) {
            this.client.destroy();
        }

        super.stop();

    }

}

module.exports = DiscordProvider;