const {
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder
} = require("discord.js");

const Registry = require("../../../core/Registry");
const BaseCommand = require("./BaseCommand");
const DiscordModerationGuard = require(
    "../services/DiscordModerationGuard"
);
const DiscordPermissionService = require(
    "../services/DiscordPermissionService"
);
const ModerationAction = require(
    "../../../modules/moderation/ModerationAction"
);

class UntimeoutCommand extends BaseCommand {

    constructor({ auditService = null } = {}) {

        super(
            new SlashCommandBuilder()
                .setName("untimeout")
                .setDescription("Removes a member's active timeout.")
                .setDMPermission(false)
                .setDefaultMemberPermissions(
                    PermissionFlagsBits.ModerateMembers
                )
                .addUserOption(option =>
                    option
                        .setName("member")
                        .setDescription(
                            "The member whose timeout will be removed."
                        )
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription(
                            "The reason for removing the timeout."
                        )
                        .setRequired(false)
                        .setMaxLength(512)
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

        const targetUser = interaction.options.getUser(
            "member",
            true
        );
        const requiredPermission =
            moderation.getRequiredPermission(
                ModerationAction.UNTIMEOUT
            );

        const hasPermission =
            DiscordPermissionService.hasPermission(
                interaction.memberPermissions,
                requiredPermission
            );

        if (!hasPermission) {
            this.recordAudit(interaction, targetUser.id, {
                outcome: "DENIED",
                status: "permission-denied"
            });

            await interaction.reply({
                content:
                    "You do not have permission to remove timeouts.",
                flags: MessageFlags.Ephemeral
            });

            return;
        }

        let targetMember;

        try {
            targetMember =
                await interaction.guild.members.fetch(
                    targetUser.id
                );
        } catch (error) {
            this.recordAudit(interaction, targetUser.id, {
                outcome: "FAILED",
                status: "target-unavailable"
            });

            throw error;
        }

        const validation =
            await DiscordModerationGuard.validate(
                interaction,
                targetMember,
                "untimeout"
            );

        if (!validation.allowed) {
            this.recordAudit(interaction, targetUser.id, {
                outcome: "DENIED",
                status: "guard-denied"
            });

            await interaction.reply({
                content: validation.message,
                flags: MessageFlags.Ephemeral
            });

            return;
        }

        if (!targetMember.moderatable) {
            this.recordAudit(interaction, targetUser.id, {
                outcome: "FAILED",
                status: "target-unavailable"
            });

            await interaction.reply({
                content:
                    "I cannot remove that member's timeout. " +
                    "Check my role and permissions.",
                flags: MessageFlags.Ephemeral
            });

            return;
        }

        if (!targetMember.isCommunicationDisabled()) {
            this.recordAudit(interaction, targetUser.id, {
                outcome: "FAILED",
                status: "not-timed-out"
            });

            await interaction.reply({
                content:
                    `${targetUser.tag} is not currently timed out.`,
                flags: MessageFlags.Ephemeral
            });

            return;
        }

        const reason =
            interaction.options.getString("reason") ||
            `Timeout removed by ${interaction.user.tag}`;

        try {
            await targetMember.timeout(null, reason);
        } catch (error) {
            this.recordAudit(interaction, targetUser.id, {
                outcome: "FAILED",
                status: "execution-failed"
            });

            throw error;
        }

        try {
            moderation.recordAction({
                action: ModerationAction.UNTIMEOUT,
                guildId: interaction.guild.id,
                moderatorId: interaction.user.id,
                targetId: targetUser.id,
                reason,
                details: {
                    source: "Discord"
                }
            });
        } catch (error) {
            this.recordAudit(interaction, targetUser.id, {
                outcome: "FAILED",
                status: "history-failed"
            });

            throw error;
        }

        this.recordAudit(interaction, targetUser.id, {
            outcome: "SUCCESS",
            status: "succeeded"
        });

        await interaction.reply({
            content:
                `Removed the timeout from ${targetUser.tag}. ` +
                `Reason: ${reason}`,
            flags: MessageFlags.Ephemeral
        });

    }

    recordAudit(interaction, targetId, details) {
        if (!this.auditService) {
            return;
        }

        try {
            this.auditService.recordAttempt({
                actorId: interaction.user?.id,
                action: "untimeout",
                targetId,
                ...details
            });
        } catch {
            // Audit failure must not change moderation behavior.
        }
    }

}

module.exports = UntimeoutCommand;
