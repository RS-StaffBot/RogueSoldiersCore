const {
    PermissionFlagsBits,
    SlashCommandBuilder
} = require("discord.js");

const Registry = require("../../../core/Registry");
const BaseCommand = require("./BaseCommand");
const DiscordPermissionService = require(
    "../services/DiscordPermissionService"
);
const ModerationAction = require(
    "../../../modules/moderation/ModerationAction"
);

class PurgeCommand extends BaseCommand {

    constructor() {

        super(
            new SlashCommandBuilder()
                .setName("purge")
                .setDescription(
                    "Deletes multiple recent messages from this channel."
                )
                .setDMPermission(false)
                .setDefaultMemberPermissions(
                    PermissionFlagsBits.ManageMessages
                )
                .addIntegerOption(option =>
                    option
                        .setName("amount")
                        .setDescription(
                            "Number of recent messages to delete."
                        )
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(100)
                )
        );

    }

    async execute(interaction) {

        if (!interaction.guild) {
            await interaction.reply({
                content:
                    "This command can only be used in a server.",
                ephemeral: true
            });

            return;
        }

        const moduleManager = Registry.get("modules");
        const moderation = moduleManager.get("Moderation");

        if (!moderation) {
            throw new Error(
                "Moderation Module is not available."
            );
        }

        const requiredPermission =
            moderation.getRequiredPermission(
                ModerationAction.PURGE
            );

        const hasPermission =
            DiscordPermissionService.hasPermission(
                interaction.memberPermissions,
                requiredPermission
            );

        if (!hasPermission) {
            await interaction.reply({
                content:
                    "You do not have permission to delete messages.",
                ephemeral: true
            });

            return;
        }

        const channel = interaction.channel;

        if (
            !channel ||
            typeof channel.bulkDelete !== "function"
        ) {
            await interaction.reply({
                content:
                    "Messages cannot be bulk deleted in this channel.",
                ephemeral: true
            });

            return;
        }

        const amount = interaction.options.getInteger(
            "amount",
            true
        );
        const botMember =
    interaction.guild.members.me ||
    await interaction.guild.members.fetchMe();


        await interaction.deferReply({
            ephemeral: true
        });

        const deletedMessages =
            await channel.bulkDelete(
                amount,
                true
            );

        const deletedCount =
            deletedMessages.size ??
            deletedMessages.length ??
            0;

        await interaction.editReply({
            content:
                `Deleted ${deletedCount} message(s). ` +
                "Messages older than 14 days were skipped."
        });

    }

}

module.exports = PurgeCommand;