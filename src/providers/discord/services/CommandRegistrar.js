const {
    REST,
    Routes
} = require("discord.js");

const Logger = require("../../../core/Logger");
const CommandRegistry = require("./CommandRegistry");

class CommandRegistrar {

    async register({
        applicationId,
        token
    }) {

        if (
            typeof applicationId !== "string"
            || applicationId.length === 0
        ) {

            throw new Error(
                "A Discord application ID is required to register commands."
            );

        }

        if (
            typeof token !== "string"
            || token.length === 0
        ) {

            throw new Error(
                "A Discord bot token is required to register commands."
            );

        }

        const definitions = CommandRegistry.getDefinitions();

        const rest = new REST({
            version: "10"
        }).setToken(token);

        Logger.info(
            `Registering ${definitions.length} Discord slash command(s)...`
        );

        try {

            await rest.put(
                Routes.applicationCommands(applicationId),
                {
                    body: definitions
                }
            );

            Logger.info("Discord slash commands registered.");

        } catch (error) {

            Logger.error(
                "Failed to register Discord slash commands."
            );

            Logger.error(error.stack || error.message);

            throw error;

        }

    }

}

module.exports = new CommandRegistrar();