const Logger = require("../../../core/Logger");
const CommandRegistry = require("../services/CommandRegistry");

class InteractionHandler {

    register(client) {

        client.on("interactionCreate", async interaction => {

            if (!interaction.isChatInputCommand()) {
                return;
            }

            const command = CommandRegistry.get(interaction.commandName);

            if (!command) {

                Logger.warn(
                    `Unknown command: ${interaction.commandName}`
                );

                return;

            }

            try {

                await command.execute(interaction);

            }
            catch (error) {

                Logger.error(error.message);

                if (!interaction.replied && !interaction.deferred) {

                    await interaction.reply({

                        content: "An unexpected error occurred.",
                        ephemeral: true

                    });

                }

            }

        });

    }

}

module.exports = new InteractionHandler();