const BaseProvider = require("../core/BaseProvider");
const Logger = require("../../core/Logger");

const { Client, GatewayIntentBits } = require("discord.js");

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

        this.client.once("clientReady", () => {

            Logger.info("");
            Logger.info("========================================");
            Logger.info("Discord Connected");
            Logger.info("========================================");
            Logger.info(`Logged in as ${this.client.user.tag}`);
            Logger.info(`Connected to ${this.client.guilds.cache.size} server(s).`);
            Logger.info("");

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

    stop() {

        if (this.client) {
            this.client.destroy();
        }

        super.stop();

    }

}

module.exports = DiscordProvider;