const {
    MessageFlags,
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
                flags: MessageFlags.Ephemeral
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
                flags: MessageFlags.Ephemeral
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
                flags: MessageFlags.Ephemeral
            });

            return;
        }

        const amount = interaction.options.getInteger(
            "amount",
            true
        );

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
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

        const reason =
            `Deleted ${deletedCount} message(s).`;

        moderation.recordAction({
            action: ModerationAction.PURGE,
            guildId: interaction.guild.id,
            moderatorId: interaction.user.id,
            targetId: null,
            reason,
            details: {
                source: "Discord",
                channelId: channel.id,
                requestedAmount: amount,
                deletedCount
            }
        });

        await interaction.editReply({
            content:
                `Deleted ${deletedCount} message(s). ` +
                "Messages older than 14 days were skipped."
        });

    }

}

module.exports = PurgeCommand;