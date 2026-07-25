const {
    MessageFlags
} = require("discord.js");

const Logger = require("../../../core/Logger");
const CommandRegistry = require("../services/CommandRegistry");

class InteractionHandler {

    register(client) {

        if (!client) {
            throw new Error(
                "A Discord client is required to register the interaction handler."
            );
        }

        client.on("interactionCreate", async interaction => {

            if (!interaction.isChatInputCommand()) {
                return;
            }

            const command = CommandRegistry.get(
                interaction.commandName
            );

            if (!command) {

                Logger.warn(
                    `Unknown Discord command: ${interaction.commandName}`
                );

                return;

            }

            try {

                await command.execute(interaction);

            } catch (error) {

                Logger.error(
                    `Discord command '${interaction.commandName}' failed.`
                );

                Logger.error(
                    error.stack || error.message
                );

                await this.handleCommandError(interaction);

            }

        });

    }

    async handleCommandError(interaction) {

        const errorMessage = {
            content: "An unexpected error occurred.",
            flags: MessageFlags.Ephemeral
        };

        try {

            if (interaction.deferred) {

                await interaction.editReply(
                    errorMessage.content
                );

                return;

            }

            if (interaction.replied) {

                await interaction.followUp(
                    errorMessage
                );

                return;

            }

            await interaction.reply(
                errorMessage
            );

        } catch (error) {

            Logger.error(
                "Failed to send the Discord command error response."
            );

            Logger.error(
                error.stack || error.message
            );

        }

    }

}

module.exports = new InteractionHandler();