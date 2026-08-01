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

class TimeoutCommand extends BaseCommand {

    constructor({ auditService = null } = {}) {

        super(
            new SlashCommandBuilder()
                .setName("timeout")
                .setDescription(
                    "Temporarily prevents a member from interacting."
                )
                .setDMPermission(false)
                .setDefaultMemberPermissions(
                    PermissionFlagsBits.ModerateMembers
                )
                .addUserOption(option =>
                    option
                        .setName("member")
                        .setDescription("The member to time out.")
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName("minutes")
                        .setDescription(
                            "Timeout duration in minutes."
                        )
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(40320)
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription(
                            "The reason for the timeout."
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
                ModerationAction.TIMEOUT
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
                    "You do not have permission to time out members.",
                flags: MessageFlags.Ephemeral
            });

            return;
        }

        let durationMinutes;

        try {
            durationMinutes =
                interaction.options.getInteger(
                    "minutes",
                    true
                );
        } catch (error) {
            this.recordAudit(interaction, targetUser.id, {
                outcome: "FAILED",
                status: "validation-failed"
            });

            throw error;
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
                "timeout"
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
                    "I cannot time out that member. Check my role and permissions.",
                flags: MessageFlags.Ephemeral
            });

            return;
        }

        const reason =
            interaction.options.getString("reason") ||
            `Timed out by ${interaction.user.tag}`;

        const durationMilliseconds =
            durationMinutes * 60 * 1000;

        try {
            await targetMember.timeout(
                durationMilliseconds,
                reason
            );
        } catch (error) {
            this.recordAudit(interaction, targetUser.id, {
                outcome: "FAILED",
                status: "execution-failed"
            });

            throw error;
        }

        try {
            moderation.recordAction({
                action: ModerationAction.TIMEOUT,
                guildId: interaction.guild.id,
                moderatorId: interaction.user.id,
                targetId: targetUser.id,
                reason,
                details: {
                    source: "Discord",
                    durationMinutes
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
                `Timed out ${targetUser.tag} for ` +
                `${durationMinutes} minute(s). Reason: ${reason}`,
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
                action: "timeout",
                targetId,
                ...details
            });
        } catch {
            // Audit failure must not change moderation behavior.
        }
    }

}

module.exports = TimeoutCommand;
