const {
    MessageFlags,
    SlashCommandBuilder
} = require("discord.js");

const Registry = require("../../../core/Registry");
const BaseCommand = require("./BaseCommand");

class BalanceCommand extends BaseCommand {

    constructor() {

        super(
            new SlashCommandBuilder()
                .setName("balance")
                .setDescription("View an economy balance.")
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription(
                            "The member whose balance you want to view."
                        )
                        .setRequired(false)
                )
        );

    }

    async execute(interaction) {

        const moduleManager = Registry.get("modules");
        const economy = moduleManager.get("Economy");

        if (!economy) {
            throw new Error(
                "Economy Module is not available."
            );
        }

        const selectedUser = interaction.options.getUser(
            "user"
        );
        const targetUser =
            selectedUser || interaction.user;
        const balance = economy.getBalance(
            targetUser.id
        );

        const content = selectedUser
            ? `<@${targetUser.id}>'s balance is ${balance}.`
            : `Your balance is ${balance}.`;

        await interaction.reply({
            content,
            flags: MessageFlags.Ephemeral
        });

    }

}

module.exports = BalanceCommand;
