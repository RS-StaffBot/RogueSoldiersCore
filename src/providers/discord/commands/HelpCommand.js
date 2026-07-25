const {
    MessageFlags,
    SlashCommandBuilder
} = require("discord.js");

const BaseCommand = require("./BaseCommand");
const CommandRegistry = require("../services/CommandRegistry");

class HelpCommand extends BaseCommand {

    constructor() {

        super(

            new SlashCommandBuilder()
                .setName("help")
                .setDescription("Displays the available bot commands.")

        );

    }

    async execute(interaction) {

        const commands = CommandRegistry
            .getAll()
            .sort((firstCommand, secondCommand) => {

                return firstCommand.data.name.localeCompare(
                    secondCommand.data.name
                );

            });

        const commandLines = commands.map(command => {

            return `/${command.data.name} - ${command.data.description}`;

        });

        const response = [
            "**Rogue Soldiers Bot Commands**",
            "",
            ...commandLines
        ].join("\n");

        await interaction.reply({
            content: response,
            flags: MessageFlags.Ephemeral
        });

    }

}

module.exports = HelpCommand;