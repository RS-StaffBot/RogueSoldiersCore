const { SlashCommandBuilder } = require("discord.js");
const BaseCommand = require("./BaseCommand");

class PingCommand extends BaseCommand {

    constructor() {

        super(

            new SlashCommandBuilder()
                .setName("ping")
                .setDescription("Replies with Pong!")

        );

    }

    async execute(interaction) {

        await interaction.reply("Pong!");

    }

}

module.exports = PingCommand;