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

        this.client.once("clientReady", async () => {

            Logger.info("");
            Logger.info("========================================");
            Logger.info("Discord Connected");
            Logger.info("========================================");
            Logger.info(`Logged in as ${this.client.user.tag}`);
            Logger.info(`Connected to ${this.client.guilds.cache.size} server(s).`);
            Logger.info("");

            await this.registerSlashCommands();

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

                if (!interaction.replied) {

                    await interaction.reply({

                        content: "An unexpected error occurred.",
                        ephemeral: true

                    });

                }

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

    async registerSlashCommands() {

        const token = process.env.DISCORD_TOKEN;
        const clientId = process.env.DISCORD_CLIENT_ID;

        if (!clientId) {

            Logger.error("DISCORD_CLIENT_ID is missing from the .env file.");
            return;

        }

        const rest = new REST({ version: "10" }).setToken(token);

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

            Logger.error("Failed to register slash commands.");
            Logger.error(error);

        }

    }

    stop() {

        if (this.client) {
            this.client.destroy();
        }

        super.stop();

    }

}

module.exports = DiscordProvider;