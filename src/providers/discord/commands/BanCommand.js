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

class BanCommand extends BaseCommand {

    constructor({ auditService = null } = {}) {

        super(
            new SlashCommandBuilder()
                .setName("ban")
                .setDescription("Bans a member from the Discord server.")
                .setDMPermission(false)
                .setDefaultMemberPermissions(
                    PermissionFlagsBits.BanMembers
                )
                .addUserOption(option =>
                    option
                        .setName("member")
                        .setDescription("The member to ban.")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription("The reason for the ban.")
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
                content: "This command can only be used in a server.",
                flags: MessageFlags.Ephemeral
            });

            return;
        }

        const moduleManager = Registry.get("modules");
        const moderation = moduleManager.get("Moderation");

        if (!moderation) {
            throw new Error("Moderation Module is not available.");
        }

        const targetUser = interaction.options.getUser(
            "member",
            true
        );
        const requiredPermission =
            moderation.getRequiredPermission(
                ModerationAction.BAN
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
                    "You do not have permission to ban members.",
                flags: MessageFlags.Ephemeral
            });

            return;
        }

        const targetMember =
            await interaction.guild.members.fetch(
                targetUser.id
            );

        const validation =
            await DiscordModerationGuard.validate(
                interaction,
                targetMember,
                "ban"
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

        if (!targetMember.bannable) {
            this.recordAudit(interaction, targetUser.id, {
                outcome: "FAILED",
                status: "target-unavailable"
            });

            await interaction.reply({
                content:
                    "I cannot ban that member. Check my role and permissions.",
                flags: MessageFlags.Ephemeral
            });

            return;
        }

        const reason =
            interaction.options.getString("reason") ||
            `Banned by ${interaction.user.tag}`;

        try {
            await targetMember.ban({
                reason
            });
        } catch (error) {
            this.recordAudit(interaction, targetUser.id, {
                outcome: "FAILED",
                status: "execution-failed"
            });

            throw error;
        }

        try {
            moderation.recordAction({
                action: ModerationAction.BAN,
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
                `Banned ${targetUser.tag}. Reason: ${reason}`,
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
                action: "ban",
                targetId,
                ...details
            });
        } catch {
            // Audit failure must not change moderation behavior.
        }
    }

}

module.exports = BanCommand;
