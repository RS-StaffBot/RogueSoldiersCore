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

    constructor({ auditService = null } = {}) {

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

        if (
            auditService !== null &&
            typeof auditService.recordAttempt !== "function"
        ) {
            throw new Error(
                "Discord moderation audit boundary is invalid."
            );
        }

        this.auditService = auditService;

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

        const channel = interaction.channel;
        const channelId = channel?.id;
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
            this.recordAudit(interaction, channelId, {
                outcome: "DENIED",
                status: "permission-denied"
            });

            await interaction.reply({
                content:
                    "You do not have permission to delete messages.",
                flags: MessageFlags.Ephemeral
            });

            return;
        }

        if (
            !channel ||
            typeof channel.bulkDelete !== "function"
        ) {
            this.recordAudit(interaction, channelId, {
                outcome: "FAILED",
                status: "target-unavailable"
            });

            await interaction.reply({
                content:
                    "Messages cannot be bulk deleted in this channel.",
                flags: MessageFlags.Ephemeral
            });

            return;
        }

        let amount;

        try {
            amount = interaction.options.getInteger(
                "amount",
                true
            );
        } catch (error) {
            this.recordAudit(interaction, channelId, {
                outcome: "FAILED",
                status: "validation-failed"
            });

            throw error;
        }

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        let deletedMessages;

        try {
            deletedMessages =
                await channel.bulkDelete(
                    amount,
                    true
                );
        } catch (error) {
            this.recordAudit(interaction, channelId, {
                outcome: "FAILED",
                status: "execution-failed"
            });

            throw error;
        }

        const deletedCount =
            deletedMessages.size ??
            deletedMessages.length ??
            0;

        const reason =
            `Deleted ${deletedCount} message(s).`;

        try {
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
        } catch (error) {
            this.recordAudit(interaction, channelId, {
                outcome: "FAILED",
                status: "history-failed"
            });

            throw error;
        }

        this.recordAudit(interaction, channelId, {
            outcome: "SUCCESS",
            status: "succeeded"
        });

        await interaction.editReply({
            content:
                `Deleted ${deletedCount} message(s). ` +
                "Messages older than 14 days were skipped."
        });

    }

    recordAudit(interaction, targetId, details) {
        if (
            !this.auditService ||
            typeof targetId !== "string" ||
            targetId.length === 0
        ) {
            return;
        }

        try {
            this.auditService.recordAttempt({
                actorId: interaction.user?.id,
                action: "purge",
                targetId,
                ...details
            });
        } catch {
            // Audit failure must not change moderation behavior.
        }
    }

}

module.exports = PurgeCommand;
